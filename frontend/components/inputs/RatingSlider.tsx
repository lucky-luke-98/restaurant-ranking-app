import React, { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { MinusIcon, PlusIcon } from 'phosphor-react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { ThemeColors } from '@/constants/Colors'

interface RatingSliderProps {
  label: string
  value: number
  onChange: (v: number) => void
}

function ratingColor(value: number): string {
  if (value >= 8) return '#4CAF50'
  if (value >= 5) return '#FF9800'
  return '#F44336'
}

export default function RatingSlider({ label, value, onChange }: RatingSliderProps) {
  const colors = useThemeColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const trackRef = React.useRef<View>(null)
  const trackRectRef = React.useRef<{ x: number; width: number } | null>(null)

  const clamp = (v: number) => Math.round(Math.min(Math.max(v, 0), 10) * 10) / 10

  const applyRatio = (pageX: number, x: number, width: number) => {
    if (width <= 0) return
    const ratio = Math.min(Math.max((pageX - x) / width, 0), 1)
    onChange(Math.round(ratio * 100) / 10)
  }

  const handleGrant = (pageX: number) => {
    trackRef.current?.measure((_x, _y, width, _h, px) => {
      trackRectRef.current = { x: px, width }
      applyRatio(pageX, px, width)
    })
  }

  const handleMove = (pageX: number) => {
    const rect = trackRectRef.current
    if (!rect) return
    applyRatio(pageX, rect.x, rect.width)
  }

  const decrement = () => onChange(clamp(value - 0.1))
  const increment = () => onChange(clamp(value + 0.1))

  const fillColor = ratingColor(value)

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.valueText, { color: fillColor }]}>{value.toFixed(1)}</Text>
      </View>
      <View style={styles.sliderRow}>
        <Pressable
          style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}
          onPress={decrement}
          hitSlop={4}
        >
          <MinusIcon size={16} color={colors.text} weight="bold" />
        </Pressable>
        <View
          ref={trackRef}
          style={[styles.track, Platform.OS === 'web' && webTrackStyle]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => handleGrant(e.nativeEvent.pageX)}
          onResponderMove={(e) => handleMove(e.nativeEvent.pageX)}
        >
          <View style={[styles.fill, { width: `${value * 10}%`, backgroundColor: fillColor }]} />
          <View style={[styles.thumb, { left: `${value * 10}%`, borderColor: fillColor }]} />
        </View>
        <Pressable
          style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}
          onPress={increment}
          hitSlop={4}
        >
          <PlusIcon size={16} color={colors.text} weight="bold" />
        </Pressable>
      </View>
    </View>
  )
}

const webTrackStyle = { touchAction: 'none' as const, userSelect: 'none' as const }

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    label: {
      color: colors.textTertiary,
      fontSize: 15,
      fontWeight: '600',
    },
    valueText: {
      fontSize: 18,
      fontWeight: '800',
    },
    sliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.backgroundButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepButtonPressed: {
      backgroundColor: colors.backgroundButtonStrong,
    },
    track: {
      flex: 1,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.sliderTrack,
      justifyContent: 'center',
    },
    fill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 6,
    },
    thumb: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.backgroundElevated,
      borderWidth: 3,
      marginLeft: -14,
      top: -8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
  })
