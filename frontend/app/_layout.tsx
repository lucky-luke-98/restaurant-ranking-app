import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useEffect, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/services/AuthContext';
import { LanguageProvider, useTranslation } from '@/services/LanguageContext';
import { AppThemeProvider, useAppTheme } from '@/services/ThemeContext';
import { useThemeColors } from '@/hooks/useThemeColors';

function AuthGate() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();
  const colors = useThemeColors();

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
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.gradientTop },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="auth" options={{ title: t.navWelcome, headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="restaurant/[id]" options={{ title: t.navRestaurant }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function ThemedApp() {
  const { mode } = useAppTheme();
  const colors = useThemeColors();

  const navTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: 'transparent',
        card: colors.backgroundElevated,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [mode, colors]);

  return (
    <ThemeProvider value={navTheme}>
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        {/* Edge vignette — barely-perceptible darkening at viewport edges. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.06)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0.07, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(0,0,0,0.06)']}
          start={{ x: 0.93, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.05)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.05 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(0,0,0,0.05)']}
          start={{ x: 0.5, y: 0.95 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </View>
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
