import { Navigate, Outlet } from 'react-router-dom';
import { isMaster } from '@/shared/lib/rbac/permissions';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';

// /admin/members는 초대·가입승인·역할변경을 다루는 민감 화면이라 로그인만으로는 부족하고 role='master'만
// 들어갈 수 있어야 한다 (RequireActiveMember는 이미 상위에서 통과된 상태 — 여기서는 role만 추가로 확인).
export function RequireMaster() {
  const { session, isLoading: isSessionLoading } = useSession();
  const userId = session?.user.id;
  const { data: membership, isLoading: isMembershipLoading } = useMyMembership(userId);

  if (isSessionLoading || (userId && isMembershipLoading)) return null;
  if (!isMaster(membership?.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
