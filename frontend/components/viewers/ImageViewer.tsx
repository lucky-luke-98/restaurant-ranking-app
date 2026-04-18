import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Modal,
  View,
  Image,
  Pressable,
  Text,
  Platform,
  PanResponder,
} from 'react-native'
import { CaretLeftIcon, CaretRightIcon } from 'phosphor-react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './ImageViewer.styles'

interface ImageViewerProps {
  uris: string[]
  index?: number
  children: React.ReactElement
}

const SWIPE_THRESHOLD = 50

export default function ImageViewer({ uris, index = 0, children }: ImageViewerProps) {
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [visible, setVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(index)

  const canPrev = activeIndex > 0
  const canNext = activeIndex < uris.length - 1

  const goPrev = () => setActiveIndex((i) => (i > 0 ? i - 1 : i))
  const goNext = () => setActiveIndex((i) => (i < uris.length - 1 ? i + 1 : i))

  const open = () => {
    setActiveIndex(index)
    setVisible(true)
  }

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false)
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [visible, uris.length])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -SWIPE_THRESHOLD) goNext()
        else if (g.dx >= SWIPE_THRESHOLD) goPrev()
      },
    }),
  ).current

  return (
    <>
      <Pressable onPress={open}>{children}</Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={styles.container} {...panResponder.panHandlers}>
            <Image
              source={{ uri: uris[activeIndex] }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
          {canPrev ? (
            <Pressable
              style={styles.navLeft}
              onPress={(e) => {
                e.stopPropagation()
                goPrev()
              }}
            >
              <CaretLeftIcon size={28} color="#fff" weight="bold" />
            </Pressable>
          ) : null}
          {canNext ? (
            <Pressable
              style={styles.navRight}
              onPress={(e) => {
                e.stopPropagation()
                goNext()
              }}
            >
              <CaretRightIcon size={28} color="#fff" weight="bold" />
            </Pressable>
          ) : null}
          {uris.length > 1 ? (
            <View style={styles.counter} pointerEvents="none">
              <Text style={styles.counterText}>
                {activeIndex + 1} / {uris.length}
              </Text>
            </View>
          ) : null}
          <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
