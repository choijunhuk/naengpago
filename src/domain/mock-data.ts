import type {
  AnalysisCandidateInput,
  InventoryItem,
  Recipe,
  ShoppingItem,
  StorageLocation,
} from './models';

export const mockStorageLocations: StorageLocation[] = [
  { id: 'storage-fridge', name: '냉장실', type: 'FRIDGE', icon: 'snowflake', sortOrder: 0 },
  { id: 'storage-freezer', name: '냉동실', type: 'FREEZER', icon: 'snowflake', sortOrder: 1 },
  { id: 'storage-kimchi', name: '김치냉장고', type: 'KIMCHI', icon: 'container', sortOrder: 2 },
  { id: 'storage-pantry', name: '수납장', type: 'PANTRY', icon: 'archive', sortOrder: 3 },
];

const inventoryBase = {
  createdBy: 'user-demo',
  createdAt: '2026-07-20T09:00:00+09:00',
  updatedAt: '2026-07-20T09:00:00+09:00',
  imageUri: null,
} as const;

export const mockInventory: InventoryItem[] = [
  {
    ...inventoryBase,
    id: 'inventory-tofu', masterId: 'master-tofu', displayName: '두부', category: 'PROCESSED',
    quantityType: 'COUNTABLE', quantity: 1, unit: '모', remainingLevel: null, remainingPercent: null,
    storageLocationId: 'storage-fridge', expirationDate: '2026-07-24', registeredVia: 'MANUAL', aiConfidence: null,
  },
  {
    ...inventoryBase,
    id: 'inventory-zucchini', masterId: 'master-zucchini', displayName: '애호박', category: 'VEGETABLE',
    quantityType: 'COUNTABLE', quantity: 1, unit: '개', remainingLevel: null, remainingPercent: null,
    storageLocationId: 'storage-fridge', expirationDate: '2026-07-25', registeredVia: 'IMAGE_AI', aiConfidence: 0.88,
  },
  {
    ...inventoryBase,
    id: 'inventory-milk', masterId: 'master-milk', displayName: '우유', category: 'EGG_DAIRY',
    quantityType: 'COUNTABLE', quantity: 1, unit: '팩', remainingLevel: null, remainingPercent: null,
    storageLocationId: 'storage-fridge', expirationDate: '2026-07-29', registeredVia: 'IMAGE_AI', aiConfidence: 0.95,
  },
  {
    ...inventoryBase,
    id: 'inventory-egg', masterId: 'master-egg', displayName: '달걀', category: 'EGG_DAIRY',
    quantityType: 'COUNTABLE', quantity: 6, unit: '개', remainingLevel: null, remainingPercent: null,
    storageLocationId: 'storage-fridge', expirationDate: '2026-08-02', registeredVia: 'IMAGE_AI', aiConfidence: 0.93,
  },
  {
    ...inventoryBase,
    id: 'inventory-green-onion', masterId: 'master-green-onion', displayName: '대파', category: 'VEGETABLE',
    quantityType: 'LEVEL', quantity: null, unit: '단', remainingLevel: 'MEDIUM', remainingPercent: 50,
    storageLocationId: 'storage-fridge', expirationDate: '2026-07-28', registeredVia: 'MANUAL', aiConfidence: null,
  },
  {
    ...inventoryBase,
    id: 'inventory-doenjang', masterId: 'master-doenjang', displayName: '된장', category: 'SAUCE',
    quantityType: 'LEVEL', quantity: null, unit: null, remainingLevel: 'HIGH', remainingPercent: 75,
    storageLocationId: 'storage-fridge', expirationDate: null, registeredVia: 'MANUAL', aiConfidence: null,
  },
  {
    ...inventoryBase,
    id: 'inventory-rice', masterId: 'master-rice', displayName: '밥', category: 'GRAIN',
    quantityType: 'COUNTABLE', quantity: 2, unit: '공기', remainingLevel: null, remainingPercent: null,
    storageLocationId: 'storage-freezer', expirationDate: null, registeredVia: 'MANUAL', aiConfidence: null,
  },
  {
    ...inventoryBase,
    id: 'inventory-pasta', masterId: 'master-pasta-noodle', displayName: '파스타면', category: 'NOODLE',
    quantityType: 'MEASURABLE', quantity: 400, unit: 'g', remainingLevel: null, remainingPercent: null,
    storageLocationId: 'storage-pantry', expirationDate: '2027-02-01', registeredVia: 'MANUAL', aiConfidence: null,
  },
  {
    ...inventoryBase,
    id: 'inventory-tomato-sauce', masterId: 'master-tomato-sauce', displayName: '토마토소스', category: 'SAUCE',
    quantityType: 'LEVEL', quantity: null, unit: null, remainingLevel: 'MEDIUM', remainingPercent: 50,
    storageLocationId: 'storage-pantry', expirationDate: '2026-09-10', registeredVia: 'MANUAL', aiConfidence: null,
  },
];

