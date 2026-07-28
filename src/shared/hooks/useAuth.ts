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
