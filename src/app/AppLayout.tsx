import { Outlet } from 'react-router-dom';
import { GlobalFooter } from '@/shared/components/layout/GlobalFooter';
import { GlobalHeader } from '@/shared/components/layout/GlobalHeader';
import { MobileTabBar } from '@/shared/components/layout/MobileTabBar';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import styles from './AppLayout.module.css';

// 알림 목록/안읽음 개수는 GlobalHeader 내부 상태(확인 시 X로 제거)로 관리한다.
// 콘텐츠가 짧은 페이지에서도 푸터가 화면 하단에 붙도록 flex 컬럼 셸로 감싼다.
// RequireActiveMember가 이미 세션/멤버십을 조회해둬서(react-query 캐시 공유) 여기서 다시 불러도 추가 네트워크 요청은 없다.
export function AppLayout() {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);

  return (
    <div className={styles.shell}>
      <GlobalHeader isMaster={membership?.role === 'master'} />
      <div className={styles.content}>
        <Outlet />
      </div>
      <GlobalFooter />
      <MobileTabBar />
    </div>
  );
}
