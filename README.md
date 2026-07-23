# 냉파고 (NaengPago)

사진 한 장으로 냉장고 속 식재료를 기록하고, 지금 보유한 재료로 만들 수 있는 요리를 추천하는 모바일 앱입니다.

현재 저장소에는 Expo SDK 57 모바일 앱, mock-first 핵심 사용자 흐름, Supabase 스키마/RLS/시드, 6개 Edge Function과 원자적 재고 RPC가 함께 들어 있습니다. 외부 키 없이도 mock 모드에서 가입→사진 분석 검토→재고 저장→추천→조리 차감→장보기 이동을 체험할 수 있고, live 분석 확정은 실제 서버 트랜잭션으로 연결됩니다.

## 빠른 시작

```bash
nvm use 22
npm install
cp .env.example .env
npx expo start
```

`.env`의 `EXPO_PUBLIC_AI_MODE=mock`을 유지하면 Supabase/LLM 키 없이 핵심 흐름을 실행할 수 있습니다.

## 검증

```bash
npm run typecheck
npm run typecheck:app
npm run lint
npm test
npm run seed:validate
npm run export:web
npx supabase start
npx supabase db reset
npx supabase test db
```

Supabase 로컬 개발에는 Docker API 호환 컨테이너 런타임이 필요합니다. `.env.example`에는 공개 가능한 예시만 포함하며 실제 비밀 키는 커밋하지 않습니다.

## 구현 범위

- Expo Router 21개 제품 화면과 한국어 정상/빈/로딩/오류 상태 컴포넌트
- Zustand 영속 mock 재고, 분석 검토 draft, 추천, 장보기, 조리 차감
- TanStack Query 포그라운드 refetch 기반과 SecureStore Supabase 세션 어댑터
- 이미지 1568px/JPEG 0.8 압축, private Storage 업로드, mock/live 분석과 live 검토 확정
- 사진 확정·조리 차감·탈퇴 예약 RPC, 서버 추천 4모드, 만료 알림/30일 계정 purge 작업
- master 362개, alias 1,532개, 레시피 91개 시드와 RLS/pgTAP 계약
- Vitest 도메인/보안/라우트 계약과 Maestro 전체 mock 흐름

실제 Supabase DB 실행, Expo 번들, 기기 권한, live LLM, EAS 서명은 현재 샌드박스 밖의 Docker·네트워크·계정 권한이 필요합니다. 남은 명령은 [외부 권한 체크리스트](docs/USER_ACTIONS.md)에 정리했습니다.

## 문서

- `docs/ARCHITECTURE.md`: 시스템 경계와 단계별 결정
- `docs/API.md`: Edge Function 및 RPC 계약
- `docs/DATA_MODEL.md`: ERD와 삭제·RLS 정책
- `docs/SCREEN_FLOW.md`: 20개 화면의 주요 이동 흐름
- `docs/USER_ACTIONS.md`: 계정·Docker·API 키가 필요한 마지막 작업
