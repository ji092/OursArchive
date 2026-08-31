import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { RecordThumbnail } from '@/shared/components/record/RecordThumbnail';
import { ScheduleCommentPanel } from '@/shared/components/schedule/ScheduleCommentPanel';
import { CalendarEventList } from '@/shared/components/schedule/CalendarEventList';
import { useCalendarEvents } from '@/shared/hooks/useCalendarEvents';
import { buildMonthCells, monthCellDateKey, WEEKDAY_LABELS } from '@/shared/lib/schedule/calendarGrid';
import { formatMonthDayWeekdayTime } from '@/shared/lib/date/formatDateTime';
import {
  filterCalendarEventsByChapter,
  filterCalendarEventsByMonth,
  groupCalendarEventsByDate,
  localDateKey,
  sortCalendarEventsForList,
} from '@/shared/lib/schedule/calendarEvents';
import { usePregnancyActionsHost } from '../actionsPortal';
import { useDeleteEvent, useDiaries, useEvents } from '../hooks/usePregnancyData';
import { useCurrentWorkspaceId, useSession } from '@/shared/hooks/useAuth';
import type { PregnancyDiary, PregnancyEvent, PregnancyEventType } from '../types';
import { PregnancyEventEditModal } from './PregnancyEventEditModal';
import styles from './PregnancyScheduleView.module.css';

