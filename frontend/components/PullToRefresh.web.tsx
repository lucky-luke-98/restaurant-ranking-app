import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native'
import { ArrowDownIcon } from 'phosphor-react-native'
import { useThemeColors, useThemeShadows } from '@/hooks/useThemeColors'
import { ThemeColors, ThemeShadows } from '@/constants/Colors'
import type { PullToRefreshProps } from './PullToRefresh'

const TRIGGER_DISTANCE = 62
const MAX_PULL = 104
const REST_HEIGHT = 52
const DRAG_RESISTANCE = 0.55
const DIRECTION_SLOP = 6
const MIN_SPINNER_MS = 450

function findScroller(target: EventTarget | null, root: HTMLElement): HTMLElement | null {
  let node: Node | null = target instanceof Node ? target : null
  while (node && node !== root) {
    if (node instanceof HTMLElement) {
      const overflowY = window.getComputedStyle(node).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') return node
    }
    node = node.parentNode
  }
  return null
}

export default function PullToRefresh({
  onRefresh,
  refreshing = false,
  enabled = true,
  style,
  children,
}: PullToRefreshProps) {
  const colors = useThemeColors()
  const shadows = useThemeShadows()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])

  const hostRef = useRef<View | null>(null)
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  const active = busy || refreshing

  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const activeRef = useRef(active)
  activeRef.current = active
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const trigger = useCallback(() => {
    setBusy(true)
    const startedAt = Date.now()
    Promise.resolve()
      .then(() => onRefreshRef.current())
      .catch(() => {})
      .then(() => {
        const wait = Math.max(0, MIN_SPINNER_MS - (Date.now() - startedAt))
        window.setTimeout(() => setBusy(false), wait)
      })
  }, [])

  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null
    if (!host) return

    const gesture = {
      tracking: false,
      engaged: false,
      startX: 0,
      startY: 0,
      pull: 0,
      scroller: null as HTMLElement | null,
    }

    const release = () => {
      gesture.tracking = false
      gesture.engaged = false
      gesture.pull = 0
    }

    const handleStart = (event: TouchEvent) => {
      if (!enabledRef.current || activeRef.current || event.touches.length !== 1) {
        release()
        return
      }
      const touch = event.touches[0]
      gesture.startX = touch.clientX
      gesture.startY = touch.clientY
      gesture.scroller = findScroller(event.target, host)
      // Keep iOS/Chrome overscroll from chaining out of the list while we own the gesture.
      if (gesture.scroller) gesture.scroller.style.overscrollBehaviorY = 'contain'
      gesture.tracking = (gesture.scroller?.scrollTop ?? 0) <= 0
      gesture.engaged = false
      gesture.pull = 0
    }

    const handleMove = (event: TouchEvent) => {
      if (!gesture.tracking || event.touches.length !== 1) return
      const touch = event.touches[0]
      const dy = touch.clientY - gesture.startY

      if (!gesture.engaged) {
        const dx = touch.clientX - gesture.startX
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
          gesture.tracking = false
          return
        }
        if (dy < DIRECTION_SLOP) return
        if ((gesture.scroller?.scrollTop ?? 0) > 0) {
          gesture.tracking = false
          return
        }
        gesture.engaged = true
        gesture.startY = touch.clientY
        setDragging(true)
        return
      }

      if (dy <= 0) {
        release()
        setDragging(false)
        setPull(0)
        return
      }

      const distance = Math.min(MAX_PULL, dy * DRAG_RESISTANCE)
      gesture.pull = distance
      setPull(distance)
      if (event.cancelable) event.preventDefault()
    }

    const handleEnd = () => {
      if (!gesture.engaged) {
        release()
        return
      }
      const shouldRefresh = gesture.pull >= TRIGGER_DISTANCE
      release()
      setDragging(false)
      if (shouldRefresh) trigger()
      else setPull(0)
    }

    host.addEventListener('touchstart', handleStart, { passive: true })
    host.addEventListener('touchmove', handleMove, { passive: false })
    host.addEventListener('touchend', handleEnd)
    host.addEventListener('touchcancel', handleEnd)
    return () => {
      host.removeEventListener('touchstart', handleStart)
      host.removeEventListener('touchmove', handleMove)
      host.removeEventListener('touchend', handleEnd)
      host.removeEventListener('touchcancel', handleEnd)
    }
  }, [trigger])

  useEffect(() => {
    if (active) setPull(REST_HEIGHT)
    else if (!dragging) setPull(0)
  }, [active, dragging])

  const progress = Math.min(1, pull / TRIGGER_DISTANCE)
  const settle = (dragging ? null : {
    transitionProperty: 'transform, opacity',
    transitionDuration: '240ms',
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  }) as ViewStyle

  return (
    <View ref={hostRef} style={[styles.host, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.indicator,
          { transform: [{ translateY: pull - REST_HEIGHT }], opacity: Math.min(1, pull / 20) },
          settle,
        ]}
      >
        <View style={styles.badge}>
          {active ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <View style={{ transform: [{ rotate: `${progress * 180}deg` }] }}>
              <ArrowDownIcon
                size={18}
                color={progress >= 1 ? colors.text : colors.textMuted}
                weight="bold"
              />
            </View>
          )}
        </View>
      </View>

      <View style={[styles.content, { transform: [{ translateY: pull }] }, settle]}>
        {children}
      </View>
    </View>
  )
}

const createStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    host: {
      flex: 1,
      overflow: 'hidden',
    },
    content: {
      flex: 1,
    },
    indicator: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: REST_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    badge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundElevated,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
  })
