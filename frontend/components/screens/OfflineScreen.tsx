import { Pressable } from 'react-native'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { styles } from './OfflineScreen.styles'

export default function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  const colors = useThemeColors()

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{t.offlineTitle}</ThemedText>
      <ThemedText style={styles.message}>{t.offlineMessage}</ThemedText>
      <Pressable
        onPress={onRetry}
        style={[styles.button, { backgroundColor: colors.backgroundButtonStrong }]}
      >
        <ThemedText>{t.tryAgain}</ThemedText>
      </Pressable>
    </ThemedView>
  )
}
