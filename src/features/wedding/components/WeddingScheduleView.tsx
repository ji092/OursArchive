import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useWeddingActionsHost } from '../actionsPortal';
import { useConsultNotes, usePrepItems } from '../hooks/useWeddingData';
import { useCurrentWorkspaceId, useSession } from '@/shared/hooks/useAuth';
import { ScheduleCommentPanel } from '@/shared/components/schedule/ScheduleCommentPanel';
import { CalendarEventList } from '@/shared/components/schedule/CalendarEventList';
import { useCalendarEvents } from '@/shared/hooks/useCalendarEvents';
import { filterCalendarEventsByChapter, groupCalendarEventsByDate } from '@/shared/lib/schedule/calendarEvents';
import { formatWon } from '../deriveStats';
import type { PrepItem, WeddingEventType } from '../types';
import { ScheduleEditModal } from './ScheduleEditModal';
import styles from './WeddingScheduleView.module.css';

export const EVENT_TYPES: WeddingEventType[] = ['상담', '계약', '청첩장모임', '본식', '기타'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function eventTypeLabel(type: WeddingEventType): string {
  return type === '청첩장모임' ? '청모' : type;
}

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

export function WeddingScheduleView() {
  const workspaceId = useCurrentWorkspaceId();
  const { session } = useSession();
  const { data: items } = usePrepItems(workspaceId);
  const { data: consultNotes } = useConsultNotes(workspaceId);
  // 결혼 챕터의 모든 일정(일정 탭 항목 + 상담노트 방문일 + 신혼여행 출발일)을 한 달력에 모은다.
  const { data: allEvents } = useCalendarEvents(workspaceId);
  const [searchParams, setSearchParams] = useSearchParams();
  const actionsHost = useWeddingActionsHost();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PrepItem | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const scheduled = useMemo(
    () =>
      (items ?? [])
        .filter((item) => item.schedule)
        .sort((a, b) => new Date(a.schedule!.scheduledAt).getTime() - new Date(b.schedule!.scheduledAt).getTime()),
    [items],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PrepItem[]>();
    for (const item of scheduled) {
      const key = item.schedule!.scheduledAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [scheduled]);

  const weddingEvents = useMemo(
    () => filterCalendarEventsByChapter(allEvents ?? [], ['wedding']),
    [allEvents],
  );
  const weddingEventsByDate = useMemo(() => groupCalendarEventsByDate(weddingEvents), [weddingEvents]);

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const listItems = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : scheduled;
  const selectedDateEvents = selectedDate ? (weddingEventsByDate.get(selectedDate) ?? []) : weddingEvents;
  const selectedItem = selectedItemId ? scheduled.find((item) => item.id === selectedItemId) : undefined;
  const selectedItemNotes = selectedItem
    ? (consultNotes ?? []).filter((note) => selectedItem.consultNoteIds.includes(note.id))
    : [];

  // 다른 달력(메인/연애)에서 결혼 일정을 누르면 /wedding/schedule?event=<id>로 들어온다.
  const requestedEventId = searchParams.get('event');
  const openedEventIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!requestedEventId) {
      openedEventIdRef.current = null;
      return;
    }
    if (openedEventIdRef.current === requestedEventId) return;
    const target = scheduled.find((item) => item.id === requestedEventId);
    if (!target) return; // 아직 로딩 중이거나 접근 권한이 없는 항목
    openedEventIdRef.current = requestedEventId;
    setSelectedItemId(requestedEventId);
    setCalendarCursor(new Date(target.schedule!.scheduledAt));
  }, [requestedEventId, scheduled]);

  function closeDetail() {
    setSelectedItemId(null);
    if (searchParams.has('event')) {
      const next = new URLSearchParams(searchParams);
      next.delete('event');
      setSearchParams(next, { replace: true });
    }
  }

  function handleSelectDate(day: number) {
    const key = dateKey(year, month, day);
    setSelectedDate((prev) => (prev === key ? null : key));
    setSelectedItemId(null);
  }

  function changeMonth(delta: number) {
    setCalendarCursor(new Date(year, month + delta, 1));
    setSelectedDate(null);
    setSelectedItemId(null);
  }

  const actionsNode = (
    <button type="button" className={styles.addButton} onClick={() => setShowForm((v) => !v)}>
      + 일정 추가
    </button>
  );

  return (
    <div className={styles.wrap}>
      {actionsHost && createPortal(actionsNode, actionsHost)}

      {showForm && <ScheduleEditModal onClose={() => setShowForm(false)} />}
      {editingItem && <ScheduleEditModal item={editingItem} onClose={() => setEditingItem(null)} />}

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
              const hasEvents = weddingEventsByDate.has(key);
              const isSelected = selectedDate === key;
              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    styles.dayCell,
                    hasEvents ? styles.dayCellHasEvent : '',
                    isSelected ? styles.dayCellSelected : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleSelectDate(day)}
                >
                  {day}
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
            {listItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === selectedItemId ? `${styles.timelineItem} ${styles.timelineItemActive}` : styles.timelineItem}
                onClick={() => setSelectedItemId((prev) => (prev === item.id ? null : item.id))}
              >
                <span className={item.schedule!.eventType === '본식' ? `${styles.badge} ${styles.badgeMain}` : styles.badge}>
                  {eventTypeLabel(item.schedule!.eventType)}
                </span>
                <span className={styles.timelineInfo}>
                  <p className={styles.itemTitle}>{item.title}</p>
                  <p className={styles.itemMeta}>
                    {item.schedule!.location} · {formatDate(item.schedule!.scheduledAt)}
                  </p>
                </span>
              </button>
            ))}
            {listItems.length === 0 && <p className={styles.empty}>등록된 일정이 없어요.</p>}
          </div>
          <CalendarEventList
            events={selectedDateEvents}
            title={selectedDate ? `${selectedDate} 결혼 일정 전체` : '결혼 일정 전체'}
            showChapter={false}
          />
        </div>

        {selectedItem && (
          <div className={styles.detailRow}>
            <div className={styles.detailHead}>
              <p className={styles.detailTitle}>{selectedItem.title}</p>
              <div className={styles.detailActions}>
                <button type="button" className={styles.detailAction} onClick={() => setEditingItem(selectedItem)}>
                  수정
                </button>
                <button type="button" className={styles.detailClose} onClick={closeDetail} aria-label="닫기">
                  ✕
                </button>
              </div>
            </div>
            <p className={styles.detailMeta}>
              {selectedItem.category} · 담당 {selectedItem.assigneeName ?? '함께'}
            </p>
            <p className={styles.detailMeta}>
              {eventTypeLabel(selectedItem.schedule!.eventType)} · {selectedItem.schedule!.location} · {formatDate(selectedItem.schedule!.scheduledAt)}
            </p>
            {selectedItem.checklist && (
              <p className={styles.detailMeta}>
                체크리스트 마감 {selectedItem.checklist.dueDate} · {selectedItem.checklist.done ? '완료' : '진행중'}
                {' · '}
                <Link to="/wedding/checklist" className={styles.detailLink}>
                  체크리스트에서 보기 →
                </Link>
              </p>
            )}

            {selectedItem.budget && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>예산</p>
                <div className={styles.budgetGrid}>
                  <div className={styles.budgetCell}>
                    <span className={styles.budgetLabel}>예산</span>
                    <span className={styles.budgetValue}>{formatWon(selectedItem.budget.plannedAmount)}</span>
                  </div>
                  <div className={styles.budgetCell}>
                    <span className={styles.budgetLabel}>계약금</span>
                    <span className={styles.budgetValue}>
                      {formatWon(selectedItem.budget.deposit.amount)}
                      {selectedItem.budget.deposit.method && ` · ${selectedItem.budget.deposit.method}`}
                      {selectedItem.budget.deposit.memo && ` (${selectedItem.budget.deposit.memo})`}
                    </span>
                  </div>
                  <div className={styles.budgetCell}>
                    <span className={styles.budgetLabel}>중도금</span>
                    <span className={styles.budgetValue}>
                      {formatWon(selectedItem.budget.interim.amount)}
                      {selectedItem.budget.interim.method && ` · ${selectedItem.budget.interim.method}`}
                      {selectedItem.budget.interim.memo && ` (${selectedItem.budget.interim.memo})`}
                    </span>
                  </div>
                  <div className={styles.budgetCell}>
                    <span className={styles.budgetLabel}>잔금</span>
                    <span className={styles.budgetValue}>
                      {formatWon(selectedItem.budget.balance.amount)}
                      {selectedItem.budget.balance.method && ` · ${selectedItem.budget.balance.method}`}
                      {selectedItem.budget.balance.memo && ` (${selectedItem.budget.balance.memo})`}
                    </span>
                  </div>
                  <div className={styles.budgetCell}>
                    <span className={styles.budgetLabel}>실지출비용</span>
                    <span className={styles.budgetValue}>{formatWon(selectedItem.budget.usedAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedItemNotes.length > 0 && (
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>연결된 상담 노트</p>
                <div className={styles.noteList}>
                  {selectedItemNotes.map((note) => (
                    <Link key={note.id} to="/wedding/consult-notes" className={styles.noteCard}>
                      <p className={styles.noteVendor}>
                        {note.vendorName} <span className={styles.noteType}>({note.vendorType})</span>
                      </p>
                      <p className={styles.noteMeta}>
                        {note.status === 'done' ? '완료' : '예정'} · {note.visitDate}
                      </p>
                      {note.keyMemos.length > 0 && (
                        <ul className={styles.noteMemoList}>
                          {note.keyMemos.map((memo, i) => (
                            <li key={i}>{memo}</li>
                          ))}
                        </ul>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {workspaceId && (
              <ScheduleCommentPanel
                sourceType="wedding_schedule"
                sourceId={selectedItem.id}
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
