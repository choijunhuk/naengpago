import { appEnv, hasSupabaseConfig } from '../../lib/env';
import { supabase } from '../../lib/supabase';

/**
 * live 데이터 모드 여부. mock 모드에서는 어떤 서버 쿼리도 실행하지 않고
 * Zustand 스토어를 그대로 읽고 쓴다.
 */
export const isLiveData = appEnv.aiMode === 'live' && hasSupabaseConfig;

export function requireClient() {
  if (!supabase) throw new Error('Supabase 환경 변수가 필요해요.');
  return supabase;
}

/** 스크린이 로딩/에러/빈 상태를 하나의 코드 경로로 처리하도록 하는 공통 결과 타입. */
export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

const noop = () => {};

export function mockResult<T>(data: T): QueryResult<T> {
  return { data, isLoading: false, isError: false, error: null, refetch: noop };
}

export const queryKeys = {
  household: ['household'] as const,
  inventory: (householdId: string) => ['inventory', householdId] as const,
  storageLocations: (householdId: string) => ['storage-locations', householdId] as const,
  shopping: (householdId: string) => ['shopping', householdId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  recommendations: (householdId: string, mode: string) => ['recommendations', householdId, mode] as const,
  recipe: (recipeId: string) => ['recipe', recipeId] as const,
};
