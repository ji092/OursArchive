import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PregnancyActionsHostContext } from '@/features/pregnancy/actionsPortal';
import { computeCurrentWeek, computeDday, computeProgressPercent } from '@/features/pregnancy/deriveStats';
import { useDueDate, useWeekContent } from '@/features/pregnancy/hooks/usePregnancyData';
import styles from './PregnancyLayout.module.css';

const TABS = [
  { to: '/pregnancy/schedule', label: '일정' },
  { to: '/pregnancy/album', label: '앨범' },
  { to: '/pregnancy/checkup', label: '검진' },
  { to: '/pregnancy/health-log', label: '건강기록' },
  { to: '/pregnancy/payment', label: '지불' },
];

// 요구사항 3.4.1 — 주차/D-DAY/진행률은 전부 파생값(deriveStats.ts), 저장하지 않는다.
export default function PregnancyLayout() {
  const { data: dueDate } = useDueDate();
  const [actionsHost, setActionsHost] = useState<HTMLDivElement | null>(null);

  const currentWeek = dueDate ? computeCurrentWeek(dueDate) : 1;
  const dday = dueDate ? computeDday(dueDate) : 0;
  const progress = computeProgressPercent(currentWeek);
  const { data: weekContent } = useWeekContent(currentWeek);

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>PREGNANCY · BABY</p>
          <h1 className={styles.title}>
            우리가 <span className={styles.titleAccent}>셋이,</span>
          </h1>
          <p className={styles.subtitle}>
            {dueDate ? (
              <>
                {currentWeek}주차 · 예정일 {dueDate} · D{dday > 0 ? '-' : '+'}
                {Math.abs(dday)}
              </>
            ) : (
              '예정일 -'
            )}
          </p>
        </div>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.progressLabels}>
        <span>1주</span>
        <span>만나기 까지 {progress}%</span>
        <span>40주</span>
      </div>

      {weekContent && (
        <section className={styles.thisWeek}>
          <p className={styles.thisWeekTitle}>THIS WEEK</p>
          <p className={styles.thisWeekBody}>{weekContent.development}</p>
          <p className={styles.thisWeekTip}>💡 {weekContent.motherTip}</p>
        </section>
      )}

      <div className={styles.tabsRow}>
        <nav className={styles.tabs}>
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => (isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab)}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.tabActionsRow} ref={setActionsHost} />
      </div>

      <PregnancyActionsHostContext.Provider value={actionsHost}>
        <Outlet />
      </PregnancyActionsHostContext.Provider>
    </main>
  );
}
