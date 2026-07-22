import { z } from 'npm:zod@4.4.3';

const categorySchema = z.enum(['VEGETABLE', 'FRUIT', 'MEAT', 'SEAFOOD', 'EGG_DAIRY', 'GRAIN', 'NOODLE', 'SEASONING', 'SAUCE', 'BEVERAGE', 'PROCESSED', 'FROZEN', 'BAKERY', 'OTHER']);
const detectedItemSchema = z.object({
    rawName: z.string().min(1),
    normalizedNameKo: z.string().min(1),
    category: categorySchema,
    quantityType: z.enum(['COUNTABLE', 'LEVEL', 'MEASURABLE']),
    estimatedCount: z.number().positive().nullable(),
    unit: z.string().nullable(),
    remainingLevel: z.enum(['FULL', 'HIGH', 'MEDIUM', 'LOW', 'ALMOST_EMPTY', 'EMPTY']).nullable(),
    packageInfo: z.record(z.string(), z.unknown()),
    confidence: z.number().min(0).max(1),
    boundingBox: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).refine((box) => box.x + box.width <= 1 && box.y + box.height <= 1, 'bounding box exceeds image bounds'),
    reason: z.string().min(1),
  }).superRefine((item, context) => {
    if (item.quantityType !== 'COUNTABLE' && item.estimatedCount !== null) context.addIssue({ code: 'custom', path: ['estimatedCount'], message: 'visual estimates cannot become measurable quantities' });
    if (item.quantityType !== 'LEVEL' && item.remainingLevel !== null) context.addIssue({ code: 'custom', path: ['remainingLevel'], message: 'remainingLevel is only for LEVEL items' });
  });

export const analysisResponseSchema = z.object({
  detectedItems: z.array(detectedItemSchema),
  sceneType: z.string(),
  warnings: z.array(z.string()),
  analysisVersion: z.string(),
});

export type AnalysisPayload = z.infer<typeof analysisResponseSchema>;
