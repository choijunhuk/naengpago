import { createAdminClient } from '../_shared/auth.ts';
import { apiError, corsHeaders, json } from '../_shared/http.ts';

const PAGE_SIZE = 500;
const DEFAULT_ALERT_DAYS = 3;

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Constant-time comparison so a wrong secret cannot be recovered by timing.
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return mismatch === 0;
}

interface ExpiringItem {
  id: string;
  household_id: string;
  display_name: string;
  expiration_date: string;
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'POST 요청만 지원해요.', 405);
    const expectedSecret = Deno.env.get('EXPIRY_SCAN_SECRET');
    const providedSecret = request.headers.get('x-cron-secret');
    if (!expectedSecret || !providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
      return apiError('UNAUTHORIZED', '내부 작업 인증에 실패했어요.', 401);
    }
    const admin = createAdminClient();
    if (!admin) return apiError('SERVER_CONFIG_INVALID', '서버 설정이 필요해요.', 500);

    const now = new Date();
    const todayStart = `${dateOnly(now)}T00:00:00Z`;
    const today = Date.parse(todayStart);
    const maximum = new Date(now);
    maximum.setUTCDate(maximum.getUTCDate() + 30);
    const maximumDate = dateOnly(maximum);

    let created = 0;
    let from = 0;

    // Page expiring items keyset-style by id, and for each batch fetch only the
    // memberships/preferences/existing notifications for the affected households
    // and users instead of loading every row into memory.
    for (;;) {
      const { data: items, error: itemError } = await admin
        .from('inventory_items')
        .select('id, household_id, display_name, expiration_date')
        .is('deleted_at', null)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', maximumDate)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (itemError) return apiError('EXPIRY_QUERY_FAILED', '유통기한 점검을 실행하지 못했어요.', 500);
      const batch = (items ?? []) as ExpiringItem[];
      if (batch.length === 0) break;

      const householdIds = Array.from(new Set(batch.map((item) => item.household_id)));
      const { data: memberships, error: memberError } = await admin
        .from('household_members')
        .select('household_id, user_id')
        .in('household_id', householdIds);
      if (memberError) return apiError('EXPIRY_QUERY_FAILED', '알림 대상을 불러오지 못했어요.', 500);

      const affectedUsers = Array.from(new Set((memberships ?? []).map((entry) => entry.user_id)));
      const { data: preferences, error: preferenceError } = affectedUsers.length > 0
        ? await admin
          .from('user_preferences')
          .select('user_id, expiry_alert_days')
          .is('deleted_at', null)
          .in('user_id', affectedUsers)
        : { data: [], error: null };
      if (preferenceError) return apiError('EXPIRY_QUERY_FAILED', '알림 대상을 불러오지 못했어요.', 500);
      const alertDays = new Map((preferences ?? []).map((entry) => [entry.user_id, entry.expiry_alert_days]));

      const membersByHousehold = new Map<string, string[]>();
      for (const member of memberships ?? []) {
        const list = membersByHousehold.get(member.household_id) ?? [];
        list.push(member.user_id);
        membersByHousehold.set(member.household_id, list);
      }

      const rows: Array<{ user_id: string; type: string; payload: Record<string, unknown> }> = [];
      for (const item of batch) {
        const days = Math.round((Date.parse(`${item.expiration_date}T00:00:00Z`) - today) / 86_400_000);
        for (const userId of membersByHousehold.get(item.household_id) ?? []) {
          if (days > (alertDays.get(userId) ?? DEFAULT_ALERT_DAYS)) continue;
          rows.push({
            user_id: userId,
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

      if (rows.length > 0) {
        const notifyUsers = Array.from(new Set(rows.map((row) => row.user_id)));
        const { data: existing } = await admin
          .from('notifications')
          .select('user_id, type, payload')
          .in('user_id', notifyUsers)
          .in('type', ['EXPIRED', 'EXPIRY_SOON'])
          .gte('created_at', todayStart);
        const keys = new Set((existing ?? []).map((entry) =>
          `${entry.user_id}:${entry.type}:${entry.payload?.itemId ?? ''}`
        ));
        const newRows = rows.filter((entry) =>
          !keys.has(`${entry.user_id}:${entry.type}:${entry.payload.itemId}`)
        );
        if (newRows.length > 0) {
          const { error } = await admin.from('notifications').insert(newRows);
          if (error) return apiError('EXPIRY_INSERT_FAILED', '알림을 생성하지 못했어요.', 500);
          created += newRows.length;
        }
      }

      if (batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Purge accounts whose 30-day window has elapsed. With the actor foreign
    // keys now set-null-on-delete, deleteUser cascades cleanly; a failure is
    // logged and skipped rather than aborting the whole run.
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
      if (error) {
        console.error('expiry-scan purge failed', { profileId: profile.id, error: error.message });
        continue;
      }
      purgedAccounts += 1;
    }

    return json({ createdNotifications: created, purgedAccounts });
  },
};
