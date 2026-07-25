import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReviewCandidate } from '../../domain/models';
import { confirmLiveAnalysis } from '../analysis/analysis-service';
import { useAppStore } from '../../stores/app-store';
import { useHouseholdQuery } from './household';
import { isLiveData, queryKeys } from './internal';

/**
 * 검토 확정. mock 모드는 Zustand의 confirmReview로 로컬 재고를 갱신하고,
 * live 모드는 confirm-analysis edge function을 호출한 뒤 재고 쿼리를 무효화해
 * 저장된 항목이 바로 목록에 나타나게 한다(split-brain 해소).
 */
export function useConfirmAnalysis() {
  const storeConfirm = useAppStore((state) => state.confirmReview);
  const household = useHouseholdQuery();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ analysisId, draft }: { analysisId: string; draft: ReviewCandidate[] }) => {
      const result = await confirmLiveAnalysis(analysisId, draft);
      return result.createdItemIds.length + result.mergedItemIds.length;
    },
    onSuccess: () => {
      const householdId = household.data?.householdId;
      if (householdId) void queryClient.invalidateQueries({ queryKey: queryKeys.inventory(householdId) });
    },
  });
  return {
    confirmAnalysis: (analysisId: string | null, draft: ReviewCandidate[]): Promise<number> =>
      isLiveData && analysisId
        ? mutation.mutateAsync({ analysisId, draft })
        : Promise.resolve(storeConfirm()),
    isPending: mutation.isPending,
  };
}
