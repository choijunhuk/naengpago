import { router } from 'expo-router';
import { Bell, ChevronRight, LogOut, Moon, ShieldCheck, Users } from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { Card } from '../../src/components/ui/card';
import { deleteAccount, signOutSession } from '../../src/features/auth/auth-service';
import { useAppStore } from '../../src/stores/app-store';

export default function SettingsScreen() {
  const session = useAppStore((state) => state.session);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const signOut = useAppStore((state) => state.signOut);
  const { setColorScheme } = useColorScheme();
  const chooseTheme = (value: 'SYSTEM' | 'LIGHT' | 'DARK') => {
    setTheme(value);
    setColorScheme(value === 'SYSTEM' ? 'system' : value.toLowerCase() as 'light' | 'dark');
  };
  const rows = [
    { label: '그룹 관리', icon: Users, onPress: () => router.push('/household') },
    { label: '알림 내역', icon: Bell, onPress: () => router.push('/notifications') },
    { label: '개인정보 및 AI 사진 안내', icon: ShieldCheck, onPress: () => Alert.alert('사진 처리 안내', '사진은 재료 인식 목적으로만 전송하며, LLM 키는 앱에 저장하지 않아요.') },
  ];
  const finishSignOut = () => {
    signOut();
    router.replace('/(auth)/login');
  };
  const logout = async () => {
    try {
      await signOutSession();
      finishSignOut();
    } catch {
      Alert.alert('로그아웃하지 못했어요', '네트워크 연결을 확인하고 다시 시도해 주세요.');
    }
  };
  const requestDeletion = () => {
    Alert.alert(
      '회원 탈퇴',
      '즉시 로그인이 차단되고 30일 후 프로필·재고·사진이 삭제됩니다. 유일한 OWNER라면 먼저 다른 구성원에게 위임해야 합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '계속',
          style: 'destructive',
          onPress: () => Alert.alert(
            '정말 탈퇴할까요?',
            '이 작업은 30일 유예 후 되돌릴 수 없습니다.',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '회원 탈퇴',
                style: 'destructive',
                onPress: () => {
                  void deleteAccount()
                    .then(finishSignOut)
                    .catch((cause) => Alert.alert(
                      '탈퇴를 완료하지 못했어요',
                      cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.',
                    ));
                },
              },
            ],
          ),
        },
      ],
    );
  };

  return (
    <AppScreen title="프로필 · 설정" subtitle="내 식생활과 알림 방식을 관리해요." testID="settings-screen">
      <Card className="flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-light dark:bg-primary-dark"><Text className="font-sans text-xl font-bold text-white dark:text-app-dark">{session?.nickname.slice(0, 1)}</Text></View>
        <View className="flex-1 gap-1"><Text className="font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">{session?.nickname}</Text><Text className="font-sans text-sm text-muted-light dark:text-muted-dark">{session?.email}</Text></View>
        <Badge label="OWNER" tone="success" />
      </Card>
      <Card className="gap-3">
        <View className="flex-row items-center gap-2"><Moon color="#78716C" size={20} strokeWidth={1.5} /><Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">화면 모드</Text></View>
        <View className="flex-row gap-2">
          {(['SYSTEM', 'LIGHT', 'DARK'] as const).map((value) => (
            <Pressable key={value} className={`min-h-11 flex-1 items-center justify-center rounded-button border ${theme === value ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light dark:border-line-dark'}`} onPress={() => chooseTheme(value)}>
              <Text className={`font-sans text-sm ${theme === value ? 'font-semibold text-white dark:text-app-dark' : 'text-muted-light dark:text-muted-dark'}`}>{value === 'SYSTEM' ? '시스템' : value === 'LIGHT' ? '라이트' : '다크'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card className="p-0">
        {rows.map(({ label, icon: Icon, onPress }, index) => (
          <Pressable key={label} className={`min-h-14 flex-row items-center gap-3 px-4 ${index ? 'border-t border-line-light dark:border-line-dark' : ''}`} onPress={onPress}>
            <Icon color="#78716C" size={20} strokeWidth={1.5} /><Text className="flex-1 font-sans text-[15px] text-ink-light dark:text-ink-dark">{label}</Text><ChevronRight color="#78716C" size={20} strokeWidth={1.5} />
          </Pressable>
        ))}
      </Card>
      <Button label="로그아웃" variant="secondary" icon={<LogOut color="#78716C" size={20} strokeWidth={1.5} />} onPress={() => void logout()} />
      <Button label="회원 탈퇴 요청" variant="danger" onPress={requestDeletion} />
    </AppScreen>
  );
}
