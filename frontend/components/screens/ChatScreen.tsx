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
import { ChatCircleDotsIcon, PaperPlaneRightIcon, XIcon } from 'phosphor-react-native'
import apiClient, { ApiError } from '@/services/apiClient'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useWebModalEffects } from '@/hooks/useWebModalEffects'
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
  return blocks
    .filter((b) => b.kind === 'text' && b.text)
    .map((b) => b.text)
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
  const scrollRef = useRef<ScrollView>(null)

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
        <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={8}>
          <XIcon size={22} color={colors.text} weight="bold" />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
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
          transcript.map((entry, index) => (
            <View
              key={index}
              style={[
                styles.bubble,
                entry.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                entry.isError && styles.bubbleError,
              ]}
            >
              {entry.blocks.map((block, blockIndex) => (
                <Block
                  key={blockIndex}
                  block={block}
                  textStyle={
                    entry.role === 'user' ? styles.blockTextUser : styles.blockTextAssistant
                  }
                />
              ))}
            </View>
          ))
        )}
        {sending && (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={styles.thinkingText}>{t.chatThinking}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.composerRow, { paddingBottom: Platform.OS === 'web' ? 12 : 8 }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t.chatPlaceholder}
          placeholderTextColor={colors.textFaint}
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
