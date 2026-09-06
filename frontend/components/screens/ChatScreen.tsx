import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChatCircleDotsIcon, InfoIcon, MicrophoneIcon, PaperPlaneRightIcon, StopCircleIcon, XIcon } from 'phosphor-react-native'
import apiClient, { ApiError } from '@/services/apiClient'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useWebModalEffects } from '@/hooks/useWebModalEffects'
import ProposalCard, { ProposalData, ProposalStatus } from '@/components/cards/ProposalCard'
import { createStyles } from './ChatScreen.styles'

/**
 * One ordered block of an assistant answer. The wire format is an array of typed
 * blocks so the batched and (later) streamed shapes are identical. Unknown kinds
 * render as nothing — a backend deploy that adds a kind before the frontend ships
 * degrades instead of crashing.
 */
interface ChatBlock {
  kind: string
  text?: string | null
  proposal?: ProposalData
}

interface AgentChatResponse {
  blocks: ChatBlock[]
  proposals: unknown[]
}

interface TranscriptEntry {
  role: 'user' | 'assistant'
  blocks: ChatBlock[]
  isError?: boolean
}

const HISTORY_LIMIT = 20

function blocksToText(blocks: ChatBlock[]): string {
  // Proposals re-enter the model's context as their one-line summary, so follow-up
  // turns ("change the döner to 7") know what the current draft contains.
  return blocks
    .map((b) => {
      if (b.kind === 'text' && b.text) return b.text
      if (b.kind === 'proposal' && b.proposal) return `[draft ${b.proposal.proposal_id}: ${b.proposal.summary}]`
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function Block({ block, textStyle }: { block: ChatBlock; textStyle: object }) {
  if (block.kind === 'text') {
    return block.text ? <Text style={textStyle}>{block.text}</Text> : null
  }
  return null
}

export default function ChatScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ restaurant_id?: string; restaurant_name?: string }>()
  const { t, language } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { keyboardInset, viewportHeight } = useWebModalEffects(Platform.OS === 'web')

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [proposalStates, setProposalStates] = useState<
    Record<string, { status: ProposalStatus; errorText?: string }>
  >({})
  const scrollRef = useRef<ScrollView>(null)

  // --- dictation (web only in v1: MediaRecorder; native would need expo-av) ---
  type MicState = 'idle' | 'recording' | 'transcribing'
  const [micState, setMicState] = useState<MicState>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const micSupported =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'

  const stopDictation = () => {
    recorderRef.current?.stop()
  }

  const startDictation = async () => {
    if (!micSupported || micState !== 'idle') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // iOS Safari records audio/mp4; Chromium records audio/webm — the backend
      // forwards either to Whisper untouched.
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []
      recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        setMicState('transcribing')
        try {
          const blob = new Blob(chunks, { type: mimeType })
          const form = new FormData()
          form.append('file', blob, mimeType === 'audio/webm' ? 'clip.webm' : 'clip.mp4')
          form.append('language', language)
          const result = await apiClient.postForm<{ text: string }>('/agent/transcribe', form)
          if (result.text) {
            // Dictate INTO the composer: the user reviews/edits before sending.
            setDraft((prev) => (prev.trim() ? `${prev.trimEnd()} ${result.text}` : result.text))
          }
        } catch {
          setTranscript((prev) => [
            ...prev,
            { role: 'assistant', blocks: [{ kind: 'text', text: t.chatMicError }], isError: true },
          ])
        } finally {
          setMicState('idle')
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setMicState('recording')
    } catch {
      setMicState('idle')
      setTranscript((prev) => [
        ...prev,
        { role: 'assistant', blocks: [{ kind: 'text', text: t.chatMicError }], isError: true },
      ])
    }
  }

  useEffect(() => () => recorderRef.current?.stream?.getTracks().forEach((tr) => tr.stop()), [])

  const setProposalState = (id: string, status: ProposalStatus, errorText?: string) =>
    setProposalStates((prev) => ({ ...prev, [id]: { status, errorText } }))

  const confirmProposal = async (proposal: ProposalData) => {
    setProposalState(proposal.proposal_id, 'saving')
    try {
      await apiClient.post('/agent/confirm', {
        kind: proposal.kind,
        proposal_id: proposal.proposal_id,
        payload: proposal.payload,
      })
      setProposalState(proposal.proposal_id, 'saved')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Already saved (double tap / retry after a lost response): not an error.
        setProposalState(proposal.proposal_id, 'saved')
        return
      }
      const text = error instanceof ApiError ? error.message : t.chatProposalError
      setProposalState(proposal.proposal_id, 'error', text || t.chatProposalError)
    }
  }

  // Driven by transcript growth AND the viewport resize (per the keyboard strategy:
  // scroll from the resize handler's state change, not the input's focus event).
  useEffect(() => {
    const handle = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    return () => clearTimeout(handle)
  }, [transcript.length, sending, keyboardInset])

  const send = async () => {
    const message = draft.trim()
    if (!message || sending) return
    setDraft('')
    // Error bubbles stay visible but never re-enter the model's context.
    const history = transcript
      .filter((entry) => !entry.isError)
      .slice(-HISTORY_LIMIT)
      .map((entry) => ({ role: entry.role, content: blocksToText(entry.blocks) }))
      .filter((m) => m.content)
    setTranscript((prev) => [...prev, { role: 'user', blocks: [{ kind: 'text', text: message }] }])
    setSending(true)
    try {
      const response = await apiClient.post<AgentChatResponse>('/agent/chat', {
        message,
        history,
        language,
        restaurant_id: params.restaurant_id ?? null,
      })
      setTranscript((prev) => [...prev, { role: 'assistant', blocks: response.blocks }])
    } catch (error) {
      let text = t.chatError
      if (error instanceof ApiError) {
        if (error.status === 503) text = t.chatUnavailable
        else if (error.status === 429) text = t.chatRateLimited
      }
      setTranscript((prev) => [
        ...prev,
        { role: 'assistant', blocks: [{ kind: 'text', text }], isError: true },
      ])
    } finally {
      setSending(false)
    }
  }

  const canSend = draft.trim().length > 0 && !sending

  const content = (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t.chatTitle}</Text>
          {params.restaurant_name ? (
            <Text style={styles.headerContext}>{params.restaurant_name}</Text>
          ) : null}
        </View>
        <Pressable
          style={styles.closeButton}
          onPress={() => setShowInfo((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t.chatInfoTitle}
        >
          <InfoIcon size={22} color={showInfo ? colors.primary : colors.textMuted} weight={showInfo ? 'fill' : 'bold'} />
        </Pressable>
        <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={8}>
          <XIcon size={22} color={colors.text} weight="bold" />
        </Pressable>
      </View>

      {showInfo && (
        <ScrollView style={styles.infoPanel} contentContainerStyle={styles.infoPanelContent}>
          <Text style={styles.infoSectionTitle}>{t.chatInfoCanTitle}</Text>
          {[t.chatInfoCan1, t.chatInfoCan2, t.chatInfoCan3].map((line, i) => (
            <Text key={`can-${i}`} style={styles.infoLine}>{`•  ${line}`}</Text>
          ))}
          <Text style={styles.infoSectionTitle}>{t.chatInfoNeedTitle}</Text>
          {[t.chatInfoNeed1, t.chatInfoNeed2, t.chatInfoNeed3, t.chatInfoNeed4].map((line, i) => (
            <Text key={`need-${i}`} style={styles.infoLine}>{`•  ${line}`}</Text>
          ))}
          <Text style={styles.infoSectionTitle}>{t.chatInfoLimitsTitle}</Text>
          {[t.chatInfoLimits1, t.chatInfoLimits2, t.chatInfoLimits3].map((line, i) => (
            <Text key={`lim-${i}`} style={styles.infoLine}>{`•  ${line}`}</Text>
          ))}
        </ScrollView>
      )}

      <ScrollView
        ref={scrollRef}
        style={[styles.transcript, showInfo && { display: 'none' }]}
        contentContainerStyle={
          transcript.length === 0 ? { flexGrow: 1 } : styles.transcriptContent
        }
        keyboardShouldPersistTaps="handled"
      >
        {transcript.length === 0 ? (
          <View style={styles.emptyState}>
            <ChatCircleDotsIcon size={40} color={colors.textFaint} weight="duotone" />
            <Text style={styles.emptyHint}>{t.chatEmptyHint}</Text>
          </View>
        ) : (
          transcript.map((entry, index) =>
            entry.blocks.map((block, blockIndex) => {
              const key = `${index}-${blockIndex}`
              if (block.kind === 'proposal' && block.proposal) {
                const state = proposalStates[block.proposal.proposal_id] ?? { status: 'idle' as const }
                return (
                  <ProposalCard
                    key={key}
                    proposal={block.proposal}
                    status={state.status}
                    errorText={state.errorText}
                    onSave={() => confirmProposal(block.proposal!)}
                    onDiscard={() => setProposalState(block.proposal!.proposal_id, 'discarded')}
                  />
                )
              }
              return (
                <View
                  key={key}
                  style={[
                    styles.bubble,
                    entry.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                    entry.isError && styles.bubbleError,
                  ]}
                >
                  <Block
                    block={block}
                    textStyle={
                      entry.role === 'user' ? styles.blockTextUser : styles.blockTextAssistant
                    }
                  />
                </View>
              )
            }),
          )
        )}
        {sending && (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={styles.thinkingText}>{t.chatThinking}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.composerRow, { paddingBottom: Platform.OS === 'web' ? 12 : 8 }]}>
        {micSupported && (
          <Pressable
            style={[styles.micButton, micState === 'recording' && styles.micButtonActive]}
            onPress={micState === 'recording' ? stopDictation : startDictation}
            disabled={micState === 'transcribing' || sending}
            accessibilityRole="button"
            accessibilityLabel={micState === 'recording' ? t.chatMicStop : t.chatMicStart}
          >
            {micState === 'transcribing' ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : micState === 'recording' ? (
              <StopCircleIcon size={22} color="#fff" weight="fill" />
            ) : (
              <MicrophoneIcon size={22} color={colors.textMuted} weight="bold" />
            )}
          </Pressable>
        )}
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={micState === 'recording' ? t.chatMicListening : t.chatPlaceholder}
          placeholderTextColor={micState === 'recording' ? colors.error : colors.textFaint}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <Pressable
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={t.chatSend}
        >
          <PaperPlaneRightIcon size={20} color="#fff" weight="fill" />
        </Pressable>
      </View>
    </>
  )

  if (Platform.OS === 'web') {
    // The sheet is sized from the VISUAL viewport (fallback 100dvh, never 100vh) and
    // lifted by the keyboard inset — position:fixed strategies fail on iOS Safari.
    const overlayHeight = viewportHeight ?? ('100dvh' as unknown as number)
    const sheetHeight = viewportHeight ? Math.min(680, viewportHeight * 0.92) : ('92dvh' as unknown as number)
    return (
      <View style={[styles.webOverlay, { height: overlayHeight, paddingBottom: keyboardInset }]}>
        <Pressable style={{ flex: 1 }} onPress={() => router.back()} accessibilityLabel={t.back} />
        <View style={[styles.webSheet, { height: sheetHeight }]}>{content}</View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.nativeContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  )
}
