import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { MapPinIcon, CookingPotIcon } from 'phosphor-react-native'

interface Restaurant {
  restaurant_id: string
  name: string
  cuisine_type: string
  street: string
  city: string
}

interface RestaurantCardProps {
  restaurant: Restaurant
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const router = useRouter()

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({
          pathname: '/restaurant/[id]' as const,
          params: { id: restaurant.restaurant_id },
        })
      }
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.cuisineBadge}>
          <CookingPotIcon size={13} color="rgba(255,255,255,0.6)" />
          <Text style={styles.cuisine}>{restaurant.cuisine_type}</Text>
        </View>
      </View>
      <View style={styles.locationRow}>
        <MapPinIcon size={14} color="rgba(255,255,255,0.5)" />
        <Text style={styles.location}>
          {restaurant.street}, {restaurant.city}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  cuisineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cuisine: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
})
