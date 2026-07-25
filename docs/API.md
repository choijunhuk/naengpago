# API 계약

모든 Edge Function은 사용자 JWT를 요구하고 요청 대상 household membership을 다시 확인한다. 오류는 다음 공통 형식을 사용한다.

```json
{
  "error": {
    "code": "EXPIRY_INVALID",
    "message": "사용자에게 표시할 한국어 메시지",
    "detail": null
  }
}
```

RPC 오류는 문자열 매칭이 아니라 SQLSTATE로 HTTP 상태에 매핑한다(`supabase/functions/_shared/errors.ts`). `40001`→`409`, `42501`→`403`, `P0002`→`404`, `22xxx`/`23xxx` 검증 오류→`400`, 사용자 정의 `PT429`→`429`(사진 분석 일일 한도), 그 외 예상치 못한 오류→`500`. RAISE 메시지 토큰이 응답의 `error.code`가 되며, `delete-account`의 `OWNER_TRANSFER_REQUIRED`처럼 상태를 덮어써야 하는 코드만 함수별로 오버라이드한다.

## Edge Functions

| 함수 | 요청 | 성공 응답 | 주요 오류 |
|---|---|---|---|
| `analyze-image` | `POST { imageId, storageLocationHint? }` | `{ analysisId, status, candidates[] }` | `400`, `403`, `422`, `429`, `502` |
| `confirm-analysis` | `POST { analysisId, decisions[], additions[] }` | `{ createdItemIds[], mergedItemIds[] }` | `400`, `401`, `409` |
| `recommend-recipes` | `POST { mode, householdId?, filters?, cursor? }` | `{ recipes[], nextCursor }` | `400`, `401`, `403` |
| `deduct-inventory` | `POST { householdId, recipeId?, deductions[], mode, note? }` | `{ updatedItemIds[], cookingHistoryId }` | `400`, `401`, `403`, `409` |
| `delete-account` | `POST { confirmText }` | `{ scheduledPurgeAt }` | `400`, `412` |
| `expiry-scan` | `POST`, `x-cron-secret` | `{ createdNotifications, purgedAccounts }` | 내부 작업 전용 |

### 분석 응답 불변식

- `confidence`와 bounding box 좌표는 `0..1`이다.
- bounding box는 이미지 경계를 넘을 수 없다.
- `LEVEL`, `MEASURABLE` 후보의 `estimatedCount`는 `null`이다.
- `remainingLevel`은 `LEVEL`에서만 사용할 수 있다.
- 최초 파싱 실패 시 JSON 전용 재요청을 한 번 수행하고, 재실패하면 최초 파싱 오류를 함께 남긴다(원본 오류를 삼키지 않는다).

### analyze-image 처리 순서

`analyze-image`는 LLM(또는 mock fixture)을 먼저 호출해 파싱까지 마친 뒤, 단일 RPC `ingest_image_analysis`로 소유권 확인·일일 한도·분석/후보 삽입을 한 트랜잭션에서 처리한다. 클라이언트는 `image_analyses`, `image_analysis_candidates`를 직접 쓸 수 없고 읽기만 가능하다. 저장되는 `raw_response`는 상한 크기를 넘으면 미리보기로 잘라 보관한다.

### recommend-recipes 규칙

`householdId`가 있으면 호출자 membership을 검증하고(아니면 `HOUSEHOLD_FORBIDDEN`→`403`), 없으면 `joined_at` 오름차순의 첫 household로 결정적으로 선택한다. 알레르기가 설정된 사용자에게는 안전을 기본값으로 삼는다. 알레르기 매칭은 재료 master의 조상 계층까지 따라가고, master 매핑이 없어 검증 불가한 재료가 있는 레시피는 결과에서 제외한다. 카탈로그 쿼리는 필요한 컬럼만 선택하고 상한(레시피 500)을 두며 상한 도달 시 로그를 남긴다.

## Postgres RPC

### `create_household_with_defaults(household_name text) → uuid`

인증 사용자용 household를 만들고 호출자를 OWNER로 추가한 뒤 냉장실·냉동실·김치냉장고·수납장을 한 트랜잭션에서 생성한다.

### `join_household(target_invite_code text) → uuid`

대문자 정규화된 초대 코드를 검증하고 membership을 멱등하게 추가한다.

### `move_shopping_item_to_inventory(shopping_item_id, target_storage_location_id, target_expiration_date?) → uuid`

`PURCHASED`이면서 아직 이동되지 않은 장보기 항목을 잠근다. 같은 household의 활성 저장공간인지 확인하고 재고를 만든 후 `moved_to_inventory=true`로 변경한다.

### `ingest_image_analysis(target_image_id, target_ai_mode, target_model, target_analysis_version, target_raw_response, target_items, target_storage_location_hint?, target_daily_limit?) → jsonb`

`analyze-image` 전용. 호출자의 household membership으로 이미지 접근을 확인하고, 업로더 UUID 해시에 대한 `pg_advisory_xact_lock`으로 동시 호출을 직렬화해 일일 분석 한도를 트랜잭션 내부에서 강제한다(초과 시 `PT429`→`429`). 이후 분석 행 삽입, 감지된 이름 전체에 대한 alias 일괄 매칭, 현재 재고 대비 중복 일괄 감지, 후보 일괄 삽입을 한 트랜잭션에서 수행하고 `{ analysisId, status, candidates[] }`를 반환한다. `authenticated`에 실행 권한을 부여하되 `PUBLIC`은 회수한다.

### `confirm_image_analysis(target_analysis_id, target_decisions, target_additions) → jsonb`

완료된 분석과 후보를 잠그고 후보별 사용자 결정을 기록한다. 신규 재고 생성과 기존 재고 추가·교체, `final_payload`, 재고 이력을 한 트랜잭션으로 반영한다. 이미 확정된 분석은 `409`로 수렴한다.

### `deduct_inventory_atomic(target_household_id, target_recipe_id, target_deductions, target_mode, target_note) → jsonb`

조리 이력을 먼저 만들고 차감 대상 재고를 행 잠금한다. 요청의 `expectedUpdatedAt`과 현재 값이 다르면 전체를 롤백하고 `409`를 반환한다. 성공한 변경은 `inventory_history.cooking_history_id`로 조리 이력과 연결된다.

### `schedule_account_deletion() → timestamptz`

유일 OWNER이면서 다른 구성원이 남은 household가 있으면 위임을 요구한다. 그 외에는 로그인을 차단할 soft-delete 상태와 30일 후 삭제 시각을 기록한다. 실제 Auth 사용자와 Storage 이미지는 `expiry-scan` 내부 퍼지에서 함께 삭제한다.

## 직접 쿼리

`inventory_items`, `storage_locations`, `shopping_list_items`, `notifications`, `user_preferences`, `favorite_recipes`는 `supabase-js`로 접근한다. 목록은 안정적인 정렬 키와 `range` 페이지네이션을 사용한다. master/alias/substitution/recipe 카탈로그는 authenticated read-only다.
