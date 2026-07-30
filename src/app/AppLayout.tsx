import { Outlet } from 'react-router-dom';
import { GlobalFooter } from '@/shared/components/layout/GlobalFooter';
import { GlobalHeader } from '@/shared/components/layout/GlobalHeader';
import { MobileTabBar } from '@/shared/components/layout/MobileTabBar';
import { isMaster } from '@/shared/lib/rbac/permissions';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { useCaptureBlurOnHidden } from '@/shared/lib/capture-guard/useCaptureBlurOnHidden';
import { useBlockCaptureShortcuts } from '@/shared/lib/capture-guard/useBlockCaptureShortcuts';
import styles from './AppLayout.module.css';

// 알림 목록/안읽음 개수는 features/notifications의 react-query 훅(폴링)이 관리한다 — GlobalHeader에
// userId만 넘기면 됨. 콘텐츠가 짧은 페이지에서도 푸터가 화면 하단에 붙도록 flex 컬럼 셸로 감싼다.
// RequireActiveMember가 이미 세션/멤버십을 조회해둬서(react-query 캐시 공유) 여기서 다시 불러도 추가 네트워크 요청은 없다.
export function AppLayout() {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);
  const isCaptureBlurred = useCaptureBlurOnHidden();
  useBlockCaptureShortcuts();

  return (
    <div className={isCaptureBlurred ? `${styles.shell} ${styles.captureBlurred}` : styles.shell}>
      <GlobalHeader isMaster={isMaster(membership?.role)} userId={session?.user.id} />
      <div className={styles.content}>
        <Outlet />
      </div>
      <GlobalFooter />
      <MobileTabBar />
    </div>
  );
}
