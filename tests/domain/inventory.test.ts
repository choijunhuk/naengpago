import { describe, expect, it } from 'vitest';

import {
  decreaseLevel,
  getDday,
  getExpiryTone,
  resolveDeduction,
} from '../../src/domain/inventory';

describe('inventory domain', () => {
  it('calculates a date-only D-day without time-of-day drift', () => {
    expect(getDday('2026-07-25', new Date('2026-07-22T18:30:00+09:00'))).toBe(3);
    expect(getDday('2026-07-21', new Date('2026-07-22T00:10:00+09:00'))).toBe(-1);
    expect(getDday(null, new Date('2026-07-22T00:10:00+09:00'))).toBeNull();
  });

  it('maps expiry urgency to the product color contract', () => {
    expect(getExpiryTone(9)).toBe('ok');
    expect(getExpiryTone(6)).toBe('warning');
    expect(getExpiryTone(2)).toBe('urgent');
    expect(getExpiryTone(-1)).toBe('overdue');
    expect(getExpiryTone(null)).toBe('unknown');
  });

  it('decreases level inventory one semantic step at a time', () => {
    expect(decreaseLevel('FULL')).toBe('HIGH');
    expect(decreaseLevel('LOW')).toBe('ALMOST_EMPTY');
    expect(decreaseLevel('EMPTY')).toBe('EMPTY');
  });

  it('never makes a countable or measurable deduction negative', () => {
    expect(resolveDeduction({ quantityType: 'COUNTABLE', quantity: 2 }, 3)).toEqual({
      quantity: 0,
      depleted: true,
    });
    expect(resolveDeduction({ quantityType: 'MEASURABLE', quantity: 500 }, 120)).toEqual({
      quantity: 380,
      depleted: false,
    });
  });
});

