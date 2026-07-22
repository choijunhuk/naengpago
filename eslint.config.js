import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'coverage/**',
      'node_modules/**',
      'src/types/database.ts',
      'supabase/.branches/**',
      'supabase/.temp/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
