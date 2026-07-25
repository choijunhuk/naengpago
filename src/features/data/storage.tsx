import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { StorageLocation } from '../../domain/models';
import { useAppStore } from '../../stores/app-store';
import { useHouseholdQuery } from './household';
import { isLiveData, mockResult, queryKeys, requireClient, type QueryResult } from './internal';
import { mapStorageLocationRow, type StorageLocationRow } from './mappers';

async function fetchStorageLocations(householdId: string): Promise<StorageLocation[]> {
  const db = requireClient();
  const { data, error } = await db
    .from('storage_locations')
    .select('id, name, type, icon, sort_order')
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as StorageLocationRow[]).map(mapStorageLocationRow);
}

export function useStorageLocations(): QueryResult<StorageLocation[]> {
  const storeLocations = useAppStore((state) => state.storageLocations);
  const household = useHouseholdQuery();
  const householdId = household.data?.householdId;
  const query = useQuery({
    queryKey: queryKeys.storageLocations(householdId ?? 'unknown'),
    queryFn: () => fetchStorageLocations(householdId as string),
    enabled: isLiveData && Boolean(householdId),
  });

  if (!isLiveData) return mockResult(storeLocations);
  return {
    data: query.data,
    isLoading: query.isLoading || household.isLoading,
    isError: query.isError || household.isError,
    error: query.error ?? household.error,
    refetch: query.refetch,
  };
}

export function useAddStorageLocation() {
  const storeAdd = useAppStore((state) => state.addStorageLocation);
  const household = useHouseholdQuery();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (name: string) => {
      const db = requireClient();
      const householdId = household.data?.householdId;
      if (!householdId) throw new Error('household를 찾을 수 없어요.');
      const existing = queryClient.getQueryData<StorageLocation[]>(queryKeys.storageLocations(householdId));
      const { error } = await db.from('storage_locations').insert({
        household_id: householdId,
        name,
        type: 'CUSTOM',
        icon: 'archive',
        sort_order: existing?.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      const householdId = household.data?.householdId;
      if (householdId) void queryClient.invalidateQueries({ queryKey: queryKeys.storageLocations(householdId) });
    },
  });

  return {
    addStorageLocation: (name: string): Promise<void> =>
      isLiveData ? mutation.mutateAsync(name) : Promise.resolve(storeAdd(name)),
    isPending: mutation.isPending,
  };
}
