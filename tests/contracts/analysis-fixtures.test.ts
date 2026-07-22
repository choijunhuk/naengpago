import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AnalysisResponseSchema,
  DetectedItemSchema,
} from '../../src/types/analysis';

const fixtureDirectory = join(
  process.cwd(),
  'supabase/functions/_shared/fixtures',
);

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixtureDirectory, name), 'utf8')) as unknown;
}

describe('AI analysis response contract', () => {
  it.each([
    'fridge-interior.json',
    'table-spread.json',
    'single-package.json',
  ])('accepts the %s mock fixture', (fixtureName) => {
    expect(() => AnalysisResponseSchema.parse(readFixture(fixtureName))).not.toThrow();
  });

  it('rejects confidence values outside zero to one', () => {
    const item = readFixture('single-package.json') as {
      detectedItems: unknown[];
    };

    expect(() =>
      DetectedItemSchema.parse({
        ...(item.detectedItems[0] as object),
        confidence: 1.01,
      }),
    ).toThrow();
  });

  it('rejects bounding boxes that extend beyond the image', () => {
    const item = readFixture('single-package.json') as {
      detectedItems: unknown[];
    };

    expect(() =>
      DetectedItemSchema.parse({
        ...(item.detectedItems[0] as object),
        boundingBox: { x: 0.9, y: 0.2, width: 0.2, height: 0.3 },
      }),
    ).toThrow();
  });

  it.each(['LEVEL', 'MEASURABLE']) (
    'does not allow AI to assert an estimated count for %s items',
    (quantityType) => {
      const item = readFixture('single-package.json') as {
        detectedItems: unknown[];
      };

      expect(() =>
        DetectedItemSchema.parse({
          ...(item.detectedItems[0] as object),
          quantityType,
          estimatedCount: 500,
        }),
      ).toThrow();
    },
  );

  it('requires a remaining level only when the quantity type is LEVEL', () => {
    const item = readFixture('single-package.json') as {
      detectedItems: unknown[];
    };

    expect(() =>
      DetectedItemSchema.parse({
        ...(item.detectedItems[0] as object),
        quantityType: 'COUNTABLE',
        remainingLevel: 'HIGH',
      }),
    ).toThrow();
  });
});

