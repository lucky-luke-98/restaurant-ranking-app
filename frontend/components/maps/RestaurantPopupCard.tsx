import { useEffect, useState } from 'react'
import apiClient from '@/services/apiClient'
import type { ThemeColors } from '@/constants/Colors'
import { RESTAURANT_GLYPH_PATH } from '@/constants/MapGlyph'
import type { MapRestaurant } from './RestaurantMap'

interface ReviewImage {
  image_id: string
  data: string
  content_type: string
}

interface Review {
  review_id: string
  user_id: string
  coauthor_ids?: string[]
}

export interface PopupStats {
  count: number
  avg_rating: number | null
}

function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}

export default function RestaurantPopupCard({
  restaurant,
  stats,
  tagsLabel,
  noReviewsLabel,
  colors,
  userId,
  onPress,
}: {
  restaurant: MapRestaurant
  stats?: PopupStats
  tagsLabel: string
  noReviewsLabel: string
  colors: ThemeColors
  userId: string
  onPress: () => void
}) {
  const [images, setImages] = useState<ReviewImage[]>([])

  useEffect(() => {
    let cancelled = false
    setImages([])
    ;(async () => {
      try {
        const { reviews } = await apiClient.get<{ reviews: Review[] }>(
          `/review/${restaurant.restaurant_id}`,
        )
        const ownReviews = reviews.filter(
          (r) => r.user_id === userId || (r.coauthor_ids ?? []).includes(userId),
        )
        const imageResults = await Promise.all(
          ownReviews.map((r) =>
            apiClient
              .get<{ images: ReviewImage[] }>(`/review/${r.review_id}/images`)
              .then((res) => res.images)
              .catch(() => []),
          ),
        )
        if (cancelled) return
        setImages(imageResults.flat().slice(0, 3))
      } catch {
        if (!cancelled) setImages([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [restaurant.restaurant_id, userId])

  const accent = restaurant.status === 'visited' ? colors.success : colors.warning
  const hasRating = stats && stats.count > 0 && stats.avg_rating != null
  const address = [restaurant.street, restaurant.city].filter(Boolean).join(', ')
  const mapsQuery = encodeURIComponent(
    [restaurant.name, address].filter(Boolean).join(', ') ||
      `${restaurant.latitude},${restaurant.longitude}`,
  )
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  return (
    <div
      onClick={onPress}
      style={{ cursor: 'pointer', minWidth: 210, maxWidth: 250, fontFamily: 'inherit', color: colors.text }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 256 256" fill="#fff">
            <path d={RESTAURANT_GLYPH_PATH} />
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              lineHeight: '18px',
              color: colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {restaurant.name}
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{tagsLabel}</div>
        </div>
      </div>

      {address && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: colors.link,
            textDecoration: 'none',
            marginBottom: 6,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ flexShrink: 0, marginLeft: -2, transform: 'translateY(-1px)' }}
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
          {address}
        </a>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          marginBottom: images.length > 0 ? 10 : 0,
        }}
      >
        {hasRating ? (
          <>
            <span style={{ color: ratingColor(stats!.avg_rating!), fontSize: 14, lineHeight: 1 }}>★</span>
            <span style={{ color: ratingColor(stats!.avg_rating!), fontWeight: 600 }}>
              {stats!.avg_rating!.toFixed(1)}
            </span>
            <span style={{ color: colors.textMuted }}>({stats!.count})</span>
          </>
        ) : (
          <span style={{ color: colors.textMuted, fontStyle: 'italic' }}>{noReviewsLabel}</span>
        )}
      </div>

      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {images.map((img) => (
            <img
              key={img.image_id}
              src={`data:${img.content_type};base64,${img.data}`}
              alt=""
              style={{
                width: 58,
                height: 58,
                borderRadius: 8,
                objectFit: 'cover',
                border: `1px solid ${colors.border}`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
