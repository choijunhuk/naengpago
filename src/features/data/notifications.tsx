import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AppNotification } from '../../domain/models';
import { useAppStore } from '../../stores/app-store';
import { useHouseholdQuery } from './household';
import { isLiveData, mockResult, queryKeys, requireClient, type QueryResult } from './internal';
import { mapNotificationRow, type NotificationRow } from './mappers';

async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const db = requireClient();
  const { data, error } = await db
    .from('notifications')
    .select('id, type, payload, read_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as NotificationRow[]).map(mapNotificationRow);
}

export function useNotifications(): QueryResult<AppNotification[]> {
  const storeItems = useAppStore((state) => state.notifications);
  const household = useHouseholdQuery();
  const userId = household.data?.currentUserId;
  const query = useQuery({
    queryKey: queryKeys.notifications(userId ?? 'unknown'),
    queryFn: () => fetchNotifications(userId as string),
    enabled: isLiveData && Boolean(userId),
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

export function useMarkNotificationRead() {
  const storeMark = useAppStore((state) => state.markNotificationRead);
  const household = useHouseholdQuery();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const db = requireClient();
      const { error } = await db
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      const userId = household.data?.currentUserId;
      if (userId) void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
    },
  });
  return {
    markNotificationRead: (id: string): Promise<void> =>
      isLiveData ? mutation.mutateAsync(id) : Promise.resolve(storeMark(id)),
  };
}
