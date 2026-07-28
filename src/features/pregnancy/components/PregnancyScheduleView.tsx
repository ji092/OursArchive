import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { RecordThumbnail } from '@/shared/components/record/RecordThumbnail';
import { usePregnancyActionsHost } from '../actionsPortal';
import { useDiaries, useEvents } from '../hooks/usePregnancyData';
import type { PregnancyDiary, PregnancyEvent, PregnancyEventType } from '../types';
import { PregnancyEventEditModal } from './PregnancyEventEditModal';
import styles from './PregnancyScheduleView.module.css';

export const EVENT_TYPES: PregnancyEventType[] = ['태교', '모임', '쇼핑', '기타'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildMonthCells(year: number, month: number): (number | null)[] {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// 결혼(하나가) 챕터의 WeddingScheduleView와 동일한 달력+리스트+상세패널 구조 — 색상만
// 셋이 챕터의 시그니처(코랄)를 그대로 이어받는다(PregnancyLayout의 --color-accent). 체크리스트/
// 상담노트 연결처럼 임신 챕터에 아직 없는 개념은 뺐다.
export function PregnancyScheduleView() {
  const { data: events } = useEvents();
  const { data: diaries } = useDiaries();
  const actionsHost = usePregnancyActionsHost();
  const [showForm, setShowForm] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const scheduled = useMemo(
    () => [...(events ?? [])].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [events],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PregnancyEvent[]>();
    for (const event of scheduled) {
      const key = event.scheduledAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [scheduled]);

  const diariesByDate = useMemo(() => {
    const map = new Map<string, PregnancyDiary[]>();
    for (const diary of diaries ?? []) {
      const key = diary.recordedAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), diary]);
    }
    return map;
  }, [diaries]);
  const albumDateKeys = useMemo(() => new Set(diariesByDate.keys()), [diariesByDate]);

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const listItems = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : scheduled;
  const selectedEvent = selectedEventId ? scheduled.find((event) => event.id === selectedEventId) : undefined;
  const selectedDateDiaries = selectedDate ? (diariesByDate.get(selectedDate) ?? []) : [];

  function handleSelectDate(day: number) {
    const key = dateKey(year, month, day);
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
            {WEEKDAYS.map((w) => (
              <span key={w} className={styles.weekday}>
                {w}
              </span>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {cells.map((day, index) => {
              if (day === null) return <span key={index} className={styles.dayCellEmpty} />;
              const key = dateKey(year, month, day);
              const hasEvents = eventsByDate.has(key);
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
                    {event.location} · {formatDate(event.scheduledAt)}
                  </p>
                </span>
              </button>
            ))}
            {listItems.length === 0 && <p className={styles.empty}>등록된 일정이 없어요.</p>}
          </div>

          {selectedDateDiaries.length > 0 && (
            <div className={styles.albumSection}>
              <p className={styles.albumSectionTitle}>앨범 · 이 날의 기록</p>
              <div className={styles.albumList}>
                {selectedDateDiaries.map((diary) => (
                  <Link key={diary.id} to={`/pregnancy/album?record=${diary.id}`} className={styles.albumItem}>
                    <span className={styles.albumThumbWrap}>
                      <RecordThumbnail gradient={diary.gradient} alt={diary.title} />
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
              <button type="button" className={styles.detailClose} onClick={() => setSelectedEventId(null)} aria-label="닫기">
                ✕
              </button>
            </div>
            <p className={styles.detailMeta}>
              {selectedEvent.eventType} · {selectedEvent.location} · {formatDate(selectedEvent.scheduledAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
