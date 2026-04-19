import { Tabs } from 'expo-router'
import { ForkKnifeIcon, MapPinIcon, UsersThreeIcon, UserIcon } from 'phosphor-react-native'
import { View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import type { ReactNode } from 'react'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'
import { FriendsProvider, useFriends } from '@/services/FriendsContext'

function FocusGuard({ children }: { children: ReactNode }) {
  const isFocused = useIsFocused()
  return (
    <View style={{ flex: 1, display: isFocused ? 'flex' : 'none' }}>
      {children}
    </View>
  )
}

function TabsInner() {
  const { t } = useTranslation()
  const colors = useThemeColors()
  const { incomingRequests } = useFriends()
  const pendingCount = incomingRequests.length

  return (
    <Tabs
      initialRouteName="index"
      screenLayout={({ children }) => <FocusGuard>{children}</FocusGuard>}
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.gradientTop,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: t.navFeed,
          tabBarIcon: ({ color, size }) => (
            <UsersThreeIcon size={size} color={color} weight="bold" />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t.navRestaurants,
          tabBarIcon: ({ color, size }) => (
            <ForkKnifeIcon size={size} color={color} weight="bold" />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t.navMap,
          tabBarIcon: ({ color, size }) => (
            <MapPinIcon size={size} color={color} weight="bold" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.navProfile,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: colors.background,
            fontSize: 10,
            fontWeight: '700',
            minWidth: 16,
            height: 16,
            lineHeight: 16,
            borderRadius: 8,
          },
          tabBarIcon: ({ color, size }) => (
            <UserIcon size={size} color={color} weight="bold" />
          ),
        }}
      />
    </Tabs>
  )
}

export default function TabsLayout() {
  return (
    <FriendsProvider>
      <TabsInner />
    </FriendsProvider>
  )
}
