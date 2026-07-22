import { Redirect } from 'expo-router';

import { useAppStore } from '../src/stores/app-store';

export default function IndexScreen() {
  const hasOnboarded = useAppStore((state) => state.hasOnboarded);
  const session = useAppStore((state) => state.session);

  if (!hasOnboarded) return <Redirect href="/(auth)/onboarding" />;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/home" />;
}

