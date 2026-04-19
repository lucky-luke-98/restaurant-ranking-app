import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { NewspaperIcon, UsersThreeIcon } from 'phosphor-react-native'
import apiClient from '@/services/apiClient'
import { useFriends } from '@/services/FriendsContext'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import RestaurantVisitCard from '@/components/cards/RestaurantVisitCard'
import { createStyles } from './FriendsFeedScreen.styles'

interface FeedRestaurant {
  restaurant_id: string
  name: string
  cuisine_type?: string | null
  street?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  avg_rating?: number | null
  rating_count?: number | null
}

interface FeedReview {
  review_id: string
  user_id: string
  created_at?: string
  visited_at?: string
  first_name?: string
  avatar?: string
  restaurant?: FeedRestaurant | null
}

interface FeedResponse {
  items: FeedReview[]
  next_cursor: string | null
  next_cursor_id: string | null
  has_more: boolean
}

interface WishlistEntry {
  restaurant_id: string
}

const PAGE_SIZE = 20

export default function FriendsFeedScreen() {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { friends } = useFriends()

  const [items, setItems] = useState<FeedReview[]>([])
  const [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())

  const loadingRef = useRef(false)

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await apiClient.get<{ entries: WishlistEntry[] }>('/wishlist/me')
      setWishlistIds(new Set(res.entries.map((e) => e.restaurant_id)))
    } catch {
      setWishlistIds(new Set())
    }
  }, [])

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (loadingRef.current) return
      loadingRef.current = true
      if (reset) {
        setRefreshing(true)
      } else if (items.length === 0) {
        setLoadingInitial(true)
      } else {
        setLoadingMore(true)
      }
      try {
        const params: Record<string, string> = { limit: String(PAGE_SIZE) }
        if (!reset && cursor) {
          params.cursor = cursor.created_at
          params.cursor_id = cursor.id
        }
        const data = await apiClient.get<FeedResponse>('/review/feed/friends', { params })
        const newItems = data.items
        if (reset) {
          setItems(newItems)
        } else {
          setItems((prev) => {
            const seen = new Set(prev.map((r) => r.review_id))
            const deduped = newItems.filter((r) => !seen.has(r.review_id))
            return [...prev, ...deduped]
          })
        }
        setHasMore(data.has_more)
        setCursor(
          data.has_more && data.next_cursor && data.next_cursor_id
            ? { created_at: data.next_cursor, id: data.next_cursor_id }
            : null,
        )
      } catch {
        if (reset) {
          setItems([])
          setHasMore(false)
          setCursor(null)
        }
      } finally {
        loadingRef.current = false
        setLoadingInitial(false)
        setLoadingMore(false)
        setRefreshing(false)
      }
    },
    [cursor, items.length],
  )

  useEffect(() => {
    if (friends.length === 0) {
      setLoadingInitial(false)
      setItems([])
      setHasMore(false)
      return
    }
    loadPage(true)
    fetchWishlist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends.length])

  const handleRefresh = useCallback(() => {
    setCursor(null)
    setHasMore(true)
    loadPage(true)
    fetchWishlist()
  }, [loadPage, fetchWishlist])

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingRef.current) {
      loadPage(false)
    }
  }, [hasMore, loadPage])

  const openRestaurant = useCallback((restaurantId: string) => {
    router.push({
      pathname: '/restaurant/[id]' as const,
      params: { id: restaurantId },
    })
  }, [])

  const handleWishlistAdded = useCallback((restaurantId: string) => {
    setWishlistIds((prev) => {
      const next = new Set(prev)
      next.add(restaurantId)
      return next
    })
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: FeedReview }) => {
      if (!item.restaurant) return null
      return (
        <RestaurantVisitCard
          restaurant={item.restaurant}
          author={{
            user_id: item.user_id,
            first_name: item.first_name,
            avatar: item.avatar,
          }}
          createdAt={item.created_at}
          visitedAt={item.visited_at}
          isOnWishlist={wishlistIds.has(item.restaurant.restaurant_id)}
          onOpenRestaurant={openRestaurant}
          onWishlistAdded={handleWishlistAdded}
        />
      )
    },
    [wishlistIds, openRestaurant, handleWishlistAdded],
  )

  if (loadingInitial) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    )
  }

  if (friends.length === 0) {
    return (
      <View style={styles.centered}>
        <UsersThreeIcon size={48} color={colors.textFaint} weight="regular" />
        <Text style={styles.emptyText}>{t.feedEmptyNoFriends}</Text>
      </View>
    )
  }

  if (items.length === 0) {
    return (
      <FlatList
        data={[]}
        renderItem={null as any}
        contentContainerStyle={styles.emptyScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <NewspaperIcon size={48} color={colors.textFaint} weight="regular" />
            <Text style={styles.emptyText}>{t.feedEmptyNoReviews}</Text>
          </View>
        }
      />
    )
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.review_id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      removeClippedSubviews
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.text}
        />
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator
            size="small"
            color={colors.textFaint}
            style={styles.footerSpinner}
          />
        ) : !hasMore ? (
          <Text style={styles.endReachedText}>{t.feedEndReached}</Text>
        ) : null
      }
    />
  )
}
