import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/AppLayout';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';

// 부부/가족 전용 폐쇄형 공간 원칙 — 로그인 안 했거나, 로그인은 했지만 Master 승인 전(status !== 'active')이면
// 어떤 페이지 내용도 보여주지 않고 /login으로 보낸다. 그 뒤 상태(가입 요청/승인 대기)는 LoginPage 자체가 안내한다.
export function RequireActiveMember() {
  const { session, isLoading: isSessionLoading } = useSession();
  const userId = session?.user.id;
  const { data: membership, isLoading: isMembershipLoading } = useMyMembership(userId);

  if (isSessionLoading || (userId && isMembershipLoading)) {
    return null;
  }

  if (!session || membership?.status !== 'active') {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}
