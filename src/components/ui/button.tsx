import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { useIconColors } from '../../theme/icon-colors';

interface ButtonProps extends PressableProps {
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}

const containerClasses = {
  primary: 'bg-primary-light dark:bg-primary-dark',
  secondary: 'border border-line-light bg-surface-light dark:border-line-dark dark:bg-surface-dark',
  ghost: 'bg-transparent',
  danger: 'border border-danger bg-transparent',
} as const;

const labelClasses = {
  primary: 'text-white dark:text-app-dark',
  secondary: 'text-ink-light dark:text-ink-dark',
  ghost: 'text-primary-light dark:text-primary-dark',
  danger: 'text-danger',
} as const;

export function Button({
  label,
  icon,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  ...props
}: ButtonProps) {
  const iconColors = useIconColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-11 flex-row items-center justify-center gap-2 rounded-button px-4 py-3 active:scale-[0.98] ${containerClasses[variant]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-40' : ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? iconColors.onPrimary : iconColors.primary} /> : icon}
      <Text className={`font-sans text-[15px] font-semibold ${labelClasses[variant]}`}>{label}</Text>
    </Pressable>
  );
}

