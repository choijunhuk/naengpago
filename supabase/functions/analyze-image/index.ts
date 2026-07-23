import { createClient } from 'npm:@supabase/supabase-js@2.110.7';
import { z } from 'npm:zod@4.4.3';

import fridgeFixture from '../_shared/fixtures/fridge-interior.json' with { type: 'json' };
import { analysisResponseSchema, type AnalysisPayload } from '../_shared/analysis-schema.ts';
import { apiError, corsHeaders, json } from '../_shared/http.ts';

const requestSchema = z.object({
  imageId: z.string().uuid(),
  storageLocationHint: z.string().uuid().optional(),
});

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

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'POST 요청만 지원해요.', 405);
    const authorization = request.headers.get('authorization');
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
    if (!authorization || !url || !key) return apiError('UNAUTHORIZED', '로그인이 필요해요.', 401);
    const client = createClient(url, key, { global: { headers: { authorization } } });
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return apiError('UNAUTHORIZED', '로그인 정보가 유효하지 않아요.', 401);
    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError('REQUEST_INVALID', '사진 요청 형식이 올바르지 않아요.', 400, body.error.flatten());

    const dailyLimit = Number(Deno.env.get('ANALYSIS_DAILY_LIMIT') ?? 30);
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: dailyCount } = await client
      .from('image_analyses')
      .select('id, ingredient_images!inner(uploaded_by)', { count: 'exact', head: true })
      .eq('ingredient_images.uploaded_by', userData.user.id)
      .gte('created_at', dayStart.toISOString());
    if ((dailyCount ?? 0) >= dailyLimit) {
      return apiError('ANALYSIS_LIMIT_EXCEEDED', '오늘 사진 분석 한도를 모두 사용했어요. 직접 추가를 이용해 주세요.', 429);
    }

    const { data: image, error: imageError } = await client
      .from('ingredient_images')
      .select('id, household_id, storage_path')
      .eq('id', body.data.imageId)
      .is('deleted_at', null)
      .single();
    if (imageError || !image) return apiError('IMAGE_FORBIDDEN', '사진을 찾을 수 없거나 접근 권한이 없어요.', 403);

    const mode = (Deno.env.get('AI_MODE') ?? 'mock').toUpperCase() === 'LIVE' ? 'LIVE' : 'MOCK';
    const { data: analysis, error: insertError } = await client
      .from('image_analyses')
      .insert({ image_id: image.id, status: 'PROCESSING', ai_mode: mode, model: mode === 'LIVE' ? Deno.env.get('LLM_MODEL') : 'fixture', analysis_version: '1.0', started_at: new Date().toISOString() })
      .select('id')
      .single();
    if (insertError || !analysis) return apiError('ANALYSIS_CREATE_FAILED', '분석을 시작하지 못했어요.', 500);

    try {
      let payload: AnalysisPayload;
      let raw: unknown;
      if (mode === 'MOCK') {
        raw = fridgeFixture;
        payload = analysisResponseSchema.parse(fridgeFixture);
      } else {
        const { data: signed, error: signedError } = await client.storage.from('ingredient-images').createSignedUrl(image.storage_path, 600);
        if (signedError || !signed) throw signedError ?? new Error('signed URL failed');
        try {
          ({ raw, parsed: payload } = await callVision(signed.signedUrl));
        } catch {
          ({ raw, parsed: payload } = await callVision(signed.signedUrl, true));
        }
      }

      const rows = [];
      for (const item of payload.detectedItems) {
        const aliases = Array.from(new Set([item.rawName, item.normalizedNameKo]));
        const { data: alias } = await client
          .from('ingredient_aliases')
          .select('master_id')
          .in('alias', aliases)
          .limit(1)
          .maybeSingle();
        let duplicateId: string | null = null;
        if (alias?.master_id) {
          let duplicateQuery = client
            .from('inventory_items')
            .select('id')
            .eq('household_id', image.household_id)
            .eq('master_id', alias.master_id)
            .is('deleted_at', null);
          if (body.data.storageLocationHint) {
            duplicateQuery = duplicateQuery.eq('storage_location_id', body.data.storageLocationHint);
          }
          const { data: duplicate } = await duplicateQuery
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          duplicateId = duplicate?.id ?? null;
        }
        rows.push({
          analysis_id: analysis.id,
          raw_name: item.rawName,
          matched_master_id: alias?.master_id ?? null,
          display_name: item.normalizedNameKo,
          category: item.category,
          quantity_type: item.quantityType,
          estimated_count: item.estimatedCount,
          unit: item.unit,
          remaining_level: item.remainingLevel,
          confidence: item.confidence,
          bounding_box: item.boundingBox,
          package_info: item.packageInfo,
          duplicate_of_item_id: duplicateId,
        });
      }
      let candidates: unknown[] = [];
      if (rows.length > 0) {
        const { data, error: candidateError } = await client
          .from('image_analysis_candidates')
          .insert(rows)
          .select('*');
        if (candidateError) throw candidateError;
        candidates = data ?? [];
      }
      await client.from('image_analyses').update({ status: 'DONE', raw_response: raw, completed_at: new Date().toISOString() }).eq('id', analysis.id);
      return json({ analysisId: analysis.id, status: 'DONE', candidates });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'unknown analysis error';
      await client.from('image_analyses').update({ status: 'FAILED', error_message: message, completed_at: new Date().toISOString() }).eq('id', analysis.id);
      return apiError('AI_RESPONSE_INVALID', '사진 분석에 실패했어요. 다시 시도하거나 직접 추가할 수 있어요.', 422);
    }
  },
};
