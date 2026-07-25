import * as Notifications from 'expo-notifications';

import { getDday } from '../../domain/inventory';
import { subjectParticle } from '../../domain/korean';
import type { InventoryItem } from '../../domain/models';

const NOTIFY_HOUR = 9;

function nextTrigger(dday: number, now: Date): Date | null {
  // 임박 재료는 알림일 오전 9시에 알린다. 이미 그 시각이 지났으면 즉시(약간 뒤) 예약한다.
  const fireAt = new Date(now);
  fireAt.setHours(NOTIFY_HOUR, 0, 0, 0);
  if (dday <= 0 || fireAt.getTime() <= now.getTime()) {
    return new Date(now.getTime() + 5_000);
  }
  return fireAt;
}

export async function scheduleExpiryNotifications(items: InventoryItem[], alertDays = 3): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  const granted = permission.granted
    ? true
    : permission.canAskAgain
      ? (await Notifications.requestPermissionsAsync()).granted
      : false;
  if (!granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();
  for (const item of items) {
    const dday = getDday(item.expirationDate);
    if (dday === null || dday < 0 || dday > alertDays) continue;
    const fireDate = nextTrigger(dday, now);
    if (!fireDate) continue;
    const particle = subjectParticle(item.displayName);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${item.displayName}${particle} ${dday === 0 ? '오늘까지예요' : `D-${dday}예요`}`,
        body: '임박 재료 추천에서 먼저 사용할 요리를 확인해보세요.',
        data: { target: `/inventory/${item.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
  }
}
