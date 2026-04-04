import { Tabs } from 'expo-router'
import { ForkKnifeIcon, MapPinIcon, UserIcon } from 'phosphor-react-native'
import { useTranslation } from '@/services/LanguageContext'
import { useThemeColors } from '@/hooks/useThemeColors'

export default function TabsLayout() {
  const { t } = useTranslation()
  const colors = useThemeColors()

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
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
