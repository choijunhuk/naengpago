import { createAdminClient } from '../_shared/auth.ts';
import { apiError, corsHeaders, json } from '../_shared/http.ts';

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'POST 요청만 지원해요.', 405);
    const expectedSecret = Deno.env.get('EXPIRY_SCAN_SECRET');
    if (!expectedSecret || request.headers.get('x-cron-secret') !== expectedSecret) {
      return apiError('UNAUTHORIZED', '내부 작업 인증에 실패했어요.', 401);
    }
    const admin = createAdminClient();
    if (!admin) return apiError('SERVER_CONFIG_INVALID', '서버 설정이 필요해요.', 500);

    const now = new Date();
    const maximum = new Date(now);
    maximum.setUTCDate(maximum.getUTCDate() + 30);
    const { data: items, error: itemError } = await admin
      .from('inventory_items')
      .select('id, household_id, display_name, expiration_date')
      .is('deleted_at', null)
      .not('expiration_date', 'is', null)
      .lte('expiration_date', dateOnly(maximum));
    if (itemError) return apiError('EXPIRY_QUERY_FAILED', '유통기한 점검을 실행하지 못했어요.', 500);

    const { data: memberships, error: memberError } = await admin
      .from('household_members')
      .select('household_id, user_id');
    const { data: preferences, error: preferenceError } = await admin
      .from('user_preferences')
      .select('user_id, expiry_alert_days')
      .is('deleted_at', null);
    if (memberError || preferenceError) return apiError('EXPIRY_QUERY_FAILED', '알림 대상을 불러오지 못했어요.', 500);

    const alertDays = new Map((preferences ?? []).map((entry) => [entry.user_id, entry.expiry_alert_days]));
    const today = Date.parse(`${dateOnly(now)}T00:00:00Z`);
    const rows = [];
    for (const item of items ?? []) {
      const days = Math.round((Date.parse(`${item.expiration_date}T00:00:00Z`) - today) / 86_400_000);
      for (const member of memberships ?? []) {
        if (member.household_id !== item.household_id) continue;
        if (days > (alertDays.get(member.user_id) ?? 3)) continue;
        rows.push({
          user_id: member.user_id,
          type: days < 0 ? 'EXPIRED' : 'EXPIRY_SOON',
          payload: {
            itemId: item.id,
            displayName: item.display_name,
            expirationDate: item.expiration_date,
            dday: days,
            scanDate: dateOnly(now),
          },
        });
      }
    }

    let created = 0;
    if (rows.length > 0) {
      const { data: existing } = await admin
        .from('notifications')
        .select('user_id, type, payload')
        .gte('created_at', `${dateOnly(now)}T00:00:00Z`);
      const keys = new Set((existing ?? []).map((entry) =>
        `${entry.user_id}:${entry.type}:${entry.payload?.itemId ?? ''}`
      ));
      const newRows = rows.filter((entry) =>
        !keys.has(`${entry.user_id}:${entry.type}:${entry.payload.itemId}`)
      );
      if (newRows.length > 0) {
        const { error } = await admin.from('notifications').insert(newRows);
        if (error) return apiError('EXPIRY_INSERT_FAILED', '알림을 생성하지 못했어요.', 500);
        created = newRows.length;
      }
    }

    const { data: purgeProfiles } = await admin
      .from('profiles')
      .select('id')
      .not('deletion_scheduled_at', 'is', null)
      .lte('deletion_scheduled_at', now.toISOString());
    let purgedAccounts = 0;
    for (const profile of purgeProfiles ?? []) {
      const { data: images } = await admin
        .from('ingredient_images')
        .select('storage_path')
        .eq('uploaded_by', profile.id);
      const paths = (images ?? []).map((image) => image.storage_path);
      if (paths.length > 0) await admin.storage.from('ingredient-images').remove(paths);
      const { error } = await admin.auth.admin.deleteUser(profile.id);
      if (!error) purgedAccounts += 1;
    }

    return json({ createdNotifications: created, purgedAccounts });
  },
};
