import { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { MapPinIcon, CookingPotIcon } from 'phosphor-react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { createStyles } from './RestaurantCard.styles'

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
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])

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
          <CookingPotIcon size={13} color={colors.textTertiary} />
          <Text style={styles.cuisine}>{restaurant.cuisine_type}</Text>
        </View>
      </View>
      <View style={styles.locationRow}>
        <MapPinIcon size={14} color={colors.textMuted} />
        <Text style={styles.location}>
          {restaurant.street}, {restaurant.city}
        </Text>
      </View>
    </Pressable>
  )
}
