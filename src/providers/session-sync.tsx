import { useEffect } from 'react';

import { isLiveData } from '../features/data/internal';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/app-store';

/**
 * live 모드에서만 Supabase 세션을 앱 세션으로 복원/동기화한다.
 * mock 모드는 persist된 데모 세션을 그대로 사용한다.
 */
export function SessionSync() {
  const signInLive = useAppStore((state) => state.signInLive);
  const signOut = useAppStore((state) => state.signOut);

  useEffect(() => {
    if (!isLiveData || !supabase) return;
    const client = supabase;

    const apply = (user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) {
        signOut();
        return;
      }
      const nickname =
        typeof user.user_metadata?.nickname === 'string' ? user.user_metadata.nickname : user.email ?? '냉파고 사용자';
      signInLive({ id: user.id, email: user.email ?? '', nickname });
    };

    void client.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [signInLive, signOut]);

  return null;
}
