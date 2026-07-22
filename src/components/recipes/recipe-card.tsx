import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Clock3 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { RankedRecipe } from '../../domain/recommendation';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';

export function RecipeCard({ entry }: { entry: RankedRecipe }) {
  return (
    <Link href={`/recipes/${entry.recipe.id}`} asChild>
      <Pressable accessibilityLabel={`${entry.recipe.name}, 보유 ${entry.ownedCount}/${entry.requiredCount}`}>
        <Card className="overflow-hidden p-0">
          <Image source={entry.recipe.imageUrl} className="h-40 w-full" contentFit="cover" transition={200} />
          <View className="gap-3 p-4">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">{entry.recipe.name}</Text>
              <Badge label={`보유 ${entry.ownedCount}/${entry.requiredCount}`} tone={entry.missing.length === 0 ? 'success' : 'neutral'} />
            </View>
            <View className="flex-row flex-wrap items-center gap-2">
              <Clock3 color="#78716C" size={20} strokeWidth={1.5} />
              <Text className="font-sans text-sm text-muted-light dark:text-muted-dark">{entry.recipe.cookTimeMin}분 · {entry.recipe.difficulty === 'EASY' ? '쉬움' : '보통'}</Text>
              {entry.expiringIngredientNames.length ? <Badge label="임박 재료 사용" tone="danger" /> : null}
            </View>
            <Text className="font-sans text-sm leading-5 text-muted-light dark:text-muted-dark">{entry.reason}</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
