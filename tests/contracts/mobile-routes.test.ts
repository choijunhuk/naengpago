import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

const requiredScreens = [
  'app/index.tsx',
  'app/(auth)/onboarding.tsx',
  'app/(auth)/signup.tsx',
  'app/(auth)/login.tsx',
  'app/(auth)/reset-password.tsx',
  'app/(tabs)/home.tsx',
  'app/(tabs)/inventory.tsx',
  'app/storage/index.tsx',
  'app/inventory/[id].tsx',
  'app/inventory/add.tsx',
  'app/capture/index.tsx',
  'app/capture/analyzing.tsx',
  'app/capture/review.tsx',
  'app/(tabs)/recipes.tsx',
  'app/recipes/[id].tsx',
  'app/recipes/cook/[id].tsx',
  'app/recipes/complete/[id].tsx',
  'app/(tabs)/shopping.tsx',
  'app/notifications.tsx',
  'app/household/index.tsx',
  'app/(tabs)/settings.tsx',
];

function resolveRelativeImport(fromFile: string, specifier: string): boolean {
  const base = resolve(dirname(fromFile), specifier);
  return ['.ts', '.tsx', '.js', '.json', '/index.ts', '/index.tsx'].some((suffix) =>
    existsSync(`${base}${suffix}`),
  );
}

describe('mobile application contract', () => {
  it('ships every required product screen as an Expo Router route', () => {
    expect(requiredScreens).toHaveLength(21);
    for (const screen of requiredScreens) expect(existsSync(join(root, screen)), screen).toBe(true);
  });

  it('has no broken relative imports in the required route files', () => {
    const failures: string[] = [];
    for (const relativePath of requiredScreens) {
      const file = join(root, relativePath);
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/gu)) {
        const specifier = match[1];
        if (specifier && !resolveRelativeImport(file, specifier)) failures.push(`${relativePath}: ${specifier}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('pins the Expo SDK and mobile state dependencies', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      main?: string;
      dependencies?: Record<string, string>;
    };
    expect(packageJson.main).toBe('expo-router/entry');
    expect(packageJson.dependencies?.expo).toBe('~57.0.7');
    expect(packageJson.dependencies?.['expo-router']).toBe('~57.0.7');
    expect(packageJson.dependencies?.['@tanstack/react-query']).toBe('5.101.3');
    expect(packageJson.dependencies?.zustand).toBe('5.0.14');
  });
});

