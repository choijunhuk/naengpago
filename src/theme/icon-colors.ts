import { useColorScheme } from 'nativewind';

import { themeTokens } from './tokens';

export type IconColorRole =
  | 'primary'
  | 'text'
  | 'muted'
  | 'onPrimary'
  | 'danger'
  | 'warning';

/**
 * Resolves lucide icon colors against the active color scheme so icons track
 * dark mode the same way NativeWind `dark:` background classes do. `onPrimary`
 * mirrors the button label contract (`text-white dark:text-app-dark`) for icons
 * sitting on a primary-colored surface.
 */
export function useIconColors(): Record<IconColorRole, string> {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const palette = themeTokens.colors[scheme];

  return {
    primary: palette.primary,
    text: palette.text,
    muted: palette.textMuted,
    onPrimary: scheme === 'dark' ? palette.background : themeTokens.colors.light.surface,
    danger: palette.expiry.urgent,
    warning: palette.expiry.warning,
  };
}
