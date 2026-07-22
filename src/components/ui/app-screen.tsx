import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
  testID?: string;
}

export function AppScreen({ children, title, subtitle, action, scroll = true, testID }: AppScreenProps) {
  const content = (
    <View className="gap-5 px-5 pb-12 pt-4" testID={testID}>
      {(title || subtitle || action) && (
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 gap-1">
            {title ? <Text className="font-sans text-2xl font-bold leading-9 text-ink-light dark:text-ink-dark">{title}</Text> : null}
            {subtitle ? <Text className="font-sans text-[15px] leading-[22px] text-muted-light dark:text-muted-dark">{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-app-light dark:bg-app-dark" edges={['top']}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

