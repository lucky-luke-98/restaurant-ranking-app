import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

export interface PullToRefreshProps {
  onRefresh: () => void | Promise<unknown>
  refreshing?: boolean
  enabled?: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

// Native platforms use the real RefreshControl on the ScrollView/FlatList itself.
export default function PullToRefresh({ style, children }: PullToRefreshProps) {
  return <View style={[{ flex: 1 }, style]}>{children}</View>
}
