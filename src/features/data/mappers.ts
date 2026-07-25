import { subjectParticle } from '../../domain/korean';
import type {
  AppNotification,
  InventoryItem,
  Recipe,
  RecipeIngredient,
  ShoppingItem,
  StorageLocation,
} from '../../domain/models';
import type { RankedRecipe } from '../../domain/recommendation';
import type {
  IngredientCategory,
  QuantityType,
  RemainingLevel,
} from '../../types/domain';
import type { RegisteredVia, StorageType } from '../../domain/models';

export interface InventoryRow {
  id: string;
  master_id: string | null;
  display_name: string;
  category: IngredientCategory;
  quantity_type: QuantityType;
  quantity: number | string | null;
  unit: string | null;
  remaining_level: RemainingLevel | null;
  remaining_percent: number | null;
  storage_location_id: string;
  expiration_date: string | null;
  registered_via: RegisteredVia;
  image_path: string | null;
  ai_confidence: number | string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function mapInventoryRow(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    masterId: row.master_id,
    displayName: row.display_name,
    category: row.category,
    quantityType: row.quantity_type,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    remainingLevel: row.remaining_level,
    remainingPercent: row.remaining_percent,
    storageLocationId: row.storage_location_id,
    expirationDate: row.expiration_date,
    registeredVia: row.registered_via,
    imageUri: row.image_path,
    aiConfidence: row.ai_confidence === null ? null : Number(row.ai_confidence),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface StorageLocationRow {
  id: string;
  name: string;
  type: StorageType;
  icon: string;
  sort_order: number;
}

export function mapStorageLocationRow(row: StorageLocationRow): StorageLocation {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    sortOrder: row.sort_order,
  };
}

export interface ShoppingRow {
  id: string;
  master_id: string | null;
  name: string;
  quantity: number | string | null;
  unit: string | null;
  category: IngredientCategory;
  status: 'PENDING' | 'PURCHASED';
  source: 'RECIPE' | 'MANUAL' | 'LOW_STOCK';
  source_recipe_id: string | null;
  moved_to_inventory: boolean;
}

export function mapShoppingRow(row: ShoppingRow): ShoppingItem {
  return {
    id: row.id,
    masterId: row.master_id,
    name: row.name,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    category: row.category,
    status: row.status,
    source: row.source,
    sourceRecipeId: row.source_recipe_id,
    sourceLabel: null,
    movedToInventory: row.moved_to_inventory,
  };
}

interface RecipeIngredientRow {
  master_id: string;
  name_text: string;
  quantity: number | string | null;
  unit: string | null;
  is_optional: boolean;
}

export interface RecipeRow {
  id: string;
  name: string;
  image_url: string | null;
  cook_time_min: number;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  servings: number;
  calories_est: number | null;
  steps: unknown;
  tags: string[] | null;
  required_tools: string[] | null;
  recipe_ingredients?: RecipeIngredientRow[];
}

function mapIngredientRow(row: RecipeIngredientRow): RecipeIngredient {
  return {
    masterId: row.master_id,
    name: row.name_text,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    optional: row.is_optional,
  };
}

export function mapRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url ?? '',
    cookTimeMin: row.cook_time_min,
    difficulty: row.difficulty,
    servings: row.servings,
    calories: row.calories_est,
    tags: row.tags ?? [],
    requiredTools: row.required_tools ?? [],
    ingredients: (row.recipe_ingredients ?? []).map(mapIngredientRow),
    steps: Array.isArray(row.steps) ? (row.steps as string[]) : [],
  };
}

/** recommend-recipes edge function이 돌려주는 랭킹 행. */
export interface RankedRecipeRow extends RecipeRow {
  score: number;
  ownedCount: number;
  requiredCount: number;
  missing: Array<{ masterId: string; name: string }>;
  substitutions: Array<{ requiredName: string; ownedName: string }>;
  reason: string;
}

export function mapRankedRecipeRow(row: RankedRecipeRow): RankedRecipe {
  return {
    recipe: mapRecipeRow(row),
    score: row.score,
    ownedCount: row.ownedCount,
    requiredCount: row.requiredCount,
    missing: (row.missing ?? []).map((entry) => entry.name),
    substitutions: (row.substitutions ?? []).map((entry) => ({
      requiredName: entry.requiredName,
      ownedName: entry.ownedName,
    })),
    // 서버 랭킹은 임박 재료명을 별도로 돌려주지 않는다. 사유 문구가 임박 근거를 담는다.
    expiringIngredientNames: row.reason.includes('유통기한') ? ['임박 재료'] : [],
    reason: row.reason,
  };
}

export interface NotificationRow {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
}

export function mapNotificationRow(row: NotificationRow): AppNotification {
  const payload = row.payload ?? {};
  const name = typeof payload.displayName === 'string' ? payload.displayName : '재료';
  const dday = typeof payload.dday === 'number' ? payload.dday : null;
  const itemId = typeof payload.itemId === 'string' ? payload.itemId : null;
  const particle = subjectParticle(name);
  let title = '새로운 알림이 있어요';
  let body = '냉파고에서 확인해보세요.';
  let target = '/(tabs)/home';

  switch (row.type) {
    case 'EXPIRY_SOON':
      title = `${name}${particle} ${dday === 0 ? '오늘까지예요' : `D-${dday ?? '?'}예요`}`;
      body = '임박 재료 추천에서 먼저 사용할 요리를 확인해보세요.';
      if (itemId) target = `/inventory/${itemId}`;
      break;
    case 'EXPIRED':
      title = `${name}${particle} 유통기한을 지났어요`;
      body = '상태를 확인하고 재고를 정리해주세요.';
      if (itemId) target = `/inventory/${itemId}`;
      break;
    case 'LOW_STOCK':
      title = `${name}${particle} 얼마 남지 않았어요`;
      body = '필요하면 장보기 목록에 추가해두세요.';
      if (itemId) target = `/inventory/${itemId}`;
      break;
    case 'STALE_ITEM':
      title = `${name}${particle} 오래 방치되고 있어요`;
      body = '아직 쓸 수 있는지 확인해보세요.';
      if (itemId) target = `/inventory/${itemId}`;
      break;
    case 'SHOPPING_SHARED':
      title = '장보기 목록이 바뀌었어요';
      body = '가족이 공유 장보기 목록을 업데이트했어요.';
      target = '/(tabs)/shopping';
      break;
    case 'RECIPE_SUGGEST':
      title = '오늘의 추천 요리가 준비됐어요';
      body = '보유 재료로 만들 수 있는 요리를 확인해보세요.';
      target = '/(tabs)/recipes';
      break;
    default:
      break;
  }

  return { id: row.id, title, body, target, read: row.read_at !== null };
}
