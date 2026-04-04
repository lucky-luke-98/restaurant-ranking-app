import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/services/AuthContext';
import { LanguageProvider, useTranslation } from '@/services/LanguageContext';
import { AppThemeProvider, useAppTheme } from '@/services/ThemeContext';

function AuthGate() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const onAuthScreen = segments[0] === 'auth';

    if (!user && !onAuthScreen) {
      router.replace('/auth');
    } else if (user && onAuthScreen) {
      router.replace('/');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="auth" options={{ title: t.navWelcome, headerShown: false }} />
      <Stack.Screen name="index" options={{ title: t.navHome, headerShown: false }} />
      <Stack.Screen name="restaurants" options={{ title: t.navRestaurants }} />
      <Stack.Screen name="map" options={{ title: t.navMap }} />
      <Stack.Screen name="restaurant/[id]" options={{ title: t.navRestaurant }} />
      <Stack.Screen name="settings" options={{ title: t.navSettings }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function ThemedApp() {
  const { mode } = useAppTheme();

  return (
    <ThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <LanguageProvider>
        <ThemedApp />
      </LanguageProvider>
    </AppThemeProvider>
  );
}
