import { appEnv } from '../../lib/env';
import { supabase } from '../../lib/supabase';

export interface AuthResult {
  ok: boolean;
  requiresEmailVerification?: boolean;
  message?: string;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (appEnv.aiMode === 'mock' || !supabase) return { ok: true };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: error.message } : { ok: true };
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
  return { ok: true, requiresEmailVerification: !data.session };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  if (appEnv.aiMode === 'mock' || !supabase) return { ok: true };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'naengpago://auth/reset-password',
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}

