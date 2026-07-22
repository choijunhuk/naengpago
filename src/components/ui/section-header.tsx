import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function SectionHeader({ title, caption, action }: { title: string; caption?: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="flex-1 gap-0.5">
        <Text className="font-sans text-lg font-semibold text-ink-light dark:text-ink-dark">{title}</Text>
        {caption ? <Text className="font-sans text-xs text-muted-light dark:text-muted-dark">{caption}</Text> : null}
      </View>
      {action}
    </View>
  );
}

