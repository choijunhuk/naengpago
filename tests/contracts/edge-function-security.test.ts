import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(import.meta.dirname, '../../supabase/functions/analyze-image/index.ts'),
  'utf8',
);

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
});

