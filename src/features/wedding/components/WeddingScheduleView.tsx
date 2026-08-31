import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useWeddingActionsHost } from '../actionsPortal';
import { useConsultNotes, useDeleteWeddingSchedule, usePrepItems } from '../hooks/useWeddingData';
import { useCurrentWorkspaceId, useSession } from '@/shared/hooks/useAuth';
import { ScheduleCommentPanel } from '@/shared/components/schedule/ScheduleCommentPanel';
import { useCalendarEvents } from '@/shared/hooks/useCalendarEvents';
import { buildMonthCells, monthCellDateKey, WEEKDAY_LABELS } from '@/shared/lib/schedule/calendarGrid';
import { formatMonthDayWeekdayTime } from '@/shared/lib/date/formatDateTime';
import {
  calendarEventKey,
  filterCalendarEventsByChapter,
  filterCalendarEventsByMonth,
  formatCalendarEventTime,
  groupCalendarEventsByDate,
  sortCalendarEventsForList,
  type CalendarEvent,
} from '@/shared/lib/schedule/calendarEvents';
import { formatWon } from '../deriveStats';
import type { PrepItem, WeddingEventType } from '../types';
import { ScheduleEditModal } from './ScheduleEditModal';
import styles from './WeddingScheduleView.module.css';

export const EVENT_TYPES: WeddingEventType[] = ['상담', '계약', '청첩장모임', '본식', '기타'];
export function eventTypeLabel(type: WeddingEventType): string {
  return type === '청첩장모임' ? '청모' : type;
}

// 타임라인 한 줄에 쓰는 "9월 10일 (목) 오후 2:00" — 시각이 없는 일정은 "시간 미정"으로 끝난다.
function formatEventDateTime(event: CalendarEvent): string {
  const date = new Date(event.startAt);
  const day = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  return `${day} ${formatCalendarEventTime(event)}`;
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const deleteSchedule = useDeleteWeddingSchedule(workspaceId);

  const scheduled = useMemo(
    () =>
      (items ?? [])
        .filter((item) => item.schedule)
        .sort((a, b) => new Date(a.schedule!.scheduledAt).getTime() - new Date(b.schedule!.scheduledAt).getTime()),
    [items],
  );

  const weddingEvents = useMemo(
    () => filterCalendarEventsByChapter(allEvents ?? [], ['wedding']),
    [allEvents],
  );
  const weddingEventsByDate = useMemo(() => groupCalendarEventsByDate(weddingEvents), [weddingEvents]);

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  // 날짜를 고르면 그 날 안에서는 시간순, 고르지 않으면 달력이 보고 있는 달의 일정만
  // 다가오는 것 위·지난 것 아래로 보여준다.
  const selectedDateEvents = selectedDate
    ? (weddingEventsByDate.get(selectedDate) ?? [])
    : sortCalendarEventsForList(filterCalendarEventsByMonth(weddingEvents, year, month));
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
    setIsConfirmingDelete(false);
    if (searchParams.has('event')) {
      const next = new URLSearchParams(searchParams);
      next.delete('event');
      setSearchParams(next, { replace: true });
    }
  }

  function handleSelectDate(day: number) {
    const key = monthCellDateKey(year, month, day);
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
            {/* 일정 탭 타임라인 = 결혼 챕터의 모든 일정. 일정 탭에서 만든 항목과 상담노트·신혼여행이
                한 줄에 같이 선다(2026-08-31 — 그전에는 상담이 따로 놀았다). */}
            {selectedDateEvents.map((event) =>
              event.sourceType === 'wedding_schedule' ? (
                <button
                  key={calendarEventKey(event)}
                  type="button"
                  className={
                    event.sourceId === selectedItemId ? `${styles.timelineItem} ${styles.timelineItemActive}` : styles.timelineItem
                  }
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    setSelectedItemId((prev) => (prev === event.sourceId ? null : event.sourceId));
                  }}
                >
                  <span className={event.badge === '본식' ? `${styles.badge} ${styles.badgeMain}` : styles.badge}>{event.badge}</span>
                  <span className={styles.timelineInfo}>
                    <p className={styles.itemTitle}>{event.title}</p>
                    <p className={styles.itemMeta}>
                      {event.location && `${event.location} · `}
                      {formatEventDateTime(event)}
                    </p>
                  </span>
                </button>
              ) : (
                <Link key={calendarEventKey(event)} to={event.linkTo} className={styles.timelineItem}>
                  <span className={styles.badge}>{event.badge}</span>
                  <span className={styles.timelineInfo}>
                    <p className={styles.itemTitle}>{event.title}</p>
                    <p className={styles.itemMeta}>
                      {event.location && `${event.location} · `}
                      {formatEventDateTime(event)}
                    </p>
                  </span>
                </Link>
              ),
            )}
            {selectedDateEvents.length === 0 && (
              <p className={styles.empty}>{selectedDate ? '이 날 등록된 일정이 없어요.' : `${month + 1}월에 등록된 일정이 없어요.`}</p>
            )}
          </div>
        </div>

        {selectedItem && (
          <div className={styles.detailRow}>
            <div className={styles.detailHead}>
              <p className={styles.detailTitle}>{selectedItem.title}</p>
              <div className={styles.detailActions}>
                <button type="button" className={styles.detailAction} onClick={() => setEditingItem(selectedItem)}>
                  수정
                </button>
                {isConfirmingDelete ? (
                  <>
                    <span className={styles.detailConfirmText}>
                      {selectedItem.checklist || selectedItem.budget ? '일정만 삭제할까요?' : '삭제할까요?'}
                    </span>
                    <button
                      type="button"
                      className={styles.detailActionDanger}
                      disabled={deleteSchedule.isPending}
                      onClick={() =>
                        deleteSchedule.mutate(selectedItem.id, {
                          onSuccess: () => {
                            setIsConfirmingDelete(false);
                            closeDetail();
                          },
                        })
                      }
                    >
                      삭제
                    </button>
                    <button type="button" className={styles.detailAction} onClick={() => setIsConfirmingDelete(false)}>
                      취소
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.detailAction} onClick={() => setIsConfirmingDelete(true)}>
                    삭제
                  </button>
                )}
                <button type="button" className={styles.detailClose} onClick={closeDetail} aria-label="닫기">
                  ✕
                </button>
              </div>
            </div>
            <p className={styles.detailMeta}>
              {selectedItem.category} · 담당 {selectedItem.assigneeName ?? '함께'}
            </p>
            <p className={styles.detailMeta}>
              {eventTypeLabel(selectedItem.schedule!.eventType)} · {selectedItem.schedule!.location} · {formatMonthDayWeekdayTime(selectedItem.schedule!.scheduledAt)}
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
