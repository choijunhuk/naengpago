import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { initializeSentry } from '../src/lib/sentry';
import { AppProviders } from '../src/providers/app-providers';
import { useAppStore } from '../src/stores/app-store';

void SplashScreen.preventAutoHideAsync();
initializeSentry();

export default function RootLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  const setHydrated = useAppStore((state) => state.setHydrated);
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const fallback = setTimeout(() => setHydrated(true), 500);
    return () => clearTimeout(fallback);
  }, [setHydrated]);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <AppProviders>
      <StatusBar style={theme === 'DARK' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme === 'DARK' ? '#111311' : '#FAFAF9' },
          animation: 'slide_from_right',
        }}
      />
    </AppProviders>
  );
}

