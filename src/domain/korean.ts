const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

export function hasBatchim(word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed) return false;
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return false;
  return (code - HANGUL_BASE) % 28 !== 0;
}

export function subjectParticle(word: string): '이' | '가' {
  return hasBatchim(word) ? '이' : '가';
}

export function topicParticle(word: string): '은' | '는' {
  return hasBatchim(word) ? '은' : '는';
}

export function objectParticle(word: string): '을' | '를' {
  return hasBatchim(word) ? '을' : '를';
}

const RIEUL_JONGSEONG = 8;

/**
 * Instrumental particle 으로/로. Unlike the other particles this is not a plain
 * batchim toggle: a word ending in ㄹ takes 로 just like a vowel-final word, so
 * only other final consonants get 으로.
 */
export function instrumentalParticle(word: string): '으로' | '로' {
  const trimmed = word.trim();
  if (!trimmed) return '로';
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return '로';
  const jongseong = (code - HANGUL_BASE) % 28;
  return jongseong === 0 || jongseong === RIEUL_JONGSEONG ? '로' : '으로';
}
