import { Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatCircleDotsIcon } from 'phosphor-react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'

// The react-navigation bottom tab bar is 49pt tall plus the bottom safe-area inset.
// The FAB is a SIBLING of <Tabs> (so it never unmounts or flickers on tab switches),
// which also means useBottomTabBarHeight() is unavailable — it only works inside the
// navigator — so the offset is computed from the same constants the tab bar uses.
const TAB_BAR_BASE_HEIGHT = 49

export default function AskFab() {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.chatTitle}
      onPress={() => router.push('/chat')}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: colors.primary, bottom: insets.bottom + TAB_BAR_BASE_HEIGHT + 16 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <ChatCircleDotsIcon size={26} color="#fff" weight="fill" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
})
