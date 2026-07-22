import { useState } from 'react';
import { Link, router } from 'expo-router';
import { View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Badge } from '../../src/components/ui/badge';
import { Button } from '../../src/components/ui/button';
import { TextField } from '../../src/components/ui/text-field';
import { signInWithEmail } from '../../src/features/auth/auth-service';
import { appEnv } from '../../src/lib/env';
import { useAppStore } from '../../src/stores/app-store';

export default function LoginScreen() {
  const [email, setEmail] = useState('demo@naengpago.app');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signInDemo = useAppStore((state) => state.signInDemo);

  const submit = async () => {
    setError('');
    if (!email.includes('@') || password.length < 8) {
      setError('이메일과 8자 이상 비밀번호를 확인해주세요.');
      return;
    }
    setLoading(true);
    const result = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? '로그인에 실패했어요.');
      return;
    }
    signInDemo(email.trim());
    router.replace('/(tabs)/home');
  };

  return (
    <AppScreen title="다시 만나서 반가워요" subtitle="냉장고 속 재료부터 오늘 메뉴까지 이어서 관리해요." testID="login-screen">
      {appEnv.aiMode === 'mock' ? <Badge label="데모 모드 · 입력값은 이 기기에만 저장" tone="success" /> : null}
      <View className="gap-4">
        <TextField label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry error={error} />
      </View>
      <Button label="로그인" loading={loading} onPress={() => void submit()} testID="login-submit" />
      <View className="flex-row justify-between">
        <Link href="/(auth)/reset-password" className="font-sans text-sm text-muted-light dark:text-muted-dark">비밀번호 재설정</Link>
        <Link href="/(auth)/signup" className="font-sans text-sm font-semibold text-primary-light dark:text-primary-dark">처음이신가요? 가입하기</Link>
      </View>
    </AppScreen>
  );
}
