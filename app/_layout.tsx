import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { initializeSentry } from '../src/lib/sentry';
import { themeTokens } from '../src/theme/tokens';
import { AppProviders } from '../src/providers/app-providers';
import { useAppStore } from '../src/stores/app-store';

void SplashScreen.preventAutoHideAsync();
initializeSentry();

export default function RootLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  const setHydrated = useAppStore((state) => state.setHydrated);
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsubscribe = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    // 실제 rehydration을 앞질러 상태를 뒤집지 않도록, 충분히 긴 타임아웃이 지나고도
    // 아직 hydration이 끝나지 않은 경우에만 강제로 진행한다.
    const fallback = setTimeout(() => {
      if (!useAppStore.persist.hasHydrated()) setHydrated(true);
    }, 3000);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
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
          contentStyle: { backgroundColor: theme === 'DARK' ? themeTokens.colors.dark.background : themeTokens.colors.light.background },
          animation: 'slide_from_right',
        }}
      />
    </AppProviders>
  );
}

