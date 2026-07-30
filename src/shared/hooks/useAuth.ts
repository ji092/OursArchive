import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/api/supabaseClient';
import { fetchMyMembership } from '@/shared/lib/auth/authApi';

// 세션은 react-query 캐시가 아니라 supabase의 onAuthStateChange 구독으로 직접 추적한다
// (세션은 서버 상태라기보다 SDK가 자체 관리하는 인증 상태라서).
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return { session, isLoading };
}

export const myMembershipQueryKey = (userId: string) => ['my-membership', userId] as const;

export function useMyMembership(userId: string | undefined) {
  return useQuery({
    queryKey: myMembershipQueryKey(userId ?? ''),
    queryFn: () => fetchMyMembership(userId!),
    enabled: !!userId,
  });
}

// love/wedding/pregnancy 전 챕터가 "현재 워크스페이스 id"만 필요할 때 반복해서 session+membership을
// 엮지 않도록 묶어둔 편의 훅. 필요한 컴포넌트는 이것만 부르면 된다.
export function useCurrentWorkspaceId(): string | undefined {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);
  return membership?.workspaceId;
}
