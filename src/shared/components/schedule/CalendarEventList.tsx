import { Link } from 'react-router-dom';
import { IconPin } from '@/shared/components/ui/icons';
import {
  CHAPTER_LABELS,
  calendarEventKey,
  formatCalendarEventTime,
  sortCalendarEvents,
  type CalendarEvent,
} from '@/shared/lib/schedule/calendarEvents';
import styles from './CalendarEventList.module.css';

// 모든 달력(메인/연애/결혼/임신)이 공유하는 "그 날의 일정" 목록.
// 항목을 누르면 그 일정이 사는 챕터 화면으로 이동한다.
export function CalendarEventList({
  events,
  title,
  emptyText,
  showChapter = true,
}: {
  events: CalendarEvent[];
  title?: string;
  emptyText?: string;
  showChapter?: boolean;
}) {
  if (events.length === 0) {
    return emptyText ? <p className={styles.empty}>{emptyText}</p> : null;
  }
  return (
    <div className={styles.wrap}>
      {title && <p className={styles.title}>{title}</p>}
      {sortCalendarEvents(events).map((event) => (
        <Link key={calendarEventKey(event)} to={event.linkTo} className={styles.item}>
          <span className={styles.badge}>{event.badge}</span>
          <span className={styles.info}>
            <span className={styles.eventTitle}>
              {showChapter && <span className={styles.chapter}>{CHAPTER_LABELS[event.chapter]}</span>}
              {event.title}
            </span>
            <span className={styles.meta}>
              {formatCalendarEventTime(event)}
              {event.location && (
                <>
                  {' · '}
                  <IconPin /> {event.location}
                </>
              )}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
