import { useEffect, useState } from 'react'
import { Platform, StyleProp, ViewStyle } from 'react-native'

export function useWebModalEffects(visible: boolean): { sheetStyle: StyleProp<ViewStyle> } {
  const [keyboardInset, setKeyboardInset] = useState(0)

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
    return { sheetStyle: undefined }
  }

  const paddingBottom =
    keyboardInset > 0 ? keyboardInset + 16 : 'max(20px, env(safe-area-inset-bottom))'

  return {
    sheetStyle: { paddingBottom } as unknown as StyleProp<ViewStyle>,
  }
}
