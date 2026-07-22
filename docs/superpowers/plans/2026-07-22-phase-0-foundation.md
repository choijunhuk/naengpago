# NaengPago Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reproducible, security-first foundation for NaengPago with a validated Supabase schema, seed corpus, AI analysis contract, design tokens, and architecture documentation.

**Architecture:** Use imperative, timestamped Supabase migrations as the single database history and generate `supabase/seed.sql` from reviewable source datasets. Keep the mobile app out of Phase 0 while defining shared TypeScript contracts that Phase 1 and Edge Functions will consume.

**Tech Stack:** TypeScript 5.9, Vitest 4, ESLint 10, Zod 4, Supabase CLI 2.109/Postgres, Node.js 20-25.

## Global Constraints

- The client never calls an LLM directly; live and mock AI modes branch only in an Edge Function.
- Every exposed user-data table has RLS enabled and an ownership or household-membership predicate.
- User-confirmed `final_payload` is never overwritten by an AI response.
- Unknown image-derived values remain `null` or `UNKNOWN`; AI must not invent exact weights.
- No secret or service-role key is committed. `EXPO_PUBLIC_*` values are treated as public.
- Inventory quantity or level changes always produce an `inventory_history` row.
- Phase 0 contains no Expo screens; the app scaffold belongs to Phase 1.

---

### Task 1: Repository and executable quality gates

**Files:**
- Create: `.gitignore`, `.env.example`, `package.json`, `package-lock.json`
- Create: `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `README.md`

**Interfaces:**
- Produces: `npm run typecheck`, `npm run lint`, `npm test`, `npm run seed:validate`

- [x] Pin the Phase 0 toolchain and create the independent feature branch.
- [ ] Install dependencies and verify the empty TypeScript/test baseline.
- [ ] Commit the repository bootstrap using Lore trailers.

### Task 2: AI and design contracts with TDD

**Files:**
- Create: `tests/contracts/analysis-fixtures.test.ts`
- Create: `tests/contracts/theme-tokens.test.ts`
- Create: `src/types/domain.ts`, `src/types/analysis.ts`, `src/theme/tokens.ts`
- Create: `supabase/functions/_shared/fixtures/*.json`

**Interfaces:**
- Produces: `AnalysisResponseSchema`, `DetectedItemSchema`, `themeTokens`

- [ ] Write contract tests and verify they fail because implementations are absent.
- [ ] Implement the minimum schemas, enums, tokens, and three fixtures.
- [ ] Run targeted tests and then the full TypeScript/lint suite.

### Task 3: Database schema, history guarantees, and RLS

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202607220001_extensions_enums.sql`
- Create: `supabase/migrations/202607220002_accounts_households.sql`
- Create: `supabase/migrations/202607220003_ingredients_inventory.sql`
- Create: `supabase/migrations/202607220004_image_analysis.sql`
- Create: `supabase/migrations/202607220005_recipes_cooking.sql`
- Create: `supabase/migrations/202607220006_shopping_notifications.sql`
- Create: `supabase/migrations/202607220007_triggers_indexes.sql`
- Create: `supabase/migrations/202607220008_rls_storage_policies.sql`
- Test: `supabase/tests/001_schema_contract.sql`, `002_rls_enabled.sql`

**Interfaces:**
- Produces: all Phase 0 public tables/enums, `set_updated_at()`, inventory history trigger, household RLS helper.

- [ ] Write SQL contract tests before implementing tables and policies.
- [ ] Create migrations in dependency order with explicit checks and foreign keys.
- [ ] Reset the local database and run pgTAP tests.
- [ ] Run Supabase database advisors when the local CLI supports it.

### Task 4: Seed corpus and integrity validator

**Files:**
- Create: `supabase/seed/*.csv`, `supabase/seed.sql`
- Create: `scripts/generate-seed-sql.mjs`, `scripts/validate-seed.mjs`
- Test: `tests/seed/validate-seed.test.ts`, `supabase/tests/003_seed_integrity.sql`

**Interfaces:**
- Produces: 300+ ingredient masters, 1,000+ aliases, substitutions, 80+ Korean recipes with zero unmapped recipe ingredients.

- [ ] Write failing validator tests for counts, duplicate aliases, broken references, and unmapped recipe ingredients.
- [ ] Build deterministic source data and SQL generation without adding a CSV dependency.
- [ ] Generate `seed.sql`, validate source and generated data, then reset the database.
- [ ] Record a ten-item-per-category manual review in `docs/SEED_REVIEW.md`.

### Task 5: Documentation, generated DB types, and CI

**Files:**
- Create: `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATA_MODEL.md`, `docs/SCREEN_FLOW.md`
- Create: `src/types/database.ts` from the local database
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: architecture SSOT, API contract, ERD, screen flow, generated TypeScript database types, Phase 0 CI.

- [ ] Document implemented boundaries and explicitly defer Expo UI to Phase 1.
- [ ] Generate database types from the reset local database.
- [ ] Configure CI to run typecheck, lint, unit/contract tests, seed validation, database reset, and database tests.
- [ ] Run all quality gates and `git diff --check` from a clean install.
- [ ] Commit with Lore protocol and report exact validation gaps before advancing automatically.

