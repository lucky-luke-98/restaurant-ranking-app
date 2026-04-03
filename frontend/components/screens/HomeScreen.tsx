import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Link, type Href } from 'expo-router'
import { ForkKnifeIcon, MapPinIcon, SignOutIcon } from 'phosphor-react-native'
import { useAuth } from '@/services/AuthContext'

export default function HomeScreen() {
  const { user, logout } = useAuth()

  return (
    <View style={styles.container}>
      <ForkKnifeIcon size={64} color="#fff" weight="duotone" style={styles.logo} />
      <Text style={styles.title}>ResRank</Text>
      {user && (
        <Text style={styles.greeting}>Hello, {user.first_name}!</Text>
      )}

      <View style={styles.menu}>
        <Link href={'/restaurants' as Href} asChild>
          <Pressable style={styles.button}>
            <ForkKnifeIcon size={24} color="#fff" weight="bold" />
            <Text style={styles.buttonText}>Restaurants</Text>
          </Pressable>
        </Link>

        <Link href={'/map' as Href} asChild>
          <Pressable style={styles.button}>
            <MapPinIcon size={24} color="#fff" weight="bold" />
            <Text style={styles.buttonText}>Map</Text>
          </Pressable>
        </Link>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <SignOutIcon size={18} color="rgba(255,255,255,0.4)" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    color: 'white',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  greeting: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
  },
  menu: {
    gap: 16,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0.8,0.3,0.6,0.75)',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  logoutText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
})
