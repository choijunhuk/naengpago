import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.7';

export interface AuthenticatedContext {
  client: SupabaseClient;
  userId: string;
}

export async function authenticateRequest(request: Request): Promise<AuthenticatedContext | null> {
  const authorization = request.headers.get('authorization');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !url || !key) return null;

  const client = createClient(url, key, {
    global: { headers: { authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, userId: data.user.id };
}

export function createAdminClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
