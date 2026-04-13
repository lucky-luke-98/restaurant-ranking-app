import { Tabs } from 'expo-router'
import { ForkKnifeIcon, MapPinIcon, UserIcon } from 'phosphor-react-native'
import { View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import type { ReactNode } from 'react'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'

function FocusGuard({ children }: { children: ReactNode }) {
  const isFocused = useIsFocused()
  return (
    <View style={{ flex: 1, display: isFocused ? 'flex' : 'none' }}>
      {children}
    </View>
  )
}

export default function TabsLayout() {
  const { t } = useTranslation()
  const colors = useThemeColors()

  return (
    <Tabs
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
          tabBarIcon: ({ color, size }) => (
            <UserIcon size={size} color={color} weight="bold" />
          ),
        }}
      />
    </Tabs>
  )
}
