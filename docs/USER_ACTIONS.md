# 사용자 작업 체크리스트

코드와 mock 데이터만으로 핵심 앱 흐름을 체험할 수 있다. 아래 작업은 계정, 네트워크, Docker 또는 서명 권한이 필요해 자동화 환경 밖에서 한 번 수행해야 한다.

## 1. 의존성 설치와 전체 앱 검증

```bash
nvm use 24
npm install
npm run typecheck:app
npm run export:web
```

현재 Codex 샌드박스는 npm Registry DNS를 차단해 `package-lock.json`을 새 Expo 의존성으로 갱신하지 못했다. `npm install` 성공 후 변경된 lockfile을 반드시 커밋한다.

## 2. 로컬 Supabase 검증

Docker Desktop을 실행한 뒤:

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
npx supabase secrets set LLM_PROVIDER=anthropic LLM_MODEL=<사용할-모델> LLM_API_KEY=<키> AI_MODE=live
npx supabase functions deploy analyze-image
```

모바일 번들의 `EXPO_PUBLIC_*` 변수에는 비밀 키를 넣지 않는다. EAS 배포 시에는 Expo 계정으로 로그인하고 `eas build:configure` 후 스토어의 실제 bundle identifier/package name, 개인정보 처리방침 URL, 앱 아이콘과 스크린샷을 확정한다.

