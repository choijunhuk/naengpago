# 냉파고 (NaengPago)

사진 한 장으로 냉장고 속 식재료를 기록하고, 지금 보유한 재료로 만들 수 있는 요리를 추천하는 모바일 앱입니다.

현재 저장소는 0단계 설계 기반을 구축하고 있습니다. 앱 실행 방법은 1단계 Expo 뼈대가 추가된 뒤 갱신합니다.

## 0단계 로컬 검증

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run seed:validate
npx supabase start
npx supabase db reset
npx supabase test db
```

Supabase 로컬 개발에는 Docker API 호환 컨테이너 런타임이 필요합니다. `.env.example`에는 공개 가능한 예시만 포함하며 실제 비밀 키는 커밋하지 않습니다.

## 문서

- `docs/ARCHITECTURE.md`: 시스템 경계와 단계별 결정
- `docs/API.md`: Edge Function 및 RPC 계약
- `docs/DATA_MODEL.md`: ERD와 삭제·RLS 정책
- `docs/SCREEN_FLOW.md`: 20개 화면의 주요 이동 흐름

