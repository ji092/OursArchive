import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AccessDeniedModal } from '@/shared/components/ui/AccessDeniedModal';
import { canAccessCoupleContent } from '@/shared/lib/rbac/permissions';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';

// love/wedding/pregnancy는 master·partner 전용(2026-07-29 사용자 지정 — family는 지금 단계에서
// 아무것도 못 봄, 나중에 baby 챕터만 공유). RLS가 이미 서버에서 막아주지만(can_access_couple_content),
// UI 숨김만으로는 접근 통제로 인정 안 하는 CLAUDE.md 원칙과 별개로, family가 빈 화면 대신
// "접근권한 없음"을 명확히 알게 하기 위한 프론트 가드다.
export function RequireCoupleAccess() {
  const { session, isLoading: isSessionLoading } = useSession();
  const userId = session?.user.id;
  const { data: membership, isLoading: isMembershipLoading } = useMyMembership(userId);
  const [confirmed, setConfirmed] = useState(false);

  if (isSessionLoading || (userId && isMembershipLoading)) return null;

  if (!canAccessCoupleContent(membership?.role)) {
    if (confirmed) return <Navigate to="/" replace />;
    return <AccessDeniedModal onConfirm={() => setConfirmed(true)} />;
  }

  return <Outlet />;
}
