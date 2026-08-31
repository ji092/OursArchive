import { Link } from 'react-router-dom';
import { IconPin } from '@/shared/components/ui/icons';
import type { ConsultScheduleEvent } from '@/shared/lib/schedule/consultScheduleEvents';
import styles from './ConsultScheduleList.module.css';

// 세 챕터(연애/결혼/임신) 달력이 공통으로 쓰는 "그 날의 상담 일정" 목록.
// 클릭하면 결혼 준비 탭의 해당 상담노트가 열린다(모달은 라우트가 아니라 쿼리 파라미터로 연다 —
// CLAUDE.md 규칙).
export function ConsultScheduleList({ events, title = '결혼 준비 · 상담' }: { events: ConsultScheduleEvent[]; title?: string }) {
  if (events.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <p className={styles.title}>{title}</p>
      {events.map((event) => (
        <Link key={event.id} to={`/wedding/consult-notes?note=${event.id}`} className={styles.item}>
          <span className={event.status === 'done' ? styles.badgeDone : styles.badgeScheduled}>
            {event.status === 'done' ? '완료' : '예정'}
          </span>
          <span className={styles.info}>
            <span className={styles.vendor}>
              {event.vendorName} <span className={styles.type}>({event.vendorType})</span>
            </span>
            <span className={styles.address}>
              {event.visitDate}
              {event.address && (
                <>
                  {' · '}
                  <IconPin /> {event.address}
                </>
              )}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
