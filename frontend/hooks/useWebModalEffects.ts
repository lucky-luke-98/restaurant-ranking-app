import { useEffect, useState } from 'react'
import { Platform, StyleProp, ViewStyle } from 'react-native'

interface WebModalEffects {
  sheetStyle: StyleProp<ViewStyle>
  /** Height of the iOS-Safari keyboard intruding into the layout viewport (0 elsewhere). */
  keyboardInset: number
  /** Current visual-viewport height in px, or null when unknown (SSR, no visualViewport). */
  viewportHeight: number | null
}

/**
 * Web-only side effects for sheet-like overlays: locks body scroll and tracks the
 * visual viewport so content can lift above the iOS Safari keyboard.
 *
 * iOS Safari does not resize the layout viewport for the keyboard and
 * `interactive-widget=resizes-content` is unimplemented there, so `position: fixed`
 * strategies fail; the only reliable signal is `visualViewport` resize/scroll.
 * The inset is clamped to 0 because on iOS 26 the values do not reliably revert
 * after dismissal.
 */
export function useWebModalEffects(visible: boolean): WebModalEffects {
  const [keyboardInset, setKeyboardInset] = useState(0)
  const [viewportHeight, setViewportHeight] = useState<number | null>(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null
    return window.visualViewport?.height ?? window.innerHeight
  })

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof document === 'undefined') return

    const body = document.body
    const previousOverflow = body.style.overflow
    const previousOverscroll = body.style.overscrollBehavior
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'contain'

    const vv = (window as unknown as { visualViewport?: VisualViewport }).visualViewport
    const onViewportChange = vv
      ? () => {
          const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
          setKeyboardInset(inset)
          setViewportHeight(vv.height)
        }
      : null

    if (vv && onViewportChange) {
      vv.addEventListener('resize', onViewportChange)
      vv.addEventListener('scroll', onViewportChange)
      onViewportChange()
    }

    return () => {
      body.style.overflow = previousOverflow
      body.style.overscrollBehavior = previousOverscroll
      if (vv && onViewportChange) {
        vv.removeEventListener('resize', onViewportChange)
        vv.removeEventListener('scroll', onViewportChange)
      }
      setKeyboardInset(0)
    }
  }, [visible])

  if (Platform.OS !== 'web') {
    return { sheetStyle: undefined, keyboardInset: 0, viewportHeight: null }
  }

  const paddingBottom =
    keyboardInset > 0 ? keyboardInset + 16 : 'max(20px, env(safe-area-inset-bottom))'

  return {
    sheetStyle: { paddingBottom } as unknown as StyleProp<ViewStyle>,
    keyboardInset,
    viewportHeight,
  }
}
