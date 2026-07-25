import type {
  IngredientCategory,
  QuantityType,
  RemainingLevel,
} from '../types/domain';

export type StorageType = 'FRIDGE' | 'FREEZER' | 'KIMCHI' | 'PANTRY' | 'CUSTOM';
export type RegisteredVia =
  | 'IMAGE_AI'
  | 'MANUAL'
  | 'BARCODE'
  | 'RECEIPT_OCR'
  | 'RECIPE_USAGE'
  | 'IMPORTED';

export interface StorageLocation {
  id: string;
  name: string;
  type: StorageType;
  icon: string;
  sortOrder: number;
}

export interface InventoryItem {
  id: string;
  masterId: string | null;
  displayName: string;
  category: IngredientCategory;
  quantityType: QuantityType;
  quantity: number | null;
  unit: string | null;
  remainingLevel: RemainingLevel | null;
  remainingPercent: number | null;
  storageLocationId: string;
  expirationDate: string | null;
  registeredVia: RegisteredVia;
  imageUri: string | null;
  aiConfidence: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  masterId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional?: boolean;
  substituteMasterIds?: string[];
}

export interface Recipe {
  id: string;
  name: string;
  imageUrl: string;
  cookTimeMin: number;
  difficulty: 'EASY' | 'NORMAL' | 'HARD';
  servings: number;
  calories: number | null;
  tags: string[];
  requiredTools: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
}

export interface AnalysisCandidateInput {
  id: string;
  rawName: string;
  matchedMasterId: string | null;
  displayName: string;
  category: IngredientCategory;
  quantityType: QuantityType;
  estimatedCount: number | null;
  unit: string | null;
  remainingLevel: RemainingLevel | null;
  confidence: number;
  duplicateOfItemId: string | null;
}

export type DuplicateAction = 'ADD' | 'SEPARATE' | 'REPLACE' | 'IGNORE';

export interface ReviewCandidate extends AnalysisCandidateInput {
  selected: boolean;
  quantity: number | null;
  storageLocationId: string;
  expirationDate: string | null;
  duplicateAction: DuplicateAction;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  read: boolean;
}

export interface ShoppingItem {
  id: string;
  masterId: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
  status: 'PENDING' | 'PURCHASED';
  source: 'RECIPE' | 'MANUAL' | 'LOW_STOCK';
  sourceRecipeId: string | null;
  sourceLabel: string | null;
  movedToInventory: boolean;
}

