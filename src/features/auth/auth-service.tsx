import { appEnv } from '../../lib/env';
import { supabase } from '../../lib/supabase';

export interface AuthResult {
  ok: boolean;
  requiresEmailVerification?: boolean;
  message?: string;
}

async function ensureHousehold(): Promise<void> {
  if (!supabase) return;
  const { data: existing, error: membershipError } = await supabase
    .from('household_members')
    .select('household_id')
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (existing) return;
  const { error } = await supabase.rpc('create_household_with_defaults', {
    household_name: '우리집',
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (appEnv.aiMode === 'mock' || !supabase) return { ok: true };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  try {
    await ensureHousehold();
    return { ok: true };
  } catch {
    return { ok: false, message: '우리집 저장 공간을 준비하지 못했어요.' };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  nickname: string,
): Promise<AuthResult> {
  if (appEnv.aiMode === 'mock' || !supabase) return { ok: true };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname }, emailRedirectTo: 'naengpago://auth/callback' },
  });
  if (error) return { ok: false, message: error.message };
  if (data.session) {
    try {
      await ensureHousehold();
    } catch {
      return { ok: false, message: '우리집 저장 공간을 준비하지 못했어요.' };
    }
  }
  return { ok: true, requiresEmailVerification: !data.session };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (appEnv.aiMode === 'mock' || !supabase) return { ok: true };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'naengpago://auth/reset-password',
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function signOutSession(): Promise<void> {
  if (appEnv.aiMode === 'mock' || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function deleteAccount(): Promise<string | null> {
  if (appEnv.aiMode === 'mock' || !supabase) return null;
  const { data, error } = await supabase.functions.invoke<{ scheduledPurgeAt: string }>('delete-account', {
    body: { confirmText: '회원 탈퇴' },
  });
  if (error || !data) throw error ?? new Error('회원 탈퇴를 예약하지 못했어요.');
  return data.scheduledPurgeAt;
}

export async function joinHousehold(inviteCode: string): Promise<string> {
  if (appEnv.aiMode === 'mock' || !supabase) return 'mock-household';
  const { data, error } = await supabase.rpc('join_household', {
    target_invite_code: inviteCode.trim().toUpperCase(),
  });
  if (error || !data) throw error ?? new Error('그룹에 참여하지 못했어요.');
  return data;
}
