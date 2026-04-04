import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  View,
  Image,
  Pressable,
  Text,
  Platform,
} from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './ImageViewer.styles'

interface ImageViewerProps {
  uri: string
  children: React.ReactElement
}

export default function ImageViewer({ uri, children }: ImageViewerProps) {
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [visible])

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>{children}</Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={styles.container}>
            <Image
              source={{ uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>
          <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
