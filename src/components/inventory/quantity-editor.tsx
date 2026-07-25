import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { levelLabel } from '../../domain/inventory';
import { useIconColors } from '../../theme/icon-colors';
import type { QuantityType, RemainingLevel } from '../../types/domain';

const levels: RemainingLevel[] = ['FULL', 'HIGH', 'MEDIUM', 'LOW', 'ALMOST_EMPTY'];

interface QuantityEditorProps {
  quantityType: QuantityType;
  quantity: number | null;
  unit: string | null;
  remainingLevel: RemainingLevel | null;
  onQuantityChange: (quantity: number) => void;
  onLevelChange: (level: RemainingLevel) => void;
}

export function QuantityEditor({
  quantityType,
  quantity,
  unit,
  remainingLevel,
  onQuantityChange,
  onLevelChange,
}: QuantityEditorProps) {
  const iconColors = useIconColors();
  if (quantityType === 'LEVEL') {
    return (
      <View className="gap-2">
        <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">잔여량 {levelLabel(remainingLevel)}</Text>
        <View className="flex-row gap-1" accessibilityLabel={`잔여량 ${levelLabel(remainingLevel)}`}>
          {levels.map((level) => (
            <Pressable
              key={level}
              className={`min-h-11 flex-1 rounded-button border ${remainingLevel === level ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-line-light bg-surface-light dark:border-line-dark dark:bg-surface-dark'}`}
              onPress={() => onLevelChange(level)}
              accessibilityRole="button"
              accessibilityLabel={levelLabel(level)}
            />
          ))}
        </View>
      </View>
    );
  }

  const step = quantityType === 'MEASURABLE' ? 10 : 1;
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">
        {quantityType === 'MEASURABLE' ? '직접 입력량' : '수량'}
      </Text>
      <View className="flex-row items-center gap-3 rounded-button border border-line-light p-1 dark:border-line-dark">
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-button"
          onPress={() => onQuantityChange(Math.max(0, (quantity ?? 0) - step))}
          accessibilityLabel="수량 줄이기"
        >
          <Minus color={iconColors.muted} size={20} strokeWidth={1.5} />
        </Pressable>
        <Text className="min-w-16 text-center font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">
          {quantity ?? 0}{unit ? ` ${unit}` : ''}
        </Text>
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-button"
          onPress={() => onQuantityChange((quantity ?? 0) + step)}
          accessibilityLabel="수량 늘리기"
        >
          <Plus color={iconColors.primary} size={20} strokeWidth={1.5} />
        </Pressable>
      </View>
    </View>
  );
}

