import { Link } from 'react-router-dom';
import { LoveCalendarView } from '@/features/love/components/LoveCalendarView';
import { useWorkspaceSettings } from '@/shared/hooks/useWorkspaceSettings';
import { dashboardMock } from './mockDashboard';
import styles from './DashboardPage.module.css';

// 목데이터 기준 구현(위 mockDashboard.ts 참조). GET /dashboard 연동 시 이 컴포넌트는 그대로 두고
// 데이터 소스만 React Query 훅으로 교체한다. 단, 함께/셋이 카드의 D+/D-DAY와 "처음" 카드는
// 관리 페이지에서 입력한 workspace 날짜(useWorkspaceSettings)로 실시간 파생 계산한다(2026-07-23).
function daysBetween(fromIso: string, now = new Date()): number {
  const from = new Date(fromIso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round(diffMs / 86400000);
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}/${mm}/${dd}`;
}

export default function DashboardPage() {
  const { summary, recent } = dashboardMock;
  const { data: settings } = useWorkspaceSettings();
  const weddingProgress = Math.round((summary.weddingChecklistDone / summary.weddingChecklistTotal) * 100);
  const daysTogether = settings ? daysBetween(settings.coupleStartDate) : summary.daysTogether;
  const birthDday = settings?.dueDate ? -daysBetween(settings.dueDate) : null;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>OURS ARCHIVE</p>
        <h1 className={styles.title}>
          우리의 <span className={styles.titleAccent}>모든 순간,</span>
        </h1>
        <p className={styles.subtitle}>— 작지만 소중한 과거의, 지금의 우리</p>

        <div className={styles.heroRow}>
          <div className={styles.ctaGroup}>
            <Link to="/love" className={styles.ctaPrimary}>
              <img src="/icons/write.png" alt="" width={14} height={14} />
              오늘 기록하기
            </Link>
            <Link to="/admin/members" className={styles.ctaSecondary}>
              <img src="/icons/admin.png" alt="" width={14} height={14} />
              관리
            </Link>
          </div>

          <div className={styles.summaryCards}>
            <Link to="/admin/members" className={`${styles.summaryCard} ${styles.summaryCardStart}`}>
              <span className={styles.summaryLabel}>처음</span>
              <span className={styles.summaryValue}>{settings ? formatShortDate(settings.firstMetDate) : '-'}</span>
            </Link>
            <Link to="/love" className={`${styles.summaryCard} ${styles.summaryCardLove}`}>
              <span className={styles.summaryLabel}>함께</span>
              <span className={styles.summaryValue}>D+{daysTogether}</span>
            </Link>
            <Link to="/wedding" className={`${styles.summaryCard} ${styles.summaryCardWedding}`}>
              <span className={styles.summaryLabel}>하나가</span>
              <span className={styles.summaryValue}>
                {summary.weddingChecklistDone}/{summary.weddingChecklistTotal}
              </span>
            </Link>
            <Link to="/pregnancy" className={`${styles.summaryCard} ${styles.summaryCardPregnancy}`}>
              <span className={styles.summaryLabel}>셋이</span>
              <span className={styles.summaryValue}>{birthDday !== null ? `D${birthDday > 0 ? '-' : '+'}${Math.abs(birthDday)}` : '-'}</span>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.calendarSection}>
        <p className={styles.eyebrow}>CALENDAR</p>
        <h2 className={styles.recentTitle}>
          우리 <span className={styles.titleAccent}>일정,</span>
        </h2>
        <LoveCalendarView />
      </section>

      <section className={styles.recent}>
        <p className={styles.eyebrow}>RECENT</p>
        <h2 className={styles.recentTitle}>
          요즘 <span className={styles.titleAccent}>우리,</span>
        </h2>

        <div className={styles.recentGrid}>
          <Link to="/love" className={styles.recentCard}>
            <div className={styles.recentImage} aria-hidden="true" />
            <div className={styles.recentBody}>
              <p className={styles.recentTag}>LOVE · 최신 기록</p>
              <p className={styles.recentText}>{recent.love.body}</p>
              <p className={styles.recentMeta}>📍 {recent.love.placeName}</p>
            </div>
          </Link>

          <Link to="/wedding" className={styles.recentCard}>
            <div className={styles.recentBody}>
              <p className={styles.recentTag}>WEDDING · 다음 일정</p>
              <p className={styles.recentText}>{recent.weddingNextEvent.title}</p>
              <p className={styles.recentMeta}>{recent.weddingNextEvent.location}</p>
              <p className={styles.recentMeta}>📅 {recent.weddingNextEvent.scheduledAtLabel}</p>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${weddingProgress}%` }} />
              </div>
              <p className={styles.progressLabel}>
                투두 진행 {recent.weddingNextEvent.checklistDone}/{recent.weddingNextEvent.checklistTotal}
              </p>
            </div>
          </Link>

          <Link to="/pregnancy" className={styles.recentCard}>
            <div className={styles.recentBody}>
              <p className={styles.recentTag}>PREGNANCY · 다음 검진</p>
              <p className={styles.recentText}>{recent.pregnancyNextCheckup.title}</p>
              <p className={styles.recentMeta}>
                {recent.pregnancyNextCheckup.hospital} · {recent.pregnancyNextCheckup.doctor}
              </p>
              <p className={styles.recentMeta}>📅 {recent.pregnancyNextCheckup.scheduledAtLabel}</p>
              <p className={styles.recentMeta}>
                현재 {recent.pregnancyNextCheckup.weekNo}주 · {recent.pregnancyNextCheckup.sizeMetaphor} 크기
              </p>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
