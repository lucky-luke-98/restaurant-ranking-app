import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Link } from 'expo-router'

const app = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        ResRank
      </Text>

      <Link 
        href="/restaurants" 
        style={{ marginHorizontal: 'auto'}} 
        asChild
      >
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Restaurants</Text>
        </Pressable>
      </Link>
    </View>
  )
}

export default app

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  title: {
    color: 'white',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 120,
  },
  link: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecorationLine: 'underline',
    padding: 4,
  },
  button: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(0.8,0.3,0.6,0.75)',
    padding: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 4,
  }
})