import { Link } from 'react-router-dom';
import { IconCalendar } from '@/shared/components/ui/icons';
import { useCalendarEvents } from '@/shared/hooks/useCalendarEvents';
import {
  calendarEventKey,
  filterCalendarEventsByChapter,
  findUpcomingCalendarEvents,
  formatCalendarEventDateTime,
} from '@/shared/lib/schedule/calendarEvents';
import {
  computeBudgetSummary,
  computeCategoryProgress,
  formatWon,
} from '../deriveStats';
import { sortConsultNotesForList } from '../sortConsultNotes';
import { useConsultNotes, usePrepItems } from '../hooks/useWeddingData';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import styles from './WeddingSummaryView.module.css';

export function WeddingSummaryView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: items } = usePrepItems(workspaceId);
  const { data: notes } = useConsultNotes(workspaceId);
  // NEXT EVENT는 prep_item.schedule만 보지 않고 달력과 같은 통합 일정에서 고른다 — 상담노트·
  // 신혼여행처럼 prep_item이 아닌 결혼 일정도 후보에 들어가야 달력과 답이 같아진다(2026-09-02).
  const { data: calendarEvents } = useCalendarEvents(workspaceId);
  if (!items || !notes) return <p>불러오는 중…</p>;

  const categoryProgress = computeCategoryProgress(items);
  const budget = computeBudgetSummary(items);
  // 오늘 포함, 가까운 순으로 5개까지. 5개가 안 되면 있는 것만 보여준다(2026-09-02 사용자 지정).
  const nextEvents = findUpcomingCalendarEvents(filterCalendarEventsByChapter(calendarEvents ?? [], ['wedding']), 5);
  // 상담노트 카드 목록과 같은 순서(예정 오름차순 → 완료 내림차순)로 앞 3건만 보여준다(2026-09-02).
  const recentNotes = sortConsultNotesForList(notes).slice(0, 3);

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
        {nextEvents.length > 0 ? (
          <div className={styles.nextEventList}>
            {nextEvents.map((event) => (
              <Link key={calendarEventKey(event)} to={event.linkTo} className={styles.nextEvent}>
                <span className={styles.nextEventBadge}>{event.badge}</span>
                <span className={styles.nextEventInfo}>
                  <span className={styles.nextEventTitle}>{event.title}</span>
                  <span className={styles.nextEventMeta}>
                    <IconCalendar /> {formatCalendarEventDateTime(event)}
                    {event.location && ` · ${event.location}`}
                  </span>
                </span>
              </Link>
            ))}
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
