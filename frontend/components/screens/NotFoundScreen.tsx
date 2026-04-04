import { Link, Stack, type Href } from 'expo-router'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { useTranslation } from '@/services/LanguageContext'
import { styles } from './NotFoundScreen.styles'

export default function NotFoundScreen() {
  const { t } = useTranslation()

  return (
    <>
      <Stack.Screen options={{ title: t.oops }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">{t.screenNotExist}</ThemedText>
        <Link href={'/' as Href} style={styles.link}>
          <ThemedText type="link">{t.goHome}</ThemedText>
        </Link>
      </ThemedView>
    </>
  )
}