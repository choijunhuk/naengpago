import { Text, View } from 'react-native';

interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

const containerClasses = {
  neutral: 'border-line-light bg-app-light dark:border-line-dark dark:bg-app-dark',
  success: 'border-primary-light bg-app-light dark:border-primary-dark dark:bg-app-dark',
  warning: 'border-warning bg-app-light dark:bg-app-dark',
  danger: 'border-danger bg-app-light dark:bg-app-dark',
} as const;

const textClasses = {
  neutral: 'text-muted-light dark:text-muted-dark',
  success: 'text-primary-light dark:text-primary-dark',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View className={`self-start rounded-full border px-2.5 py-1 ${containerClasses[tone]}`}>
      <Text className={`font-sans text-xs ${textClasses[tone]}`}>{label}</Text>
    </View>
  );
}

