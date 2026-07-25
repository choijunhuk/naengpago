import { router } from 'expo-router';
import { Bell, Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { AppScreen } from '../src/components/ui/app-screen';
import { Card } from '../src/components/ui/card';
import { StateView } from '../src/components/ui/state-view';
import { useMarkNotificationRead, useNotifications } from '../src/features/data/notifications';
import { useIconColors } from '../src/theme/icon-colors';

export default function NotificationsScreen() {
  const iconColors = useIconColors();
  const notifications = useNotifications();
  const items = notifications.data ?? [];
  const { markNotificationRead } = useMarkNotificationRead();
  const listState = notifications.isLoading ? 'loading' : notifications.isError ? 'error' : items.length ? 'ready' : 'empty';
  return (
    <AppScreen title="알림" subtitle="임박 재료와 공유 장보기 변경을 모아봐요.">
      <StateView state={listState} emptyTitle="새 알림이 없어요" emptyBody="임박 재료가 생기면 여기에서 알려드릴게요." errorMessage="알림을 불러오지 못했어요. 잠시 후 다시 시도해주세요." onRetry={notifications.refetch}>
        <View className="gap-3">{items.map((item) => <Pressable key={item.id} onPress={() => { void markNotificationRead(item.id); router.push(item.target as never); }}><Card className={`flex-row items-start gap-3 ${item.read ? 'opacity-60' : ''}`}><View className="h-11 w-11 items-center justify-center rounded-full bg-app-light dark:bg-app-dark">{item.read ? <Check color={iconColors.primary} size={20} /> : <Bell color={iconColors.primary} size={20} />}</View><View className="flex-1 gap-1"><Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">{item.title}</Text><Text className="font-sans text-sm leading-5 text-muted-light dark:text-muted-dark">{item.body}</Text></View></Card></Pressable>)}</View>
      </StateView>
    </AppScreen>
  );
}

