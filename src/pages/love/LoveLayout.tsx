import { NavLink, Outlet } from 'react-router-dom';
import { useLoveRecords } from '@/features/love/hooks/useLoveRecords';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import styles from './LoveLayout.module.css';

// 요구사항 3.2.1 페이지 공통 헤더 — 뷰 전환(피드/달력/지도) + 새로 만들기.
// 기록/계획 축 구분은 없앴다(2026-07-23 사용자 지정) — 달력에서 기록·일정을 함께 보여준다.
// 제목 블록과 뷰 탭+새 기록 버튼을 한 줄에 같은 높이로 배치한다(2026-07-23 사용자 지정).
export default function LoveLayout() {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);
  const { data: records } = useLoveRecords(membership?.workspaceId);
  const recordCount = records?.length ?? 0;

  return (
    <main className={styles.page}>
      <div className={styles.headRow}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>LOVE</p>
          <h1 className={styles.title}>
            너와 나의 <span className={styles.titleAccent}>모든 순간,</span>
          </h1>
          <p className={styles.subtitle}>지금까지 {recordCount}개의 순간이 기록됐어요.</p>
        </div>

        <div className={styles.tabs}>
          <div className={styles.viewTabs}>
            <NavLink to="/love" end className={({ isActive }) => (isActive ? `${styles.viewTab} ${styles.viewTabActive}` : styles.viewTab)}>
              피드
            </NavLink>
            <NavLink
              to="/love/calendar"
              className={({ isActive }) => (isActive ? `${styles.viewTab} ${styles.viewTabActive}` : styles.viewTab)}
            >
              달력
            </NavLink>
            <NavLink to="/love/map" className={({ isActive }) => (isActive ? `${styles.viewTab} ${styles.viewTabActive}` : styles.viewTab)}>
              지도
            </NavLink>
          </div>

          <div className={styles.newButtonGroup}>
            <NavLink to="/love/create" className={styles.newButton}>
              <img src="/icons/write.png" alt="" width={14} height={14} />
              사진
            </NavLink>
            <NavLink to="/love/plan/create" className={styles.newButton}>
              <img src="/icons/write.png" alt="" width={14} height={14} />
              일정
            </NavLink>
          </div>
        </div>
      </div>

      <Outlet />
    </main>
  );
}
