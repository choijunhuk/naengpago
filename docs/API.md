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

## Edge Functions

| 함수 | 요청 | 성공 응답 | 주요 오류 |
|---|---|---|---|
| `analyze-image` | `POST { imageId, storageLocationHint? }` | `{ analysisId, status, candidates[] }` | `400`, `403`, `422`, `429`, `502` |
| `confirm-analysis` | `POST { analysisId, decisions[], additions[] }` | `{ createdItemIds[], mergedItemIds[] }` | `400`, `409` |
| `recommend-recipes` | `POST { mode, filters?, cursor? }` | `{ recipes[], nextCursor }` | `400`, `403` |
| `deduct-inventory` | `POST { recipeId?, deductions[], mode }` | `{ updatedItems[], cookingHistoryId }` | `400`, `403`, `409` |
| `delete-account` | `POST { confirmText }` | `{ scheduledPurgeAt }` | `400`, `412` |
| `expiry-scan` | cron 09:00 KST | 생성된 알림 수 | 내부 작업 전용 |

### 분석 응답 불변식

- `confidence`와 bounding box 좌표는 `0..1`이다.
- bounding box는 이미지 경계를 넘을 수 없다.
- `LEVEL`, `MEASURABLE` 후보의 `estimatedCount`는 `null`이다.
- `remainingLevel`은 `LEVEL`에서만 사용할 수 있다.
- 최초 파싱 실패 시 JSON 전용 재요청을 한 번 수행하고, 재실패하면 raw 응답과 오류를 남긴다.

## Postgres RPC

### `create_household_with_defaults(household_name text) → uuid`

인증 사용자용 household를 만들고 호출자를 OWNER로 추가한 뒤 냉장실·냉동실·김치냉장고·수납장을 한 트랜잭션에서 생성한다.

### `join_household(target_invite_code text) → uuid`

대문자 정규화된 초대 코드를 검증하고 membership을 멱등하게 추가한다.

### `move_shopping_item_to_inventory(shopping_item_id, target_storage_location_id, target_expiration_date?) → uuid`

`PURCHASED`이면서 아직 이동되지 않은 장보기 항목을 잠근다. 같은 household의 활성 저장공간인지 확인하고 재고를 만든 후 `moved_to_inventory=true`로 변경한다.

## 직접 쿼리

`inventory_items`, `storage_locations`, `shopping_list_items`, `notifications`, `user_preferences`, `favorite_recipes`는 `supabase-js`로 접근한다. 목록은 안정적인 정렬 키와 `range` 페이지네이션을 사용한다. master/alias/substitution/recipe 카탈로그는 authenticated read-only다.

