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
const sharedAuth = readFileSync(
  resolve(import.meta.dirname, '../../supabase/functions/_shared/auth.ts'),
  'utf8',
);
const sharedErrors = readFileSync(
  resolve(import.meta.dirname, '../../supabase/functions/_shared/errors.ts'),
  'utf8',
);

describe('analyze-image security boundary', () => {
  it('pins the server SDK and validates the user JWT through the shared helper', () => {
    expect(sharedAuth).toContain('npm:@supabase/supabase-js@2.110.7');
    expect(sharedAuth).toContain('client.auth.getUser()');
    expect(source).toContain('authenticateRequest(request)');
  });

  it('does not expose or consume a service role key', () => {
    expect(source).not.toContain('SERVICE_ROLE');
    expect(source).not.toContain('service_role');
  });

  it('keeps live provider credentials in Deno environment variables', () => {
    expect(source).toContain("Deno.env.get('LLM_API_KEY')");
    expect(source).not.toMatch(/sk-[A-Za-z0-9]/u);
  });

  it('ingests analysis results through the atomic RPC instead of client writes', () => {
    expect(source).toContain("rpc('ingest_image_analysis'");
    // Candidate/analysis rows must never be written directly by the edge client.
    expect(source).not.toContain("from('image_analysis_candidates')");
    expect(source).not.toMatch(/from\('image_analyses'\)\s*\n?\s*\.insert/u);
  });

  it('authenticates every user-facing Edge Function', () => {
    for (const name of functionNames) {
      expect(sources.get(name), name).toContain('authenticateRequest(request)');
    }
  });

  it('routes transaction workflows through their database RPC boundary', () => {
    expect(sources.get('confirm-analysis')).toContain("rpc('confirm_image_analysis'");
    expect(sources.get('deduct-inventory')).toContain("rpc('deduct_inventory_atomic'");
    expect(sources.get('delete-account')).toContain("rpc('schedule_account_deletion'");
    // Ban outlives the 30-day purge window.
    expect(sources.get('delete-account')).toContain("ban_duration: '768h'");
  });

  it('maps database errors by SQLSTATE, not brittle message substrings', () => {
    expect(sharedErrors).toContain("'40001': 409");
    expect(sharedErrors).toContain("'42501': 403");
    expect(sharedErrors).toContain("'P0002': 404");
    expect(sharedErrors).toContain('PT429: 429');
    for (const name of ['confirm-analysis', 'deduct-inventory', 'delete-account', 'analyze-image']) {
      expect(sources.get(name), name).toContain('mapDbError(');
      expect(sources.get(name), name).not.toContain('.message.includes(');
    }
  });

  it('extends the account ban beyond the purge window and logs ban failures', () => {
    const deleteAccount = sources.get('delete-account') ?? '';
    expect(deleteAccount).toContain("ban_duration: '768h'");
    expect(deleteAccount).toContain('delete-account ban failed');
  });

  it('protects the internal expiry scan with a constant-time secret check', () => {
    const expirySource = readFileSync(
      resolve(import.meta.dirname, '../../supabase/functions/expiry-scan/index.ts'),
      'utf8',
    );

    expect(expirySource).toContain("Deno.env.get('EXPIRY_SCAN_SECRET')");
    expect(expirySource).toContain('createAdminClient()');
    expect(expirySource).toContain('timingSafeEqual');
    expect(expirySource).not.toMatch(/(?:service_role|secret)[=:]\s*['"][A-Za-z0-9_-]{16}/u);
  });
});
