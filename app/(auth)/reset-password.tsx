import { useState } from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { TextField } from '../../src/components/ui/text-field';
import { requestPasswordReset } from '../../src/features/auth/auth-service';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) return;
    setLoading(true);
    const result = await requestPasswordReset(email.trim());
    setLoading(false);
    if (!result.ok) {
      Alert.alert('메일을 보내지 못했어요', result.message);
      return;
    }
    Alert.alert('재설정 메일을 보냈어요', '메일의 링크에서 새 비밀번호를 설정해주세요.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  };

  return (
    <AppScreen title="비밀번호 재설정" subtitle="가입한 이메일로 안전한 재설정 링크를 보내드려요.">
      <TextField label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button label="재설정 메일 보내기" loading={loading} disabled={!email.includes('@')} onPress={() => void submit()} />
      <Button label="로그인으로 돌아가기" variant="ghost" onPress={() => router.back()} />
    </AppScreen>
  );
}

