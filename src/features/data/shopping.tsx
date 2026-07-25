import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ShoppingItem } from '../../domain/models';
import { useAppStore } from '../../stores/app-store';
import { useHouseholdQuery } from './household';
import { isLiveData, mockResult, queryKeys, requireClient, type QueryResult } from './internal';
import { mapShoppingRow, type ShoppingRow } from './mappers';

const SHOPPING_COLUMNS =
  'id, master_id, name, quantity, unit, category, status, source, source_recipe_id, moved_to_inventory';

async function fetchShopping(householdId: string): Promise<ShoppingItem[]> {
  const db = requireClient();
  const { data, error } = await db
    .from('shopping_list_items')
    .select(SHOPPING_COLUMNS)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as ShoppingRow[]).map(mapShoppingRow);
}

export function useShoppingList(): QueryResult<ShoppingItem[]> {
  const storeItems = useAppStore((state) => state.shoppingItems);
  const household = useHouseholdQuery();
  const householdId = household.data?.householdId;
  const query = useQuery({
    queryKey: queryKeys.shopping(householdId ?? 'unknown'),
    queryFn: () => fetchShopping(householdId as string),
    enabled: isLiveData && Boolean(householdId),
  });
  if (!isLiveData) return mockResult(storeItems);
  return {
    data: query.data,
    isLoading: query.isLoading || household.isLoading,
    isError: query.isError || household.isError,
    error: query.error ?? household.error,
    refetch: query.refetch,
  };
}

export type AddShoppingInput = Omit<ShoppingItem, 'id' | 'status' | 'movedToInventory'>;

export function useShoppingMutations() {
  const storeAdd = useAppStore((state) => state.addShoppingItem);
  const storeToggle = useAppStore((state) => state.toggleShoppingPurchased);
  const storeMove = useAppStore((state) => state.moveShoppingToInventory);
  const household = useHouseholdQuery();
  const queryClient = useQueryClient();

  const invalidate = () => {
    const householdId = household.data?.householdId;
    if (householdId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shopping(householdId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory(householdId) });
    }
  };

  const addMutation = useMutation({
    mutationFn: async (item: AddShoppingInput) => {
      const db = requireClient();
      const householdId = household.data?.householdId;
      const userId = household.data?.currentUserId;
      if (!householdId || !userId) throw new Error('household를 찾을 수 없어요.');
      const { error } = await db.from('shopping_list_items').insert({
        household_id: householdId,
        master_id: item.masterId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        source: item.source,
        source_recipe_id: item.sourceRecipeId,
        added_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: async (item: ShoppingItem) => {
      const db = requireClient();
      const userId = household.data?.currentUserId;
      const toPurchased = item.status === 'PENDING';
      const { error } = await db
        .from('shopping_list_items')
        .update(
          toPurchased
            ? { status: 'PURCHASED', purchased_by: userId, purchased_at: new Date().toISOString() }
            : { status: 'PENDING', purchased_by: null, purchased_at: null },
        )
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, storageLocationId }: { id: string; storageLocationId: string }) => {
      const db = requireClient();
      const { error } = await db.rpc('move_shopping_item_to_inventory', {
        shopping_item_id: id,
        target_storage_location_id: storageLocationId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    addShoppingItem: (item: AddShoppingInput): Promise<void> =>
      isLiveData ? addMutation.mutateAsync(item) : Promise.resolve(storeAdd(item)),
    toggleShoppingPurchased: (item: ShoppingItem): Promise<void> =>
      isLiveData ? toggleMutation.mutateAsync(item) : Promise.resolve(storeToggle(item.id)),
    moveShoppingToInventory: (id: string, storageLocationId: string): Promise<void> =>
      isLiveData
        ? moveMutation.mutateAsync({ id, storageLocationId })
        : Promise.resolve(storeMove(id, storageLocationId)),
    isPending: addMutation.isPending || toggleMutation.isPending || moveMutation.isPending,
  };
}
