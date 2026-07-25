import { useQuery } from '@tanstack/react-query';

import { useAppStore } from '../../stores/app-store';
import { isLiveData, mockResult, queryKeys, requireClient, type QueryResult } from './internal';

export interface HouseholdMember {
  userId: string;
  role: 'OWNER' | 'MEMBER';
  nickname: string | null;
}

export interface HouseholdData {
  householdId: string;
  currentUserId: string;
  name: string;
  inviteCode: string;
  myRole: 'OWNER' | 'MEMBER';
  members: HouseholdMember[];
}

async function fetchHousehold(currentNickname: string | null): Promise<HouseholdData> {
  const db = requireClient();
  const { data: userData } = await db.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('로그인이 필요해요.');

  const { data: membership, error: membershipError } = await db
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) throw new Error('참여 중인 household를 찾을 수 없어요.');

  const [householdResult, membersResult] = await Promise.all([
    db.from('households').select('id, name, invite_code').eq('id', membership.household_id).single(),
    db.from('household_members').select('user_id, role, joined_at').eq('household_id', membership.household_id).order('joined_at', { ascending: true }),
  ]);
  if (householdResult.error) throw householdResult.error;

  const members: HouseholdMember[] = (membersResult.data ?? []).map((entry) => ({
    userId: entry.user_id,
    role: entry.role,
    // RLS상 profiles는 본인 행만 조회 가능하므로 다른 구성원 닉네임은 서버에서 읽을 수 없다.
    nickname: entry.user_id === userId ? currentNickname : null,
  }));

  return {
    householdId: membership.household_id,
    currentUserId: userId,
    name: householdResult.data.name,
    inviteCode: householdResult.data.invite_code,
    myRole: membership.role,
    members: members.length ? members : [{ userId, role: membership.role, nickname: currentNickname }],
  };
}

/** 내부용: householdId/currentUserId가 필요한 다른 훅이 공유하는 쿼리. */
export function useHouseholdQuery() {
  const session = useAppStore((state) => state.session);
  const query = useQuery({
    queryKey: queryKeys.household,
    queryFn: () => fetchHousehold(session?.nickname ?? null),
    enabled: isLiveData,
    staleTime: 60_000,
  });
  return query;
}

export function useHousehold(): QueryResult<HouseholdData> {
  const session = useAppStore((state) => state.session);
  const query = useHouseholdQuery();

  if (!isLiveData) {
    return mockResult<HouseholdData>({
      householdId: 'mock-household',
      currentUserId: session?.id ?? 'user-demo',
      name: '우리집',
      inviteCode: 'NP7K2A',
      myRole: 'OWNER',
      members: [{ userId: session?.id ?? 'user-demo', role: 'OWNER', nickname: session?.nickname ?? '냉파고 사용자' }],
    });
  }
  return { data: query.data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
