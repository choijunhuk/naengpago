import type { QuantityType, RemainingLevel } from '../types/domain';

const LEVEL_ORDER: RemainingLevel[] = [
  'FULL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'ALMOST_EMPTY',
  'EMPTY',
];

function toKoreanDateParts(date: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return [value('year'), value('month'), value('day')];
}

export function getDday(expirationDate: string | null, now = new Date()): number | null {
  if (!expirationDate) return null;
  const [year, month, day] = expirationDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  const [nowYear, nowMonth, nowDay] = toKoreanDateParts(now);
  const targetEpoch = Date.UTC(year, month - 1, day);
  const nowEpoch = Date.UTC(nowYear, nowMonth - 1, nowDay);
  return Math.round((targetEpoch - nowEpoch) / 86_400_000);
}

export type ExpiryTone = 'ok' | 'warning' | 'urgent' | 'overdue' | 'unknown';

export function getExpiryTone(dday: number | null): ExpiryTone {
  if (dday === null) return 'unknown';
  if (dday < 0) return 'overdue';
  if (dday <= 3) return 'urgent';
  if (dday <= 7) return 'warning';
  return 'ok';
}

export function formatDday(dday: number | null): string {
  if (dday === null) return '기한 미입력';
  if (dday === 0) return 'D-DAY';
  if (dday < 0) return `D+${Math.abs(dday)}`;
  return `D-${dday}`;
}

export function decreaseLevel(level: RemainingLevel): RemainingLevel {
  const currentIndex = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER[Math.min(currentIndex + 1, LEVEL_ORDER.length - 1)] ?? 'EMPTY';
}

export function levelLabel(level: RemainingLevel | null): string {
  const labels: Record<RemainingLevel, string> = {
    FULL: '가득참',
    HIGH: '많음',
    MEDIUM: '보통',
    LOW: '조금',
    ALMOST_EMPTY: '거의 없음',
    EMPTY: '소진',
  };
  return level ? labels[level] : '미입력';
}

export function resolveDeduction(
  item: { quantityType: QuantityType; quantity: number | null },
  amount: number,
): { quantity: number; depleted: boolean } {
  const current = Math.max(0, item.quantity ?? 0);
  const quantity = Math.max(0, current - Math.max(0, amount));
  return { quantity, depleted: quantity === 0 };
}

