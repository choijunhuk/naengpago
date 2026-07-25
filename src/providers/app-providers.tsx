import { useEffect, type PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { connectQueryFocus, queryClient } from '../lib/query-client';
import { NotificationSync } from './notification-sync';
import { SessionSync } from './session-sync';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => connectQueryFocus(), []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionSync />
        <NotificationSync />
        {children}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
