import { z } from 'npm:zod@4.4.3';

import { authenticateRequest } from '../_shared/auth.ts';
import { mapDbError } from '../_shared/errors.ts';
import { apiError, corsHeaders, json } from '../_shared/http.ts';

const payloadSchema = z.object({
  masterId: z.string().uuid().nullable().optional(),
  displayName: z.string().trim().min(1).max(80),
  category: z.string().min(1),
  quantityType: z.enum(['COUNTABLE', 'LEVEL', 'MEASURABLE']),
  quantity: z.number().nonnegative().nullable(),
  unit: z.string().trim().max(20).nullable(),
  remainingLevel: z.enum(['FULL', 'HIGH', 'MEDIUM', 'LOW', 'ALMOST_EMPTY', 'EMPTY']).nullable(),
  remainingPercent: z.number().int().min(0).max(100).nullable().optional(),
  storageLocationId: z.string().uuid(),
  expirationDate: z.iso.date().nullable(),
  expirationType: z.enum(['USE_BY', 'BEST_BY', 'UNKNOWN']).optional(),
});

const decisionSchema = z.object({
  candidateId: z.string().uuid(),
  action: z.enum(['CONFIRMED', 'EDITED', 'DELETED', 'MERGED_ADD', 'MERGED_REPLACE']),
  finalPayload: payloadSchema.optional(),
  mergeTargetItemId: z.string().uuid().optional(),
}).superRefine((decision, context) => {
  if (decision.action !== 'DELETED' && !decision.finalPayload) {
    context.addIssue({ code: 'custom', message: 'finalPayload is required' });
  }
  if (decision.action.startsWith('MERGED_') && !decision.mergeTargetItemId) {
    context.addIssue({ code: 'custom', message: 'mergeTargetItemId is required' });
  }
});

const requestSchema = z.object({
  analysisId: z.string().uuid(),
  decisions: z.array(decisionSchema).min(1),
  additions: z.array(payloadSchema).default([]),
});

function toDatabasePayload(payload: z.infer<typeof payloadSchema>) {
  return {
    master_id: payload.masterId ?? null,
    display_name: payload.displayName,
    category: payload.category,
    quantity_type: payload.quantityType,
    quantity: payload.quantity,
    unit: payload.unit,
    remaining_level: payload.remainingLevel,
    remaining_percent: payload.remainingPercent ?? null,
    storage_location_id: payload.storageLocationId,
    expiration_date: payload.expirationDate,
    expiration_type: payload.expirationType ?? 'UNKNOWN',
  };
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'POST 요청만 지원해요.', 405);
    const auth = await authenticateRequest(request);
    if (!auth) return apiError('UNAUTHORIZED', '로그인이 필요해요.', 401);

    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError('REQUEST_INVALID', '확정할 재료 정보를 다시 확인해 주세요.', 400, body.error.flatten());

    const decisions = body.data.decisions.map((decision) => ({
      candidate_id: decision.candidateId,
      action: decision.action,
      final_payload: decision.finalPayload ? toDatabasePayload(decision.finalPayload) : {},
      merge_target_item_id: decision.mergeTargetItemId ?? null,
    }));
    const additions = body.data.additions.map(toDatabasePayload);
    const { data, error } = await auth.client.rpc('confirm_image_analysis', {
      target_analysis_id: body.data.analysisId,
      target_decisions: decisions,
      target_additions: additions,
    });

    if (error) {
      return mapDbError(error, {
        ANALYSIS_ALREADY_CONFIRMED: { message: '이미 저장된 분석 결과예요.' },
        ANALYSIS_NOT_FOUND: { message: '분석 결과를 찾을 수 없어요.' },
        STORAGE_LOCATION_INVALID: { message: '저장 위치를 다시 선택해 주세요.' },
        MERGE_TARGET_INVALID: { message: '병합할 재고를 다시 선택해 주세요.' },
      }, { code: 'CONFIRM_FAILED', message: '재료를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', status: 500 });
    }
    return json(data);
  },
};
