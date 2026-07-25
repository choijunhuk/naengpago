import { z } from 'npm:zod@4.4.3';

import { authenticateRequest, createAdminClient } from '../_shared/auth.ts';
import { mapDbError } from '../_shared/errors.ts';
import { apiError, corsHeaders, json } from '../_shared/http.ts';

const requestSchema = z.object({
  confirmText: z.literal('회원 탈퇴'),
});

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'POST 요청만 지원해요.', 405);
    const auth = await authenticateRequest(request);
    if (!auth) return apiError('UNAUTHORIZED', '로그인이 필요해요.', 401);
    const admin = createAdminClient();
    if (!admin) return apiError('SERVER_CONFIG_INVALID', '서버 설정이 필요해요.', 500);

    const body = requestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError('CONFIRM_TEXT_INVALID', '확인 문구로 “회원 탈퇴”를 입력해 주세요.', 400);

    // The RPC is the transactional source of truth: soft-delete and purge
    // schedule happen atomically here first.
    const { data, error } = await auth.client.rpc('schedule_account_deletion');
    if (error) {
      return mapDbError(error, {
        OWNER_TRANSFER_REQUIRED: { status: 412, message: '다른 구성원에게 OWNER를 위임한 뒤 탈퇴해 주세요.' },
      }, { code: 'ACCOUNT_DELETE_FAILED', message: '탈퇴 예약을 완료하지 못했어요.', status: 500 });
    }

    // Ban outlives the 30-day purge window (32 days). A ban failure must not
    // undo the scheduled deletion, so we log loudly and still sign the user out.
    const { error: banError } = await admin.auth.admin.updateUserById(auth.userId, {
      ban_duration: '768h',
    });
    if (banError) {
      console.error('delete-account ban failed', { userId: auth.userId, error: banError.message });
    }
    await auth.client.auth.signOut({ scope: 'global' });
    return json({ scheduledPurgeAt: data });
  },
};
