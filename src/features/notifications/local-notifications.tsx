import * as Notifications from 'expo-notifications';

import { getDday } from '../../domain/inventory';
import type { InventoryItem } from '../../domain/models';

export async function scheduleExpiryNotifications(items: InventoryItem[], alertDays = 3): Promise<void> {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of items) {
    const dday = getDday(item.expirationDate);
    if (dday === null || dday < 0 || dday > alertDays) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${item.displayName}이 ${dday === 0 ? '오늘까지예요' : `D-${dday}예요`}`,
        body: '임박 재료 추천에서 먼저 사용할 요리를 확인해보세요.',
        data: { target: `/inventory/${item.id}` },
      },
      trigger: null,
    });
  }
}

