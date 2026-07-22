# 냉파고 아키텍처

최종 갱신: 2026-07-22  
현재 단계: 0단계 — 설계 기반

## 제품 경계

냉파고는 사진 분석 결과를 재고로 바로 확정하지 않는다. AI는 편집 가능한 후보를 만들고, 사용자가 검토 화면에서 확정한 `final_payload`만 재고의 최종 진실로 저장한다. 정확한 중량처럼 사진만으로 알 수 없는 값은 `null`로 유지한다.

```text
Expo App
  ├─ Supabase Auth
  ├─ Postgres + RLS ── 재고/장보기/레시피/알림
  ├─ Private Storage ─ household UUID 경로의 압축 이미지
  └─ Edge Functions
       ├─ analyze-image ── mock fixture 또는 멀티모달 LLM
       ├─ confirm-analysis ── 사용자 확정본 원자 저장
       ├─ recommend-recipes
       ├─ deduct-inventory
       ├─ delete-account
       └─ expiry-scan
```

클라이언트는 LLM 제공자를 직접 호출하지 않는다. `AI_MODE`의 최종 결정권은 Edge Function 환경변수에 있다.

## 현재 구현된 기반

- TypeScript/Zod 분석 응답 계약과 mock fixture 3종
- light/dark 디자인 토큰과 허용 팔레트 테스트
- 19개 public 테이블, enum, 인덱스, updated-at/history 트리거
- household membership 기반 RLS와 private Storage 정책
- 가입 프로필 생성, household 기본 공간 생성, household 참여, 장보기→재고 이동 RPC
- master 362개, alias 1,532개, 대체재 10개, 레시피 91개
- pgTAP 스키마/RLS/시드 무결성 테스트

## 데이터 쓰기 원칙

### 일반 CRUD

단순 CRUD는 `supabase-js`와 사용자 JWT로 실행한다. RLS가 household 또는 개인 소유권을 검사한다. Data API의 신규 테이블 자동 노출에 기대지 않고 `authenticated` 역할에 필요한 권한만 명시적으로 부여한다.

### 원자 작업

여러 행을 함께 바꾸는 작업은 RPC 또는 Edge Function이 트랜잭션 경계를 소유한다.

- `create_household_with_defaults`: household, OWNER membership, 저장공간 4개
- `join_household`: 초대 코드 확인과 membership 추가
- `move_shopping_item_to_inventory`: 구매 항목 잠금, 재고 생성, 이동 완료 표시
- 분석 확정과 조리 차감용 내부 트랜잭션은 각각 3단계와 5단계에서 추가한다.

### 재고 이력

`inventory_items`의 생성 또는 수량·레벨·삭제 상태 변경은 `private.record_inventory_history()` 트리거를 통과한다. UI나 RPC가 `inventory_items`만 갱신하더라도 이력 행을 생략할 수 없다. 조리 기록과 구체적인 사용자 사유 연결은 5단계 RPC에서 확장한다.

## 보안 경계

- 모든 public 테이블에서 RLS를 활성화한다.
- household 접근은 `private.is_household_member()` 또는 `private.is_household_owner()`로 검사한다.
- helper는 RLS 재귀를 피하기 위해 private schema의 `SECURITY DEFINER`로 두고, 고정된 빈 `search_path`, 명시적 `auth.uid()` 인자, 제한된 `EXECUTE` 권한을 사용한다.
- 공개 RPC도 호출자를 직접 확인하고 `PUBLIC` 실행 권한을 회수한다.
- 이미지 버킷은 private이며 15 MiB, JPEG/PNG/WebP만 허용한다. 클라이언트 압축 목표는 1.5 MiB다.
- 서비스 역할과 LLM 키는 모바일 번들에 포함하지 않는다.

## 시드 생성

`scripts/seed-data.mjs`가 검토 가능한 원본 데이터이며 다음 두 표현을 결정적으로 생성한다.

1. `supabase/seed/*.csv`: 사람 검토 및 품질 도구 입력
2. `supabase/seed.sql`: `supabase db reset`이 마이그레이션 뒤 실행하는 삽입 전용 SQL

CI는 시드를 다시 생성한 뒤 Git diff가 없는지 확인한다. 레시피 재료의 master 미매핑은 테스트 실패다.

## 단계 경계

| 단계 | 책임 |
|---|---|
| 0 | DB/보안/시드/AI 계약/문서 |
| 1 | Expo Router 뼈대, 인증, 온보딩, household 생성 연결 |
| 2 | 저장공간·재고 CRUD와 QuantityEditor |
| 3 | 이미지 압축·업로드·mock/live 분석·검토·확정 |
| 4 | 레시피 매칭과 추천 UI |
| 5 | 조리 모드와 원자 차감 |
| 6 | 장보기와 알림 |
| 7 | 공유 역할, 성능, Sentry, 탈퇴, EAS 마감 |

빈 앱 디렉터리를 `.gitkeep`으로 미리 채우지 않는다. 각 단계가 실제 소유 파일과 함께 디렉터리를 생성한다.

## 현재 검증 제한

현재 Codex App 샌드박스는 Docker 소켓 접근을 차단한다. 따라서 마이그레이션과 pgTAP 테스트는 정적 계약 테스트까지 실행됐으며, 실제 `supabase db reset`, DB 타입 생성, database advisor는 Docker가 허용되는 CI 또는 로컬 셸에서 반드시 실행해야 한다.

