import { z } from 'zod';

import {
  IngredientCategorySchema,
  QuantityTypeSchema,
  RemainingLevelSchema,
} from './domain';

export const BoundingBoxSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .superRefine((box, context) => {
    if (box.x + box.width > 1) {
      context.addIssue({
        code: 'custom',
        message: 'boundingBox exceeds the image width',
        path: ['width'],
      });
    }
    if (box.y + box.height > 1) {
      context.addIssue({
        code: 'custom',
        message: 'boundingBox exceeds the image height',
        path: ['height'],
      });
    }
  });

export const PackageInfoSchema = z.object({
  productName: z.string().min(1).nullable(),
  brand: z.string().min(1).nullable(),
  totalVolume: z.string().min(1).nullable(),
  expirationDateText: z.string().min(1).nullable(),
  barcodeVisible: z.boolean(),
});

export const DetectedItemSchema = z
  .object({
    rawName: z.string().min(1),
    normalizedNameKo: z.string().min(1),
    category: IngredientCategorySchema,
    quantityType: QuantityTypeSchema,
    estimatedCount: z.number().int().positive().nullable(),
    unit: z.string().min(1).nullable(),
    remainingLevel: RemainingLevelSchema.nullable(),
    packageInfo: PackageInfoSchema,
    confidence: z.number().min(0).max(1),
    boundingBox: BoundingBoxSchema,
    reason: z.string().min(1),
  })
  .superRefine((item, context) => {
    // AI may estimate discrete packages, but it must never turn visual guesses
    // into exact weights or measurable quantities.
    if (item.quantityType !== 'COUNTABLE' && item.estimatedCount !== null) {
      context.addIssue({
        code: 'custom',
        message: `${item.quantityType} items require estimatedCount=null`,
        path: ['estimatedCount'],
      });
    }

    if (item.quantityType !== 'LEVEL' && item.remainingLevel !== null) {
      context.addIssue({
        code: 'custom',
        message: 'remainingLevel is only valid for LEVEL items',
        path: ['remainingLevel'],
      });
    }
  });

export const SceneTypeSchema = z.enum([
  'FRIDGE_INTERIOR',
  'TABLE',
  'PANTRY',
  'SINGLE_ITEM',
  'RECEIPT',
  'UNKNOWN',
]);

export const AnalysisResponseSchema = z.object({
  detectedItems: z.array(DetectedItemSchema),
  sceneType: SceneTypeSchema,
  warnings: z.array(z.string().min(1)),
  analysisVersion: z.string().regex(/^\d+\.\d+$/u),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type DetectedItem = z.infer<typeof DetectedItemSchema>;

