import { useState } from 'react';
import { Copy, UserPlus, Users } from 'lucide-react-native';
import { Alert, Text, View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { TextField } from '../../src/components/ui/text-field';
import { joinHousehold } from '../../src/features/auth/auth-service';
import { useAppStore } from '../../src/stores/app-store';

export default function HouseholdScreen() {
  const session = useAppStore((state) => state.session);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const join = async () => {
    setJoining(true);
    try {
      await joinHousehold(inviteCode);
      setInviteCode('');
      Alert.alert('그룹에 참여했어요', '공유 재고를 새로고침해 확인해 주세요.');
    } catch (cause) {
      Alert.alert('참여하지 못했어요', cause instanceof Error ? cause.message : '초대 코드를 다시 확인해 주세요.');
    } finally {
      setJoining(false);
    }
  };
  return (
    <AppScreen title="우리집 그룹" subtitle="같이 사는 사람과 하나의 냉장고 재고를 공유해요.">
      <Card className="gap-4"><View className="flex-row items-center gap-3"><Users color="#16A34A" size={24} strokeWidth={1.5} /><View className="flex-1"><Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">{session?.nickname}</Text><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">{session?.email}</Text></View><Badge label="OWNER" tone="success" /></View></Card>
      <Card className="gap-3"><Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">내 초대 코드</Text><View className="flex-row items-center gap-3"><Text className="flex-1 font-sans text-2xl font-bold tracking-[6px] text-ink-light dark:text-ink-dark">NP7K2A</Text><Button label="복사" variant="secondary" fullWidth={false} icon={<Copy color="#78716C" size={20} />} onPress={() => Alert.alert('초대 코드를 복사했어요', 'NP7K2A')} /></View><Text className="font-sans text-xs text-muted-light dark:text-muted-dark">실제 서버에서는 재발급 가능한 고유 코드로 검증해요.</Text></Card>
      <Card className="gap-3"><TextField label="다른 그룹 참여" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" placeholder="초대 코드" /><Button label="그룹 참여" icon={<UserPlus color="#FFFFFF" size={20} />} loading={joining} disabled={inviteCode.trim().length < 6} onPress={() => void join()} /></Card>
    </AppScreen>
  );
}
