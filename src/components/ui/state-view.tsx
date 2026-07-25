import type { ReactNode } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { AlertCircle, PackageOpen } from 'lucide-react-native';

import { useIconColors } from '../../theme/icon-colors';
import { Button } from './button';
import { Card } from './card';

type State = 'ready' | 'loading' | 'empty' | 'error';

interface StateViewProps {
  state: State;
  children: ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function StateView({
  state,
  children,
  emptyTitle = '아직 내용이 없어요',
  emptyBody = '첫 항목을 추가하면 여기에 모아 보여드릴게요.',
  errorMessage = '불러오지 못했어요. 잠시 후 다시 시도해주세요.',
  onRetry,
}: StateViewProps) {
  const iconColors = useIconColors();
  if (state === 'ready') return <>{children}</>;
  if (state === 'loading') {
    return (
      <Card className="items-center gap-3 py-10">
        <ActivityIndicator color={iconColors.primary} />
        <Text className="font-sans text-sm text-muted-light dark:text-muted-dark">내용을 준비하고 있어요</Text>
      </Card>
    );
  }
  if (state === 'error') {
    return (
      <Card className="items-center gap-3 py-8">
        <AlertCircle color={iconColors.danger} size={24} strokeWidth={1.5} />
        <Text className="text-center font-sans text-[15px] text-ink-light dark:text-ink-dark">{errorMessage}</Text>
        {onRetry ? <Button label="다시 시도" variant="secondary" fullWidth={false} onPress={onRetry} /> : null}
      </Card>
    );
  }
  return (
    <Card className="items-center gap-3 py-10">
      <PackageOpen color={iconColors.muted} size={24} strokeWidth={1.5} />
      <Text className="font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">{emptyTitle}</Text>
      <Text className="text-center font-sans text-sm leading-5 text-muted-light dark:text-muted-dark">{emptyBody}</Text>
    </Card>
  );
}
