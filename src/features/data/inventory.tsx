import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { decreaseLevel, resolveDeduction } from '../../domain/inventory';
import type { InventoryItem } from '../../domain/models';
import { useAppStore } from '../../stores/app-store';
import type { IngredientCategory, QuantityType, RemainingLevel } from '../../types/domain';
import { useHouseholdQuery } from './household';
import { isLiveData, mockResult, queryKeys, requireClient, type QueryResult } from './internal';
import { mapInventoryRow, type InventoryRow } from './mappers';

const INVENTORY_COLUMNS =
  'id, master_id, display_name, category, quantity_type, quantity, unit, remaining_level, remaining_percent, storage_location_id, expiration_date, registered_via, image_path, ai_confidence, created_by, created_at, updated_at';

export interface AddInventoryInput {
  displayName: string;
  category: IngredientCategory;
  quantityType: QuantityType;
  quantity: number | null;
  unit: string | null;
  remainingLevel: RemainingLevel | null;
  storageLocationId: string;
  expirationDate: string | null;
}

async function fetchInventory(householdId: string): Promise<InventoryItem[]> {
  const db = requireClient();
  const { data, error } = await db
    .from('inventory_items')
    .select(INVENTORY_COLUMNS)
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as InventoryRow[]).map(mapInventoryRow);
}

function useInventoryQuery() {
  const household = useHouseholdQuery();
  const householdId = household.data?.householdId;
  const query = useQuery({
    queryKey: queryKeys.inventory(householdId ?? 'unknown'),
    queryFn: () => fetchInventory(householdId as string),
    enabled: isLiveData && Boolean(householdId),
  });
  return { household, householdId, query };
}

export function useInventory(): QueryResult<InventoryItem[]> {
  const storeInventory = useAppStore((state) => state.inventory);
  const { household, query } = useInventoryQuery();
  if (!isLiveData) return mockResult(storeInventory);
  return {
    data: query.data,
    isLoading: query.isLoading || household.isLoading,
    isError: query.isError || household.isError,
    error: query.error ?? household.error,
    refetch: query.refetch,
  };
}

export function useInventoryItem(id: string | undefined): QueryResult<InventoryItem | undefined> {
  const storeItem = useAppStore((state) => state.inventory.find((entry) => entry.id === id));
  const inventory = useInventory();
  if (!isLiveData) return mockResult(storeItem);
  return {
    data: inventory.data?.find((entry) => entry.id === id),
    isLoading: inventory.isLoading,
    isError: inventory.isError,
    error: inventory.error,
    refetch: inventory.refetch,
  };
}

function patchToRow(patch: Partial<InventoryItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ('quantity' in patch) row.quantity = patch.quantity;
  if ('unit' in patch) row.unit = patch.unit;
  if ('remainingLevel' in patch) row.remaining_level = patch.remainingLevel;
  if ('displayName' in patch) row.display_name = patch.displayName;
  if ('expirationDate' in patch) row.expiration_date = patch.expirationDate;
  if ('storageLocationId' in patch) row.storage_location_id = patch.storageLocationId;
  return row;
}

export function useInventoryMutations() {
  const storeAdd = useAppStore((state) => state.addInventory);
  const storeUpdate = useAppStore((state) => state.updateInventory);
  const storeConsume = useAppStore((state) => state.consumeInventory);
  const storeDelete = useAppStore((state) => state.deleteInventory);
  const household = useHouseholdQuery();
  const queryClient = useQueryClient();

  const invalidate = () => {
    const householdId = household.data?.householdId;
    if (householdId) void queryClient.invalidateQueries({ queryKey: queryKeys.inventory(householdId) });
  };

  const addMutation = useMutation({
    mutationFn: async (input: AddInventoryInput): Promise<string> => {
      const db = requireClient();
      const householdId = household.data?.householdId;
      const userId = household.data?.currentUserId;
      if (!householdId || !userId) throw new Error('household를 찾을 수 없어요.');
      const { data, error } = await db
        .from('inventory_items')
        .insert({
          household_id: householdId,
          storage_location_id: input.storageLocationId,
          master_id: null,
          display_name: input.displayName,
          category: input.category,
          quantity_type: input.quantityType,
          quantity: input.quantity,
          unit: input.unit,
          remaining_level: input.remainingLevel,
          expiration_date: input.expirationDate,
          registered_via: 'MANUAL',
          created_by: userId,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<InventoryItem> }) => {
      const db = requireClient();
      const { error } = await db.from('inventory_items').update(patchToRow(patch)).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const consumeMutation = useMutation({
    mutationFn: async (item: InventoryItem) => {
      const db = requireClient();
      const patch =
        item.quantityType === 'LEVEL' && item.remainingLevel
          ? { remaining_level: decreaseLevel(item.remainingLevel) }
          : { quantity: resolveDeduction(item, 1).quantity };
      const { error } = await db.from('inventory_items').update(patch).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const db = requireClient();
      const { error } = await db
        .from('inventory_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    addInventory: (input: AddInventoryInput): Promise<string> =>
      isLiveData ? addMutation.mutateAsync(input) : Promise.resolve(storeAdd(input)),
    updateInventory: (id: string, patch: Partial<InventoryItem>): Promise<void> =>
      isLiveData ? updateMutation.mutateAsync({ id, patch }) : Promise.resolve(storeUpdate(id, patch)),
    consumeInventory: (item: InventoryItem): Promise<void> =>
      isLiveData ? consumeMutation.mutateAsync(item) : Promise.resolve(storeConsume(item.id, 1)),
    deleteInventory: (id: string): Promise<void> =>
      isLiveData ? deleteMutation.mutateAsync(id) : Promise.resolve(storeDelete(id)),
    isPending:
      addMutation.isPending || updateMutation.isPending || consumeMutation.isPending || deleteMutation.isPending,
  };
}
