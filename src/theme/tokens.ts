export const themeTokens = {
  colors: {
    light: {
      primary: '#16A34A',
      background: '#FAFAF9',
      surface: '#FFFFFF',
      text: '#1C1917',
      textMuted: '#78716C',
      border: '#E7E5E4',
      expiry: {
        ok: '#78716C',
        warning: '#F59E0B',
        urgent: '#EF4444',
        overdue: '#EF4444',
      },
    },
    dark: {
      primary: '#4ADE80',
      background: '#111311',
      surface: '#1C1F1C',
      text: '#F5F5F4',
      textMuted: '#A8A29E',
      border: '#2E332E',
      expiry: {
        ok: '#A8A29E',
        warning: '#F59E0B',
        urgent: '#EF4444',
        overdue: '#EF4444',
      },
    },
  },
  typography: {
    fontFamily: 'Pretendard',
    display: { fontSize: 24, fontWeight: '700', lineHeight: 36 },
    title: { fontSize: 18, fontWeight: '600', lineHeight: 27 },
    body: { fontSize: 15, fontWeight: '400', lineHeight: 22.5 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
    numeric: { fontVariant: ['tabular-nums'] },
  },
  spacing: [4, 8, 12, 16, 24, 32],
  layout: {
    screenPadding: 20,
  },
  radius: {
    card: 16,
    button: 12,
    chip: 9999,
    sheetTop: 24,
  },
  icon: {
    sizes: [20, 24],
    strokeWidth: 1.5,
  },
  motion: {
    successScaleDurationMs: 200,
  },
  accessibility: {
    minimumTouchTarget: 44,
    minimumContrastRatio: 4.5,
  },
} as const;

