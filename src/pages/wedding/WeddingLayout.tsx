import { NavLink, Outlet } from 'react-router-dom';
import { computeBudgetSummary, computeChecklistProgress, computeDday } from '@/features/wedding/deriveStats';
import { usePrepItems, useWeddingDate } from '@/features/wedding/hooks/useWeddingData';
import styles from './WeddingLayout.module.css';

const TABS = [
  { to: '/wedding', label: '요약' },
  { to: '/wedding/checklist', label: '체크리스트' },
  { to: '/wedding/schedule', label: '일정' },
  { to: '/wedding/budget', label: '예산' },
  { to: '/wedding/consult-notes', label: '상담 노트' },
  { to: '/wedding/honeymoon', label: '신혼여행' },
];

// 요구사항 3.3.1 — 요약 헤더는 전 탭 고정, D-DAY/완료%/예산 사용%는 전부 파생값(deriveStats.ts).
export default function WeddingLayout() {
  const { data: weddingDate } = useWeddingDate();
  const { data: items } = usePrepItems();

  const dday = weddingDate ? computeDday(weddingDate) : null;
  const checklist = items ? computeChecklistProgress(items) : { done: 0, total: 0, percent: 0 };
  const budget = items ? computeBudgetSummary(items) : { percent: 0 };

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>WEDDING</p>
          <h1 className={styles.title}>
            우리가 <span className={styles.titleAccent}>하나가 되는 준비,</span>
          </h1>
          <p className={styles.subtitle}>
            본식까지 {dday !== null ? `D${dday > 0 ? '-' : '+'}${Math.abs(dday)}` : '-'} · 투두 {checklist.done}/{checklist.total}
          </p>
        </div>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>D-DAY</span>
            <span className={styles.summaryValue}>{dday !== null ? `D${dday > 0 ? '-' : '+'}${Math.abs(dday)}` : '-'}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>완료 %</span>
            <span className={styles.summaryValue}>{checklist.percent}%</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>예산 사용</span>
            <span className={styles.summaryValue}>{budget.percent}%</span>
          </div>
        </div>
      </div>

      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/wedding'}
            className={({ isActive }) => (isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab)}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </main>
  );
}
