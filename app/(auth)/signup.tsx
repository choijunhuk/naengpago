import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { AppScreen } from '../../src/components/ui/app-screen';
import { Button } from '../../src/components/ui/button';
import { TextField } from '../../src/components/ui/text-field';
import { signUpWithEmail } from '../../src/features/auth/auth-service';
import { useAppStore } from '../../src/stores/app-store';

export default function SignupScreen() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signInDemo = useAppStore((state) => state.signInDemo);
  const signInLive = useAppStore((state) => state.signInLive);

  const submit = async () => {
    setError('');
    if (nickname.trim().length < 2 || !email.includes('@') || password.length < 8) {
      setError('닉네임 2자, 올바른 이메일, 비밀번호 8자 이상이 필요해요.');
      return;
    }
    setLoading(true);
    const result = await signUpWithEmail(email.trim(), password, nickname.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? '가입에 실패했어요.');
      return;
    }
    if (result.requiresEmailVerification) {
      Alert.alert('인증 메일을 보냈어요', '메일에서 인증한 뒤 로그인해주세요.');
      router.replace('/(auth)/login');
      return;
    }
    if (result.user) signInLive(result.user);
    else signInDemo(email.trim(), nickname.trim());
    router.replace('/(tabs)/home');
  };

  return (
    <AppScreen title="냉파고 시작하기" subtitle="사진은 재료 인식 목적으로만 사용하고 회원 데이터로 안전하게 보관해요." testID="signup-screen">
      <View className="gap-4">
        <TextField label="닉네임" value={nickname} onChangeText={setNickname} placeholder="함께 쓸 이름" />
        <TextField label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextField label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry hint="8자 이상 입력해주세요." error={error} />
      </View>
      <Text className="font-sans text-xs leading-5 text-muted-light dark:text-muted-dark">가입하면 서비스 이용약관과 개인정보 처리방침에 동의한 것으로 간주합니다.</Text>
      <Button label="이메일로 가입" loading={loading} onPress={() => void submit()} testID="signup-submit" />
      <Link href="/(auth)/login" className="text-center font-sans text-sm font-semibold text-primary-light dark:text-primary-dark">이미 계정이 있어요</Link>
    </AppScreen>
  );
}

