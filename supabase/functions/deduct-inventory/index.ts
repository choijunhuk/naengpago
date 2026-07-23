import { z } from 'npm:zod@4.4.3';

import { authenticateRequest } from '../_shared/auth.ts';
import { apiError, corsHeaders, json } from '../_shared/http.ts';

const requestSchema = z.object({
  householdId: z.string().uuid(),
  recipeId: z.string().uuid().nullable().optional(),
  deductions: z.array(z.object({
    itemId: z.string().uuid(),
    quantityDelta: z.number().nonnegative().optional(),
    levelTo: z.enum(['FULL', 'HIGH', 'MEDIUM', 'LOW', 'ALMOST_EMPTY', 'EMPTY']).optional(),
    expectedUpdatedAt: z.iso.datetime().optional(),
  }).refine((value) => (value.quantityDelta === undefined) !== (value.levelTo === undefined), {
    message: 'quantityDelta 또는 levelTo 중 하나만 필요해요.',
  })),
  mode: z.enum(['AUTO', 'CONFIRMED', 'MANUAL', 'SKIPPED']),
  note: z.string().trim().max(500).nullable().optional(),
});

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'POST 요청만 지원해요.', 405);
    const auth = await authenticateRequest(request);
    if (!auth) return apiError('UNAUTHORIZED', '로그인이 필요해요.', 401);

    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError('REQUEST_INVALID', '차감 정보를 다시 확인해 주세요.', 400, body.error.flatten());

    const { data, error } = await auth.client.rpc('deduct_inventory_atomic', {
      target_household_id: body.data.householdId,
      target_recipe_id: body.data.recipeId ?? null,
      target_deductions: body.data.deductions.map((deduction) => ({
        item_id: deduction.itemId,
        quantity_delta: deduction.quantityDelta ?? null,
        level_to: deduction.levelTo ?? null,
        expected_updated_at: deduction.expectedUpdatedAt ?? null,
      })),
      target_mode: body.data.mode,
      target_note: body.data.note ?? null,
    });
    if (error?.message.includes('INVENTORY_CONFLICT')) {
      return apiError('INVENTORY_CONFLICT', '다른 구성원이 재고를 먼저 수정했어요. 최신 값으로 다시 확인해 주세요.', 409);
    }
    if (error?.code === '42501') return apiError('HOUSEHOLD_FORBIDDEN', '이 household에 접근할 수 없어요.', 403);
    if (error) return apiError('DEDUCTION_FAILED', '재고 차감을 적용하지 못했어요.', 400);
    return json(data);
  },
};
