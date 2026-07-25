import { describe, expect, it } from 'vitest';

import {
  hasBatchim,
  instrumentalParticle,
  objectParticle,
  subjectParticle,
  topicParticle,
} from '../../src/domain/korean';

describe('korean particles', () => {
  it('detects a trailing batchim only for hangul consonant endings', () => {
    expect(hasBatchim('당근')).toBe(true);
    expect(hasBatchim('양파')).toBe(false);
    expect(hasBatchim('')).toBe(false);
    expect(hasBatchim('tofu')).toBe(false);
  });

  it('chooses subject/topic/object particles by batchim', () => {
    expect(subjectParticle('당근')).toBe('이');
    expect(subjectParticle('양파')).toBe('가');
    expect(topicParticle('당근')).toBe('은');
    expect(topicParticle('양파')).toBe('는');
    expect(objectParticle('당근')).toBe('을');
    expect(objectParticle('양파')).toBe('를');
  });

  it('treats ㄹ-final and vowel-final words as 로 for the instrumental particle', () => {
    expect(instrumentalParticle('양파')).toBe('로');
    expect(instrumentalParticle('나물')).toBe('로');
    expect(instrumentalParticle('당근')).toBe('으로');
    expect(instrumentalParticle('버섯')).toBe('으로');
    expect(instrumentalParticle('tofu')).toBe('로');
  });
});
