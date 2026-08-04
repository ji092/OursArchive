import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalFooter } from '@/shared/components/layout/GlobalFooter';
import { GlobalHeader } from '@/shared/components/layout/GlobalHeader';
import { MobileTabBar } from '@/shared/components/layout/MobileTabBar';
import { ExitToast } from '@/shared/components/ui/ExitToast';
import { FailureToast } from '@/shared/components/ui/FailureToast';
import { isMaster } from '@/shared/lib/rbac/permissions';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { useCaptureBlurOnHidden } from '@/shared/lib/capture-guard/useCaptureBlurOnHidden';
import { useBlockCaptureShortcuts } from '@/shared/lib/capture-guard/useBlockCaptureShortcuts';
import { useExitOnBackPress } from '@/shared/lib/pwa/useExitOnBackPress';
import { syncPushSubscription } from '@/shared/lib/push/registerPush';
import styles from './AppLayout.module.css';

// 알림 목록/안읽음 개수는 features/notifications의 react-query 훅(폴링)이 관리한다 — GlobalHeader에
// userId만 넘기면 됨. 콘텐츠가 짧은 페이지에서도 푸터가 화면 하단에 붙도록 flex 컬럼 셸로 감싼다.
// RequireActiveMember가 이미 세션/멤버십을 조회해둬서(react-query 캐시 공유) 여기서 다시 불러도 추가 네트워크 요청은 없다.
export function AppLayout() {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);
  const isCaptureBlurred = useCaptureBlurOnHidden();
  useBlockCaptureShortcuts();
  const showExitHint = useExitOnBackPress();

  // 브라우저 구독은 살아 있는데 DB 행만 지워진 상태를 진입 시 1회 보정한다.
  // 그대로 두면 마이페이지 토글은 켜짐으로 보이는데 푸시는 안 오는 상태가 계속된다.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    void syncPushSubscription(userId);
  }, [userId]);

  return (
    <div className={isCaptureBlurred ? `${styles.shell} ${styles.captureBlurred}` : styles.shell}>
      <GlobalHeader isMaster={isMaster(membership?.role)} userId={session?.user.id} />
      <div className={styles.content}>
        <Outlet />
      </div>
      <GlobalFooter />
      <MobileTabBar />
      <ExitToast visible={showExitHint} />
      {/* 모달이 닫히거나 라우트가 바뀐 뒤에 도착하는 실패도 표시되도록 루트에 둔다. */}
      <FailureToast />
    </div>
  );
}