export const EVENT_TYPES: PregnancyEventType[] = ['태교', '모임', '쇼핑', '기타'];
// 결혼(하나가) 챕터의 WeddingScheduleView와 동일한 달력+리스트+상세패널 구조 — 색상만
// 셋이 챕터의 시그니처(코랄)를 그대로 이어받는다(PregnancyLayout의 --color-accent). 체크리스트/
// 상담노트 연결처럼 임신 챕터에 아직 없는 개념은 뺐다.
export function PregnancyScheduleView() {
  const workspaceId = useCurrentWorkspaceId();
  const { session } = useSession();
  const { data: events } = useEvents(workspaceId);
  const { data: diaries } = useDiaries(workspaceId);
  // 임신 챕터의 모든 일정(일정 + 검진)을 한 달력에 모은다 (2026-08-31).
  const { data: allEvents } = useCalendarEvents(workspaceId);
  const deleteEvent = useDeleteEvent(workspaceId);
  const actionsHost = usePregnancyActionsHost();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PregnancyEvent | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const scheduled = useMemo(
    () => [...(events ?? [])].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [events],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PregnancyEvent[]>();
    for (const event of scheduled) {
      const key = localDateKey(event.scheduledAt);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [scheduled]);

  const diariesByDate = useMemo(() => {
    const map = new Map<string, PregnancyDiary[]>();
    for (const diary of diaries ?? []) {
      const key = localDateKey(diary.recordedAt);
      map.set(key, [...(map.get(key) ?? []), diary]);
    }
    return map;
  }, [diaries]);
  const albumDateKeys = useMemo(() => new Set(diariesByDate.keys()), [diariesByDate]);

  const pregnancyEvents = useMemo(() => filterCalendarEventsByChapter(allEvents ?? [], ['pregnancy']), [allEvents]);
  const pregnancyEventsByDate = useMemo(() => groupCalendarEventsByDate(pregnancyEvents), [pregnancyEvents]);

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const listItems = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : scheduled.filter((event) => localDateKey(event.scheduledAt).startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
  const selectedEvent = selectedEventId ? scheduled.find((event) => event.id === selectedEventId) : undefined;
  const selectedDateDiaries = selectedDate ? (diariesByDate.get(selectedDate) ?? []) : [];
  const selectedDateEvents = selectedDate
    ? (pregnancyEventsByDate.get(selectedDate) ?? [])
    : sortCalendarEventsForList(filterCalendarEventsByMonth(pregnancyEvents, year, month));

  // 다른 달력(메인/연애)에서 임신 일정을 누르면 /pregnancy/schedule?event=<id>로 들어온다.
  const requestedEventId = searchParams.get('event');
  const openedEventIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!requestedEventId) {
      openedEventIdRef.current = null;
      return;
    }
    if (openedEventIdRef.current === requestedEventId) return;
    const target = scheduled.find((event) => event.id === requestedEventId);
    if (!target) return; // 아직 로딩 중이거나 접근 권한이 없는 일정
    openedEventIdRef.current = requestedEventId;
    setSelectedEventId(requestedEventId);
    setCalendarCursor(new Date(target.scheduledAt));
  }, [requestedEventId, scheduled]);

  function closeDetail() {
    setSelectedEventId(null);
    if (searchParams.has('event')) {
      const next = new URLSearchParams(searchParams);
      next.delete('event');
      setSearchParams(next, { replace: true });
    }
  }

  function handleSelectDate(day: number) {
    const key = monthCellDateKey(year, month, day);
    setSelectedDate((prev) => (prev === key ? null : key));
    setSelectedEventId(null);
  }

  function changeMonth(delta: number) {
    setCalendarCursor(new Date(year, month + delta, 1));
    setSelectedDate(null);
    setSelectedEventId(null);
  }

  const actionsNode = (
    <button type="button" className={styles.addButton} onClick={() => setShowForm((v) => !v)}>
      + 일정 추가
    </button>
  );

  return (
    <div className={styles.wrap}>
      {actionsHost && createPortal(actionsNode, actionsHost)}

      {showForm && <PregnancyEventEditModal onClose={() => setShowForm(false)} />}
      {editingEvent && <PregnancyEventEditModal event={editingEvent} onClose={() => setEditingEvent(null)} />}

      <div className={styles.layout}>
        <div className={styles.calendarCol}>
          <div className={styles.calendarHead}>
            <button type="button" className={styles.calendarNav} onClick={() => changeMonth(-1)} aria-label="이전 달">
              ‹
            </button>
            <p className={styles.calendarTitle}>
              {year}년 {month + 1}월
            </p>
            <button type="button" className={styles.calendarNav} onClick={() => changeMonth(1)} aria-label="다음 달">
              ›
            </button>
          </div>
          <div className={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className={styles.weekday}>
                {w}
              </span>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {cells.map((day, index) => {
              if (day === null) return <span key={index} className={styles.dayCellEmpty} />;
              const key = monthCellDateKey(year, month, day);
              const hasEvents = pregnancyEventsByDate.has(key);
              const hasAlbumPhoto = albumDateKeys.has(key);
              const isSelected = selectedDate === key;
              return (
                <button
                  key={index}
                  type="button"
                  className={[styles.dayCell, hasEvents ? styles.dayCellHasEvent : '', isSelected ? styles.dayCellSelected : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleSelectDate(day)}
                >
                  {day}
                  {hasAlbumPhoto && <img src="/icons/camera.png" alt="" className={styles.dayCameraIcon} width={12} height={12} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.listCol}>
          {selectedDate && (
            <button type="button" className={styles.clearFilter} onClick={() => setSelectedDate(null)}>
              {selectedDate} 필터 해제 ✕
            </button>
          )}
          <div className={styles.timeline}>
            {listItems.map((event) => (
              <button
                key={event.id}
                type="button"
                className={event.id === selectedEventId ? `${styles.timelineItem} ${styles.timelineItemActive}` : styles.timelineItem}
                onClick={() => setSelectedEventId((prev) => (prev === event.id ? null : event.id))}
              >
                <span className={styles.badge}>{event.eventType}</span>
                <span className={styles.timelineInfo}>
                  <p className={styles.itemTitle}>{event.title}</p>
                  <p className={styles.itemMeta}>
                    {event.location} · {formatMonthDayWeekdayTime(event.scheduledAt)}
                  </p>
                </span>
              </button>
            ))}
            {listItems.length === 0 && (
              <p className={styles.empty}>{selectedDate ? '이 날 등록된 일정이 없어요.' : `${month + 1}월에 등록된 일정이 없어요.`}</p>
            )}
          </div>

          <CalendarEventList
            events={selectedDateEvents}
            title={selectedDate ? `${selectedDate} 임신 일정 전체` : '임신 일정 전체'}
            showChapter={false}
          />

          {selectedDateDiaries.length > 0 && (
            <div className={styles.albumSection}>
              <p className={styles.albumSectionTitle}>앨범 · 이 날의 기록</p>
              <div className={styles.albumList}>
                {selectedDateDiaries.map((diary) => (
                  <Link key={diary.id} to={`/pregnancy/album?record=${diary.id}`} className={styles.albumItem}>
                    <span className={styles.albumThumbWrap}>
                      <RecordThumbnail imageUrl={diary.imageUrl} gradient={diary.gradient} alt={diary.title} />
                    </span>
                    <span className={styles.albumInfo}>
                      <span className={styles.albumTitle}>{diary.title}</span>
                      <span className={styles.albumMeta}>{diary.weekNo}주차</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedEvent && (
          <div className={styles.detailRow}>
            <div className={styles.detailHead}>
              <p className={styles.detailTitle}>{selectedEvent.title}</p>
              <button type="button" className={styles.detailClose} onClick={closeDetail} aria-label="닫기">
                ✕
              </button>
            </div>
            <p className={styles.detailMeta}>
              {selectedEvent.eventType} · {selectedEvent.location} · {formatMonthDayWeekdayTime(selectedEvent.scheduledAt)}
            </p>
            <div className={styles.detailActions}>
              <button type="button" className={styles.detailActionButton} onClick={() => setEditingEvent(selectedEvent)}>
                수정
              </button>
              <button
                type="button"
                className={styles.detailActionButton}
                onClick={() => {
                  deleteEvent.mutate(selectedEvent.id);
                  setSelectedEventId(null);
                }}
              >
                삭제
              </button>
            </div>

            {workspaceId && (
              <ScheduleCommentPanel
                sourceType="pregnancy_event"
                sourceId={selectedEvent.id}
                workspaceId={workspaceId}
                currentUserId={session?.user.id}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
