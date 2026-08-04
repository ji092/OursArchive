import { Link } from 'react-router-dom';
import { IconCalendar } from '@/shared/components/ui/icons';
import {
  computeBudgetSummary,
  computeCategoryProgress,
  findNextEvent,
  formatWon,
} from '../deriveStats';
import { useConsultNotes, usePrepItems } from '../hooks/useWeddingData';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import styles from './WeddingSummaryView.module.css';

function formatEventDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function WeddingSummaryView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: items } = usePrepItems(workspaceId);
  const { data: notes } = useConsultNotes(workspaceId);
  if (!items || !notes) return <p>불러오는 중…</p>;

  const categoryProgress = computeCategoryProgress(items);
  const budget = computeBudgetSummary(items);
  const nextEvent = findNextEvent(items);
  const recentNotes = [...notes].sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1)).slice(0, 3);

  return (
    <div className={styles.grid}>
      <div className={styles.columnLeft}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>카테고리별 진행률</p>
          <Link to="/wedding/checklist" className={styles.cardLink}>
            전체 보기 →
          </Link>
        </div>
        <div className={styles.categoryGrid}>
          {Object.entries(categoryProgress).map(([category, progress]) => (
            <div key={category} className={styles.categoryItem}>
              <span className={styles.categoryLabel}>{category}</span>
              <span className={styles.categoryValue}>
                {progress!.done}/{progress!.total}
              </span>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progress!.total === 0 ? 0 : Math.round((progress!.done / progress!.total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>예산 요약</p>
          <Link to="/wedding/budget" className={styles.cardLink}>
            상세 보기 →
          </Link>
        </div>
        <div className={styles.budgetRow}>
          <div>
            <span className={styles.budgetLabel}>계획</span>
            <span className={styles.budgetValue}>{formatWon(budget.planned)}</span>
          </div>
          <div>
            <span className={styles.budgetLabel}>사용</span>
            <span className={styles.budgetValue}>{formatWon(budget.used)}</span>
          </div>
          <div>
            <span className={styles.budgetLabel}>잔여</span>
            <span className={styles.budgetValue}>{formatWon(budget.remaining)}</span>
          </div>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${budget.percent}%` }} />
        </div>
        <p className={styles.budgetPercent}>현재 예산의 {budget.percent}% 사용 중</p>
      </section>
      </div>

      <div className={styles.columnRight}>
      <section className={styles.card}>
        <p className={styles.cardTitle}>NEXT EVENT</p>
        {nextEvent?.schedule ? (
          <div className={styles.nextEvent}>
            <p className={styles.nextEventTitle}>{nextEvent.title}</p>
            <p className={styles.nextEventMeta}>{nextEvent.schedule.location}</p>
            <p className={styles.nextEventMeta}><IconCalendar /> {formatEventDate(nextEvent.schedule.scheduledAt)}</p>
          </div>
        ) : (
          <p className={styles.empty}>예정된 일정이 없어요.</p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>CONSULT NOTES</p>
          <Link to="/wedding/consult-notes" className={styles.cardLink}>
            모두 보기 →
          </Link>
        </div>
        {recentNotes.map((note) => (
          <div key={note.id} className={styles.noteRow}>
            <span className={note.status === 'done' ? styles.badgeDone : styles.badgeScheduled}>
              {note.status === 'done' ? '완료' : '예정'}
            </span>
            <span className={styles.noteVendor}>{note.vendorName}</span>
            <span className={styles.noteDate}>{note.visitDate}</span>
          </div>
        ))}
      </section>
      </div>
    </div>
  );
}
