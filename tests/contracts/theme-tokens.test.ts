import { describe, expect, it } from 'vitest';

import { themeTokens } from '../../src/theme/tokens';

const approvedColors = new Set([
  '#16A34A',
  '#4ADE80',
  '#FAFAF9',
  '#111311',
  '#FFFFFF',
  '#1C1F1C',
  '#1C1917',
  '#F5F5F4',
  '#78716C',
  '#A8A29E',
  '#E7E5E4',
  '#2E332E',
  '#F59E0B',
  '#EF4444',
]);

function collectHexColors(value: unknown): string[] {
  if (typeof value === 'string') {
    return /^#[0-9A-F]{6}$/u.test(value) ? [value] : [];
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }

  return Object.values(value).flatMap(collectHexColors);
}

describe('design tokens', () => {
  it('uses only the approved color palette', () => {
    const colors = collectHexColors(themeTokens.colors);

    expect(colors.length).toBeGreaterThan(0);
    expect(colors.filter((color) => !approvedColors.has(color))).toEqual([]);
  });

  it('keeps the documented interaction and layout dimensions', () => {
    expect(themeTokens.spacing).toEqual([4, 8, 12, 16, 24, 32]);
    expect(themeTokens.layout.screenPadding).toBe(20);
    expect(themeTokens.accessibility.minimumTouchTarget).toBe(44);
    expect(themeTokens.icon.sizes).toEqual([20, 24]);
    expect(themeTokens.motion.successScaleDurationMs).toBe(200);
  });

  it('uses tabular numerals for quantity and D-day values', () => {
    expect(themeTokens.typography.numeric.fontVariant).toContain('tabular-nums');
  });
});

