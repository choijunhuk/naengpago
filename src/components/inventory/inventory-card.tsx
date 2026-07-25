import { Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { categoryEmoji } from '../../domain/category-emoji';
import { levelLabel } from '../../domain/inventory';
import type { InventoryItem } from '../../domain/models';
import { useIconColors } from '../../theme/icon-colors';
import { Card } from '../ui/card';
import { ExpiryBadge } from './expiry-badge';

export function InventoryCard({ item }: { item: InventoryItem }) {
  const iconColors = useIconColors();
  const amount = item.quantityType === 'LEVEL'
    ? levelLabel(item.remainingLevel)
    : `${item.quantity ?? 0}${item.unit ? ` ${item.unit}` : ''}`;
  return (
    <Link href={`/inventory/${item.id}`} asChild>
      <Pressable accessibilityLabel={`${item.displayName}, ${amount}`}>
        <Card className="flex-row items-center gap-3 p-3">
          <View className="h-14 w-14 items-center justify-center rounded-card bg-app-light dark:bg-app-dark">
            <Text className="text-2xl" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{categoryEmoji(item.category)}</Text>
          </View>
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-sans text-[15px] font-semibold text-ink-light dark:text-ink-dark">{item.displayName}</Text>
              <ExpiryBadge expirationDate={item.expirationDate} />
            </View>
            <Text className="font-sans text-sm text-muted-light dark:text-muted-dark">{amount}</Text>
          </View>
          <ChevronRight color={iconColors.muted} size={20} strokeWidth={1.5} />
        </Card>
      </Pressable>
    </Link>
  );
}

