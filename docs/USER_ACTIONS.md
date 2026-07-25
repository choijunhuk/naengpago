# 외부 계정·OS 권한이 필요한 마지막 체크리스트

코드와 mock 데이터만으로 핵심 앱 흐름을 체험할 수 있다. 아래 작업은 계정, 네트워크, Docker 또는 서명 권한이 필요해 자동화 환경 밖에서 한 번 수행해야 한다.

## 1. 의존성 설치와 전체 앱 검증

```bash
nvm use 22
npm install
npm run typecheck:app
npm run export:web
```

현재 실행 환경에서는 `registry.npmjs.org` DNS가 `ENOTFOUND`로 차단되어 Expo 의존성 설치와 lockfile 갱신을 실행할 수 없었다. 네트워크가 허용된 환경에서 위 명령을 한 번 실행해야 한다.

## 2. 로컬 Supabase 검증

현재 실행 환경은 설치된 Docker Desktop 앱과 사용자 Docker socket 접근을 macOS sandbox가 `Operation not permitted`로 차단한다. 일반 터미널에서 Docker Desktop이 실행된 상태로 아래 검증을 한 번 수행해야 한다.

```bash
npx supabase start
npm run db:reset
npm run db:test
npm run db:types
```

생성된 `src/types/database.ts`를 커밋하고 `npm run typecheck:app`을 다시 실행한다.

## 3. 로컬 앱 환경 변수

```bash
cp .env.example .env
```

`npx supabase status`의 API URL과 publishable/anon key를 `.env`의 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`에 넣는다. 처음에는 `EXPO_PUBLIC_AI_MODE=mock`을 유지한다.

## 4. 실기기 또는 시뮬레이터 확인

```bash
npx expo start
```

iOS Simulator 또는 Android Emulator에서 회원가입, 사진 권한, 갤러리 선택, 로컬 알림, 다크 모드를 확인한다. Maestro가 설치돼 있다면 `maestro test e2e/full-mock-flow.yaml`을 실행한다.

## 5. live AI와 배포

LLM 공급자 키를 Supabase secret으로만 설정한다.

```bash
npx supabase secrets set LLM_PROVIDER=anthropic LLM_MODEL=<사용할-모델> LLM_API_KEY=<키> AI_MODE=live ANALYSIS_DAILY_LIMIT=30 EXPIRY_SCAN_SECRET=<충분히-긴-랜덤값>
npx supabase functions deploy analyze-image confirm-analysis recommend-recipes deduct-inventory delete-account expiry-scan
```

모바일 번들의 `EXPO_PUBLIC_*` 변수에는 비밀 키를 넣지 않는다. EAS 배포 시에는 Expo 계정으로 로그인하고 `eas build:configure` 후 스토어의 실제 bundle identifier/package name, 개인정보 처리방침 URL, 앱 아이콘과 스크린샷을 확정한다.

## 6. pgTAP 행동 테스트 실행

`supabase/tests/`의 pgTAP 스위트(`001`~`006`)는 로컬 Postgres 인스턴스가 필요해 Docker가 있어야 실행할 수 있다. 현재 자동화 환경에서는 Docker 접근이 차단되어 있어 실행하지 못했고, 아래 명령을 Docker Desktop이 켜진 일반 터미널에서 한 번 수행해야 한다.

```bash
npx supabase start
npm run db:reset   # 마이그레이션 + seed.sql(카탈로그 시드) 적용
npm run db:test    # 001~006 pgTAP 스위트 실행
```

- `001_schema_contract` / `002_rls_enabled` / `003_seed_integrity`: 테이블·RLS·시드 계약.
- `004_rpc_behaviors`(27건): `create_household_with_defaults`, `join_household`, `move_shopping_item_to_inventory`, `confirm_image_analysis`, `deduct_inventory_atomic`, `schedule_account_deletion`, `ingest_image_analysis` RPC 동작과 계정 삭제 FK(set null) 검증.
- `005_rls_isolation`(16건): 다른 세대 데이터 조회·수정·삭제 차단, 후보(candidate) 직접 쓰기 차단, `inventory_history` 읽기 전용, 카탈로그 공유 읽기.
- `006_triggers`(8건): `set_updated_at`, `record_inventory_history`(CREATE/CONSUME/DISCARD), `handle_new_user` 프로비저닝·멱등성.

`004`~`006`은 카탈로그 시드(`ingredient_master`/`ingredient_aliases`/`recipes`)가 이미 로드된 상태를 전제하므로 반드시 `db:reset` 뒤에 실행한다.
