import { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Link, type Href } from 'expo-router'
import { ForkKnifeIcon, MapPinIcon, SignOutIcon, GearSixIcon } from 'phosphor-react-native'
import { useAuth } from '@/services/AuthContext'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './HomeScreen.styles'

export default function HomeScreen() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.container}>
      <ForkKnifeIcon size={64} color={colors.text} weight="duotone" style={styles.logo} />
      <Text style={styles.title}>{t.appName}</Text>
      {user && (
        <Text style={styles.greeting}>{t.homeGreeting(user.first_name)}</Text>
      )}

      <View style={styles.menu}>
        <Link href={'/restaurants' as Href} asChild>
          <Pressable style={styles.button}>
            <ForkKnifeIcon size={24} color="#fff" weight="bold" />
            <Text style={styles.buttonText}>{t.homeRestaurants}</Text>
          </Pressable>
        </Link>

        <Link href={'/map' as Href} asChild>
          <Pressable style={styles.button}>
            <MapPinIcon size={24} color="#fff" weight="bold" />
            <Text style={styles.buttonText}>{t.homeMap}</Text>
          </Pressable>
        </Link>

        <View style={styles.footerRow}>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <SignOutIcon size={18} color={colors.textFaint} />
            <Text style={styles.logoutText}>{t.homeLogout}</Text>
          </Pressable>

          <Link href={'/settings' as Href} asChild>
            <Pressable style={styles.logoutButton}>
              <GearSixIcon size={18} color={colors.textFaint} />
              <Text style={styles.logoutText}>{t.navSettings}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  )
}
