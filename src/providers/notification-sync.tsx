import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { useInventory } from '../features/data/inventory';
import { scheduleExpiryNotifications } from '../features/notifications/local-notifications';
import { useAppStore } from '../stores/app-store';

/**
 * 재고가 로드/변경될 때 임박 알림을 다시 예약하고, 알림 탭 응답을 딥링크로 연결한다.
 * mock/live 모두 useInventory 한 경로로 동작한다.
 */
export function NotificationSync() {
  const session = useAppStore((state) => state.session);
  const inventory = useInventory();
  const items = inventory.data;

  useEffect(() => {
    if (!session || !items) return;
    void scheduleExpiryNotifications(items).catch(() => {});
  }, [session, items]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = response.notification.request.content.data?.target;
      if (typeof target === 'string') router.push(target as never);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
