import { z } from 'npm:zod@4.4.3';

import fridgeFixture from '../_shared/fixtures/fridge-interior.json' with { type: 'json' };
import { analysisResponseSchema, type AnalysisPayload } from '../_shared/analysis-schema.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { mapDbError } from '../_shared/errors.ts';
import { apiError, corsHeaders, json } from '../_shared/http.ts';

const requestSchema = z.object({
  imageId: z.string().uuid(),
  storageLocationHint: z.string().uuid().optional(),
});

// Stored raw_response is capped so a pathological LLM reply cannot bloat the row.
const RAW_RESPONSE_LIMIT = 20_000;

const systemPrompt = `You identify Korean household food ingredients from one image. Return JSON only.
Never invent exact grams or milliliters. Unknown values must be null or UNKNOWN.
MEASURABLE and LEVEL items always use estimatedCount=null. Confidence is 0..1.
Response keys: detectedItems, sceneType, warnings, analysisVersion.
Each item keys: rawName, normalizedNameKo, category, quantityType, estimatedCount, unit,
remainingLevel, packageInfo, confidence, boundingBox, reason.`;

function extractText(payload: unknown, provider: string): string {
  if (provider === 'anthropic') return ((payload as { content?: Array<{ text?: string }> }).content ?? []).map((item) => item.text ?? '').join('');
  return (payload as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? '';
}

function parseJsonOnly(text: string): unknown {
  return JSON.parse(text.replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '').trim());
}

function capRawResponse(raw: unknown): unknown {
  const text = JSON.stringify(raw ?? null);
  if (text.length <= RAW_RESPONSE_LIMIT) return raw;
  return { truncated: true, bytes: text.length, preview: text.slice(0, 2_000) };
}

async function callVision(imageUrl: string, jsonOnlyReminder = false): Promise<{ raw: unknown; parsed: AnalysisPayload }> {
  const provider = Deno.env.get('LLM_PROVIDER') ?? 'anthropic';
  const apiKey = Deno.env.get('LLM_API_KEY');
  const model = Deno.env.get('LLM_MODEL');
  if (!apiKey || !model) throw new Error('LLM secrets are not configured');
  const prompt = jsonOnlyReminder ? `${systemPrompt}\nYour previous response was invalid. JSON only.` : systemPrompt;
  const endpoint = provider === 'anthropic' ? 'https://api.anthropic.com/v1/messages' : 'https://api.openai.com/v1/chat/completions';
  const body = provider === 'anthropic'
    ? { model, max_tokens: 2500, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: imageUrl } }, { type: 'text', text: prompt }] }] }
    : { model, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: prompt }, { role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }] }] };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: provider === 'anthropic'
      ? { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      : { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const raw = await response.json();
  if (!response.ok) throw new Error(`LLM request failed with ${response.status}`);
  const parsed = analysisResponseSchema.parse(parseJsonOnly(extractText(raw, provider)));
  return { raw, parsed };
}

async function runVisionWithRetry(imageUrl: string): Promise<{ raw: unknown; parsed: AnalysisPayload }> {
  try {
    return await callVision(imageUrl);
  } catch (firstError) {
    // Retry once forcing JSON-only, but keep the original parse error attached
    // so a genuine failure is not masked by the retry's error.
    try {
      return await callVision(imageUrl, true);
    } catch (retryError) {
      const first = firstError instanceof Error ? firstError.message : String(firstError);
      const retry = retryError instanceof Error ? retryError.message : String(retryError);
      throw new Error(`vision retry failed (${retry}); original error: ${first}`);
    }
  }
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'POST 요청만 지원해요.', 405);
    const auth = await authenticateRequest(request);
    if (!auth) return apiError('UNAUTHORIZED', '로그인이 필요해요.', 401);

    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError('REQUEST_INVALID', '사진 요청 형식이 올바르지 않아요.', 400, body.error.flatten());

    const mode = (Deno.env.get('AI_MODE') ?? 'mock').toUpperCase() === 'LIVE' ? 'LIVE' : 'MOCK';
    const dailyLimit = Number(Deno.env.get('ANALYSIS_DAILY_LIMIT') ?? 30);

    // Call the LLM (or mock fixture) first so the DB write stays a single
    // transaction. Ownership and the daily limit are enforced inside the RPC.
    let payload: AnalysisPayload;
    let raw: unknown;
    try {
      if (mode === 'MOCK') {
        raw = fridgeFixture;
        payload = analysisResponseSchema.parse(fridgeFixture);
      } else {
        const { data: image, error: imageError } = await auth.client
          .from('ingredient_images')
          .select('id, storage_path')
          .eq('id', body.data.imageId)
          .is('deleted_at', null)
          .single();
        if (imageError || !image) return apiError('IMAGE_FORBIDDEN', '사진을 찾을 수 없거나 접근 권한이 없어요.', 403);
        const { data: signed, error: signedError } = await auth.client.storage
          .from('ingredient-images')
          .createSignedUrl(image.storage_path, 600);
        if (signedError || !signed) throw signedError ?? new Error('signed URL failed');
        ({ raw, parsed: payload } = await runVisionWithRetry(signed.signedUrl));
      }
    } catch (cause) {
      console.error('analyze-image vision failure', { imageId: body.data.imageId, error: cause instanceof Error ? cause.message : String(cause) });
      return apiError('AI_RESPONSE_INVALID', '사진 분석에 실패했어요. 다시 시도하거나 직접 추가할 수 있어요.', 422);
    }

    const { data, error } = await auth.client.rpc('ingest_image_analysis', {
      target_image_id: body.data.imageId,
      target_ai_mode: mode,
      target_model: mode === 'LIVE' ? Deno.env.get('LLM_MODEL') : 'fixture',
      target_analysis_version: payload.analysisVersion ?? '1.0',
      target_raw_response: capRawResponse(raw),
      target_items: payload.detectedItems,
      target_storage_location_hint: body.data.storageLocationHint ?? null,
      target_daily_limit: dailyLimit,
    });
    if (error) {
      return mapDbError(error, {
        IMAGE_FORBIDDEN: { message: '사진을 찾을 수 없거나 접근 권한이 없어요.' },
        ANALYSIS_LIMIT_EXCEEDED: { message: '오늘 사진 분석 한도를 모두 사용했어요. 직접 추가를 이용해 주세요.' },
      }, { code: 'ANALYSIS_CREATE_FAILED', message: '분석을 시작하지 못했어요.', status: 500 });
    }
    return json(data);
  },
};
