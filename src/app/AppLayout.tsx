import { Outlet } from 'react-router-dom';
import { GlobalFooter } from '@/shared/components/layout/GlobalFooter';
import { GlobalHeader } from '@/shared/components/layout/GlobalHeader';
import { MobileTabBar } from '@/shared/components/layout/MobileTabBar';
import styles from './AppLayout.module.css';

// TODO: 실제 인증 연동 전까지 목데이터로 표시 (Readdy 프론트 목업 기준 마스터 1인).
// 알림 목록/안읽음 개수는 GlobalHeader 내부 상태(확인 시 X로 제거)로 관리한다.
// 콘텐츠가 짧은 페이지에서도 푸터가 화면 하단에 붙도록 flex 컬럼 셸로 감싼다.
export function AppLayout() {
  return (
    <div className={styles.shell}>
      <GlobalHeader isMaster />
      <div className={styles.content}>
        <Outlet />
      </div>
      <GlobalFooter />
      <MobileTabBar />
    </div>
  );
}
