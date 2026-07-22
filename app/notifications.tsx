import { router } from 'expo-router';
import { Bell, Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { AppScreen } from '../src/components/ui/app-screen';
import { Card } from '../src/components/ui/card';
import { StateView } from '../src/components/ui/state-view';
import { useAppStore } from '../src/stores/app-store';

export default function NotificationsScreen() {
  const items = useAppStore((state) => state.notifications);
  const markRead = useAppStore((state) => state.markNotificationRead);
  return (
    <AppScreen title="알림" subtitle="임박 재료와 공유 장보기 변경을 모아봐요.">
      <StateView state={items.length ? 'ready' : 'empty'} emptyTitle="새 알림이 없어요" emptyBody="임박 재료가 생기면 여기에서 알려드릴게요.">
        <View className="gap-3">{items.map((item) => <Pressable key={item.id} onPress={() => { markRead(item.id); router.push(item.target as never); }}><Card className={`flex-row items-start gap-3 ${item.read ? 'opacity-60' : ''}`}><View className="h-11 w-11 items-center justify-center rounded-full bg-app-light dark:bg-app-dark">{item.read ? <Check color="#16A34A" size={20} /> : <Bell color="#16A34A" size={20} />}</View><View className="flex-1 gap-1"><Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">{item.title}</Text><Text className="font-sans text-sm leading-5 text-muted-light dark:text-muted-dark">{item.body}</Text></View></Card></Pressable>)}</View>
      </StateView>
    </AppScreen>
  );
}

