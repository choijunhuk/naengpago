import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const functionNames = [
  'analyze-image',
  'confirm-analysis',
  'recommend-recipes',
  'deduct-inventory',
  'delete-account',
];
const sources = new Map(functionNames.map((name) => [
  name,
  readFileSync(resolve(import.meta.dirname, `../../supabase/functions/${name}/index.ts`), 'utf8'),
]));
const source = sources.get('analyze-image') ?? '';

describe('analyze-image security boundary', () => {
  it('pins the server SDK and validates the user JWT', () => {
    expect(source).toContain("npm:@supabase/supabase-js@2.110.7");
    expect(source).toContain('client.auth.getUser()');
  });

  it('does not expose or consume a service role key', () => {
    expect(source).not.toContain('SERVICE_ROLE');
    expect(source).not.toContain('service_role');
  });

  it('keeps live provider credentials in Deno environment variables', () => {
    expect(source).toContain("Deno.env.get('LLM_API_KEY')");
    expect(source).not.toMatch(/sk-[A-Za-z0-9]/u);
  });

  it('authenticates every user-facing Edge Function', () => {
    for (const name of functionNames.slice(1)) {
      expect(sources.get(name), name).toContain('authenticateRequest(request)');
    }
  });

  it('routes transaction workflows through their database RPC boundary', () => {
    expect(sources.get('confirm-analysis')).toContain("rpc('confirm_image_analysis'");
    expect(sources.get('deduct-inventory')).toContain("rpc('deduct_inventory_atomic'");
    expect(sources.get('delete-account')).toContain("rpc('schedule_account_deletion'");
    expect(sources.get('delete-account')).toContain("ban_duration: '720h'");
  });

  it('protects the internal expiry scan with a dedicated secret', () => {
    const expirySource = readFileSync(
      resolve(import.meta.dirname, '../../supabase/functions/expiry-scan/index.ts'),
      'utf8',
    );

    expect(expirySource).toContain("Deno.env.get('EXPIRY_SCAN_SECRET')");
    expect(expirySource).toContain('createAdminClient()');
    expect(expirySource).not.toMatch(/(?:service_role|secret)[=:]\s*['"][A-Za-z0-9_-]{16}/u);
  });
});
