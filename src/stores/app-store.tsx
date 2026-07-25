import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { decreaseLevel, resolveDeduction } from '../domain/inventory';
import {
  mockAnalysisItems,
  mockInventory,
  mockRecipes,
  mockShoppingItems,
  mockStorageLocations,
} from '../domain/mock-data';
import type {
  AnalysisCandidateInput,
  AppNotification,
  InventoryItem,
  ReviewCandidate,
  ShoppingItem,
  StorageLocation,
} from '../domain/models';
import { confirmReviewDraft, createReviewDraft } from '../domain/review';
import type { IngredientCategory, QuantityType, RemainingLevel } from '../types/domain';

interface SessionUser {
  id: string;
  email: string;
  nickname: string;
}

interface AddInventoryInput {
  displayName: string;
  category: IngredientCategory;
  quantityType: QuantityType;
  quantity: number | null;
  unit: string | null;
  remainingLevel: RemainingLevel | null;
  storageLocationId: string;
  expirationDate: string | null;
}

interface AppStore {
  hydrated: boolean;
  hasOnboarded: boolean;
  session: SessionUser | null;
  theme: 'SYSTEM' | 'LIGHT' | 'DARK';
  inventory: InventoryItem[];
  storageLocations: StorageLocation[];
  reviewAnalysisId: string | null;
  reviewDraft: ReviewCandidate[];
  shoppingItems: ShoppingItem[];
  favoriteRecipeIds: string[];
  notifications: AppNotification[];
  likedTags: string[];
  ownedTools: string[];
  setHydrated: (hydrated: boolean) => void;
  finishOnboarding: () => void;
  signInDemo: (email: string, nickname?: string) => void;
  signInLive: (user: SessionUser) => void;
  signOut: () => void;
  setTheme: (theme: AppStore['theme']) => void;
  addInventory: (input: AddInventoryInput) => string;
  updateInventory: (id: string, patch: Partial<InventoryItem>) => void;
  consumeInventory: (id: string, amount?: number) => void;
  deleteInventory: (id: string) => void;
  addStorageLocation: (name: string) => void;
  resetReviewDraft: (storageLocationId?: string) => void;
  setReviewCandidates: (candidates: AnalysisCandidateInput[], storageLocationId?: string, analysisId?: string) => void;
  updateReviewCandidate: (id: string, patch: Partial<ReviewCandidate>) => void;
  confirmReview: () => number;
  toggleFavorite: (recipeId: string) => void;
  addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'status' | 'movedToInventory'>) => void;
  toggleShoppingPurchased: (id: string) => void;
  moveShoppingToInventory: (id: string, storageLocationId: string) => void;
  completeCooking: (recipeId: string) => void;
  markNotificationRead: (id: string) => void;
}

