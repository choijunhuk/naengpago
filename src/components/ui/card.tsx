import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

export function Card({ children, className = '', ...props }: PropsWithChildren<ViewProps>) {
  return (
    <View
      className={`rounded-card border border-line-light bg-surface-light p-4 dark:border-line-dark dark:bg-surface-dark ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