export const mockAnalysisItems: AnalysisCandidateInput[] = [
  {
    id: 'candidate-egg', rawName: 'egg', matchedMasterId: 'master-egg', displayName: '달걀',
    category: 'EGG_DAIRY', quantityType: 'COUNTABLE', estimatedCount: 6, unit: '개',
    remainingLevel: null, confidence: 0.93, duplicateOfItemId: 'inventory-egg',
  },
  {
    id: 'candidate-milk', rawName: 'milk carton', matchedMasterId: 'master-milk', displayName: '우유',
    category: 'EGG_DAIRY', quantityType: 'COUNTABLE', estimatedCount: 1, unit: '팩',
    remainingLevel: null, confidence: 0.95, duplicateOfItemId: 'inventory-milk',
  },
  {
    id: 'candidate-pork', rawName: 'pork belly pack', matchedMasterId: 'master-pork-belly', displayName: '삼겹살',
    category: 'MEAT', quantityType: 'COUNTABLE', estimatedCount: 1, unit: '팩',
    remainingLevel: null, confidence: 0.81, duplicateOfItemId: null,
  },
  {
    id: 'candidate-uncertain', rawName: 'green bundle', matchedMasterId: null, displayName: '채소 묶음',
    category: 'VEGETABLE', quantityType: 'LEVEL', estimatedCount: null, unit: '단',
    remainingLevel: 'HIGH', confidence: 0.42, duplicateOfItemId: null,
  },
];

export const mockRecipes: Recipe[] = [
  {
    id: 'recipe-doenjang-stew', name: '두부 애호박 된장찌개',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
    cookTimeMin: 20, difficulty: 'EASY', servings: 2, calories: 310,
    tags: ['한식', '국물', '집밥'], requiredTools: ['냄비'],
    ingredients: [
      { masterId: 'master-tofu', name: '두부', quantity: 1, unit: '모' },
      { masterId: 'master-zucchini', name: '애호박', quantity: 1, unit: '개' },
      { masterId: 'master-doenjang', name: '된장', quantity: 2, unit: '큰술' },
      { masterId: 'master-green-onion', name: '대파', quantity: 0.5, unit: '대' },
      { masterId: 'master-chili', name: '청양고추', quantity: 1, unit: '개', optional: true },
    ],
    steps: ['냄비에 물 500ml를 끓여요.', '된장을 풀고 애호박을 5분 끓여요.', '두부와 대파를 넣고 5분 더 끓여 마무리해요.'],
  },
  {
    id: 'recipe-egg-rice', name: '대파 달걀볶음밥',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80',
    cookTimeMin: 15, difficulty: 'EASY', servings: 1, calories: 520,
    tags: ['한식', '한그릇', '15분'], requiredTools: ['프라이팬'],
    ingredients: [
      { masterId: 'master-egg', name: '달걀', quantity: 2, unit: '개' },
      { masterId: 'master-rice', name: '밥', quantity: 1, unit: '공기' },
      { masterId: 'master-green-onion', name: '대파', quantity: 0.3, unit: '대' },
    ],
    steps: ['대파를 잘게 썰어요.', '달걀을 먼저 볶고 밥을 넣어요.', '대파를 넣어 센 불에 2분 볶아요.'],
  },
  {
    id: 'recipe-tomato-pasta', name: '토마토 파스타',
    imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
    cookTimeMin: 25, difficulty: 'NORMAL', servings: 2, calories: 640,
    tags: ['양식', '면'], requiredTools: ['냄비', '프라이팬'],
    ingredients: [
      { masterId: 'master-spaghetti', name: '스파게티면', quantity: 200, unit: 'g', substituteMasterIds: ['master-pasta-noodle'] },
      { masterId: 'master-tomato-sauce', name: '토마토소스', quantity: 1, unit: '컵' },
      { masterId: 'master-garlic', name: '마늘', quantity: 2, unit: '쪽' },
    ],
    steps: ['면을 포장 시간보다 1분 짧게 삶아요.', '마늘을 볶고 토마토소스를 데워요.', '면과 면수 반 컵을 넣어 섞어요.'],
  },
  {
    id: 'recipe-tofu-pan', name: '두부 달걀부침',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
    cookTimeMin: 15, difficulty: 'EASY', servings: 2, calories: 360,
    tags: ['한식', '반찬', '15분'], requiredTools: ['프라이팬'],
    ingredients: [
      { masterId: 'master-tofu', name: '두부', quantity: 1, unit: '모' },
      { masterId: 'master-egg', name: '달걀', quantity: 1, unit: '개' },
    ],
    steps: ['두부의 물기를 닦고 먹기 좋게 썰어요.', '달걀물을 입혀 중약불에서 앞뒤로 구워요.'],
  },
];

export const mockShoppingItems: ShoppingItem[] = [
  {
    id: 'shopping-chili', masterId: 'master-chili', name: '청양고추', quantity: 1, unit: '봉',
    category: 'VEGETABLE', status: 'PENDING', source: 'RECIPE', sourceRecipeId: 'recipe-doenjang-stew',
    sourceLabel: '두부 애호박 된장찌개', movedToInventory: false,
  },
];