const initialReviewDraft = createReviewDraft(mockAnalysisItems, 'storage-fridge');

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      hasOnboarded: false,
      session: null,
      theme: 'SYSTEM',
      inventory: mockInventory,
      storageLocations: mockStorageLocations,
      reviewAnalysisId: null,
      reviewDraft: initialReviewDraft,
      shoppingItems: mockShoppingItems,
      favoriteRecipeIds: [],
      notifications: [
        { id: 'notification-tofu', title: '두부가 D-2예요', body: '오늘 된장찌개로 먼저 사용해보세요.', target: '/inventory/inventory-tofu', read: false },
        { id: 'notification-shopping', title: '장보기 목록이 바뀌었어요', body: '청양고추가 목록에 추가됐어요.', target: '/(tabs)/shopping', read: false },
      ],
      likedTags: ['한식', '국물'],
      ownedTools: ['냄비', '프라이팬'],
      setHydrated: (hydrated) => set({ hydrated }),
      finishOnboarding: () => set({ hasOnboarded: true }),
      signInDemo: (email, nickname = '냉파고 사용자') =>
        set({ session: { id: 'user-demo', email, nickname }, hasOnboarded: true }),
      signInLive: (user) => set({ session: user, hasOnboarded: true }),
      signOut: () => set({ session: null }),
      setTheme: (theme) => set({ theme }),
      addInventory: (input) => {
        const id = `inventory-manual-${Date.now()}`;
        const now = new Date().toISOString();
        set((state) => ({
          inventory: [
            {
              id,
              masterId: null,
              ...input,
              remainingPercent: null,
              registeredVia: 'MANUAL',
              imageUri: null,
              aiConfidence: null,
              createdBy: state.session?.id ?? 'user-demo',
              createdAt: now,
              updatedAt: now,
            },
            ...state.inventory,
          ],
        }));
        return id;
      },
      updateInventory: (id, patch) =>
        set((state) => ({
          inventory: state.inventory.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
          ),
        })),
      consumeInventory: (id, amount = 1) =>
        set((state) => ({
          inventory: state.inventory.map((item) => {
            if (item.id !== id) return item;
            if (item.quantityType === 'LEVEL' && item.remainingLevel) {
              return { ...item, remainingLevel: decreaseLevel(item.remainingLevel), updatedAt: new Date().toISOString() };
            }
            const deduction = resolveDeduction(item, amount);
            return { ...item, quantity: deduction.quantity, updatedAt: new Date().toISOString() };
          }),
        })),
      deleteInventory: (id) => set((state) => ({ inventory: state.inventory.filter((item) => item.id !== id) })),
      addStorageLocation: (name) =>
        set((state) => ({
          storageLocations: [
            ...state.storageLocations,
            { id: `storage-${Date.now()}`, name, type: 'CUSTOM', icon: 'archive', sortOrder: state.storageLocations.length },
          ],
        })),
      resetReviewDraft: (storageLocationId = 'storage-fridge') =>
        set({ reviewAnalysisId: null, reviewDraft: createReviewDraft(mockAnalysisItems, storageLocationId) }),
      setReviewCandidates: (candidates, storageLocationId = 'storage-fridge', analysisId) =>
        set({ reviewAnalysisId: analysisId ?? null, reviewDraft: createReviewDraft(candidates, storageLocationId) }),
      updateReviewCandidate: (id, patch) =>
        set((state) => ({
          reviewDraft: state.reviewDraft.map((candidate) =>
            candidate.id === id ? { ...candidate, ...patch } : candidate,
          ),
        })),
      confirmReview: () => {
        const state = get();
        const result = confirmReviewDraft(state.reviewDraft, state.inventory, state.session?.id ?? 'user-demo');
        const updatedIds = new Set(result.updated.map((item) => item.id));
        set({
          inventory: [
            ...result.created,
            ...state.inventory.map((item) => result.updated.find((updated) => updated.id === item.id) ?? item),
          ],
          reviewAnalysisId: null,
          reviewDraft: initialReviewDraft,
          notifications: [
            { id: `notification-analysis-${Date.now()}`, title: '사진 등록이 끝났어요', body: `${result.created.length + result.updated.length}개 재료를 반영했어요.`, target: '/(tabs)/inventory', read: false },
            ...state.notifications,
          ],
        });
        return result.created.length + updatedIds.size;
      },
      toggleFavorite: (recipeId) =>
        set((state) => ({
          favoriteRecipeIds: state.favoriteRecipeIds.includes(recipeId)
            ? state.favoriteRecipeIds.filter((id) => id !== recipeId)
            : [...state.favoriteRecipeIds, recipeId],
        })),
      addShoppingItem: (item) =>
        set((state) => {
          if (state.shoppingItems.some((entry) => entry.name === item.name && entry.status === 'PENDING')) return state;
          return {
            shoppingItems: [
              ...state.shoppingItems,
              { ...item, id: `shopping-${Date.now()}`, status: 'PENDING', movedToInventory: false },
            ],
          };
        }),
      toggleShoppingPurchased: (id) =>
        set((state) => ({
          shoppingItems: state.shoppingItems.map((item) =>
            item.id === id ? { ...item, status: item.status === 'PENDING' ? 'PURCHASED' : 'PENDING' } : item,
          ),
        })),
      moveShoppingToInventory: (id, storageLocationId) => {
        const item = get().shoppingItems.find((entry) => entry.id === id);
        if (!item || item.movedToInventory) return;
        const quantityType: QuantityType =
          item.unit === 'g' || item.unit === 'ml' ? 'MEASURABLE' : 'COUNTABLE';
        get().addInventory({
          displayName: item.name,
          category: item.category,
          quantityType,
          quantity: item.quantity ?? 1,
          unit: item.unit,
          remainingLevel: null,
          storageLocationId,
          expirationDate: null,
        });
        set((state) => ({
          shoppingItems: state.shoppingItems.map((entry) =>
            entry.id === id ? { ...entry, status: 'PURCHASED', movedToInventory: true } : entry,
          ),
        }));
      },
      completeCooking: (recipeId) => {
        const recipe = mockRecipes.find((entry) => entry.id === recipeId);
        if (!recipe) return;
        for (const ingredient of recipe.ingredients.filter((entry) => !entry.optional)) {
          const item = get().inventory.find((entry) =>
            entry.masterId === ingredient.masterId || ingredient.substituteMasterIds?.includes(entry.masterId ?? ''),
          );
          if (item) get().consumeInventory(item.id, ingredient.quantity ?? 1);
        }
      },
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) => (item.id === id ? { ...item, read: true } : item)),
        })),
    }),
    {
      name: 'naengpago-app-state-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasOnboarded: state.hasOnboarded,
        session: state.session,
        theme: state.theme,
        inventory: state.inventory,
        storageLocations: state.storageLocations,
        shoppingItems: state.shoppingItems,
        favoriteRecipeIds: state.favoriteRecipeIds,
        notifications: state.notifications,
        likedTags: state.likedTags,
        ownedTools: state.ownedTools,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
