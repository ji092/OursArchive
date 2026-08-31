import { useMemo, useState } from 'react';
import { IconClock, IconPin, IconTrash } from '@/shared/components/ui/icons';
import { useSearchParams } from 'react-router-dom';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { ScheduleCommentPanel } from '@/shared/components/schedule/ScheduleCommentPanel';
import { CalendarEventList } from '@/shared/components/schedule/CalendarEventList';
import { useCalendarEvents } from '@/shared/hooks/useCalendarEvents';
import { groupCalendarEventsByDate, localDateKey } from '@/shared/lib/schedule/calendarEvents';
import { buildMonthCells, monthCellDateKey, WEEKDAY_LABELS } from '@/shared/lib/schedule/calendarGrid';
import { useDeleteLovePlan } from '../hooks/useCreateLovePlan';
import { useLovePlans } from '../hooks/useLovePlans';
import { useLoveRecords } from '../hooks/useLoveRecords';
import { LoveRecordDetailModalController } from './LoveRecordDetailModalController';
import styles from './LoveCalendarView.module.css';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const ampm = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${ampm} ${hour12}:${minutes}`;
}

export interface LoveCalendarViewProps {
  // 메인 달력(대시보드)만 다른 챕터 일정까지 함께 보여준다. 연애 탭 달력은 연애 일정만 —
  // "각 챕터 일정은 그 챕터 달력과 메인 달력 두 곳에 나온다"는 규칙(2026-08-31 사용자 지정).
  includeOtherChapters?: boolean;
}

export function LoveCalendarView({ includeOtherChapters = false }: LoveCalendarViewProps = {}) {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);
  const { data: records } = useLoveRecords(membership?.workspaceId);
  const { data: plans } = useLovePlans(membership?.workspaceId);
  // 메인 달력 = 챕터를 가리지 않는 전체 일정(연애 일정·결혼 일정/상담노트/신혼여행·임신 일정/검진).
  // 연애 기록(love_record)과 연애 일정(love_plan)은 이 화면 고유 표시라 따로 유지한다 (2026-08-31).
  const { data: calendarEvents } = useCalendarEvents(includeOtherChapters ? membership?.workspaceId : undefined);
  const [, setSearchParams] = useSearchParams();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const deletePlan = useDeleteLovePlan(membership?.workspaceId);

  function handleDeletePlan(planId: string) {
    deletePlan.mutate(planId, {
      onSuccess: () => {
        setConfirmingId(null);
        setSelectedPlanId((prev) => (prev === planId ? null : prev));
      },
    });
  }

  const recordsByDate = useMemo(() => {
    const map = new Map<string, typeof records>();
    for (const record of records ?? []) {
      const key = localDateKey(record.recordedAt);
      const bucket = map.get(key) ?? [];
      bucket.push(record);
      map.set(key, bucket as NonNullable<typeof records>);
    }
    return map;
  }, [records]);

  const plansByDate = useMemo(() => {
    const map = new Map<string, typeof plans>();
    for (const plan of plans ?? []) {
      const key = localDateKey(plan.plannedAtFull);
      const bucket = map.get(key) ?? [];
      bucket.push(plan);
      map.set(key, bucket as NonNullable<typeof plans>);
    }
    return map;
  }, [plans]);

  // 연애 일정은 love_plan 목록으로 이미 그리고 있으므로, 통합 일정에서는 중복을 걸러낸다.
  const otherChapterEventsByDate = useMemo(
    () => groupCalendarEventsByDate((calendarEvents ?? []).filter((event) => event.sourceType !== 'love_plan')),
    [calendarEvents],
  );

  // 이 달력은 마지막 줄 빈 칸을 그리지 않는다(칸에 테두리가 있어 빈 상자가 남는다).
  const cells = buildMonthCells(year, month, { padTrailing: false });

  function goToMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDateKey(null);
    setSelectedPlanId(null);
    setConfirmingId(null);
  }

  const selectedRecords = selectedDateKey ? (recordsByDate.get(selectedDateKey) ?? []) : [];
  const selectedPlans = selectedDateKey ? (plansByDate.get(selectedDateKey) ?? []) : [];
  const selectedOtherEvents = selectedDateKey ? (otherChapterEventsByDate.get(selectedDateKey) ?? []) : [];

  return (
    <div>
      <div className={styles.header}>
        <button type="button" className={styles.navButton} onClick={() => goToMonth(-1)} aria-label="이전 달">
          ‹
        </button>
        <span className={styles.monthLabel}>
          {year}. {String(month + 1).padStart(2, '0')}
        </span>
        <button type="button" className={styles.navButton} onClick={() => goToMonth(1)} aria-label="다음 달">
          ›
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((day) => (
          <span key={day} className={styles.weekday}>
            {day}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <div key={`blank-${index}`} className={styles.cellBlank} />;
          const dateKey = monthCellDateKey(year, month, day);
          const dayRecords = recordsByDate.get(dateKey) ?? [];
          const dayPlans = plansByDate.get(dateKey) ?? [];
          const dayOtherEvents = otherChapterEventsByDate.get(dateKey) ?? [];
          const isSelected = dateKey === selectedDateKey;
          const hasPlan = dayPlans.length > 0 || dayOtherEvents.length > 0;
          return (
            <button
              key={dateKey}
              type="button"
              className={isSelected ? `${styles.cell} ${styles.cellSelected}` : styles.cell}
              onClick={() => {
                setSelectedDateKey(isSelected ? null : dateKey);
                setSelectedPlanId(null);
                setConfirmingId(null);
              }}
            >
              <span
                className={hasPlan ? `${styles.cellDate} ${styles.cellDateHasPlan}` : styles.cellDate}
                title={
                  hasPlan
                    ? [...dayPlans.map((plan) => plan.title), ...dayOtherEvents.map((event) => event.title)].join(', ')
                    : undefined
                }
              >
                {day}
              </span>
              {dayRecords.length > 0 && (
                <span className={styles.cellMarker}>
                  <img src="/icons/camera.png" alt="" width={10} height={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDateKey && (
        <div className={styles.dayPanel}>
          <div className={styles.dayPanelHeader}>
            <p className={styles.dayPanelTitle}>{selectedDateKey}의 기록</p>
            <button type="button" className={styles.dayPanelClose} onClick={() => setSelectedDateKey(null)} aria-label="닫기">
              ✕
            </button>
          </div>
          {selectedPlans.length > 0 && (
            <div className={styles.dayPanelPlans}>
              {selectedPlans.map((plan) => (
                <div key={plan.id} className={styles.dayPanelPlanRow}>
                  <button
                    type="button"
                    className={styles.dayPanelPlanItem}
                    onClick={() => setSelectedPlanId((prev) => (prev === plan.id ? null : plan.id))}
                  >
                    <span className={styles.dayPanelPlanDot} />
                    <div>
                      <p className={styles.dayPanelItemBody}>{plan.title}</p>
                      <p className={styles.dayPanelItemPlace}>
                        <IconClock /> {formatTime(plan.plannedAtFull)}
                        {plan.placeName ? (
                          <>
                            {' · '}
                            <IconPin /> {plan.placeName}
                          </>
                        ) : null}
                      </p>
                    </div>
                  </button>
                  {confirmingId === plan.id ? (
                    <span className={styles.confirmRow}>
                      <span className={styles.confirmText}>삭제할까요?</span>
                      <button
                        type="button"
                        className={styles.confirmDelete}
                        disabled={deletePlan.isPending}
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        삭제
                      </button>
                      <button type="button" className={styles.confirmCancel} onClick={() => setConfirmingId(null)}>
                        취소
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.planDelete}
                      onClick={() => setConfirmingId(plan.id)}
                      aria-label={`${plan.title} 일정 삭제`}
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              ))}
              {selectedPlanId && membership?.workspaceId && (
                <ScheduleCommentPanel
                  sourceType="love_plan"
                  sourceId={selectedPlanId}
                  workspaceId={membership.workspaceId}
                  currentUserId={session?.user.id}
                />
              )}
            </div>
          )}
          <CalendarEventList events={selectedOtherEvents} title="다른 챕터 일정" />
          {selectedRecords.length === 0 && selectedPlans.length === 0 && selectedOtherEvents.length === 0 && (
            <p className={styles.dayPanelEmpty}>이 날의 기록이 없어요.</p>
          )}
          {selectedRecords.map((record) => (
            <button
              key={record.id}
              type="button"
              className={styles.dayPanelItem}
              onClick={() => setSearchParams({ record: record.id })}
            >
              <span className={styles.dayPanelItemAuthor}>{record.authorName}</span>
              <span className={styles.dayPanelItemBody}>{record.body}</span>
              <span className={styles.dayPanelItemPlace}><IconPin /> {record.placeName}</span>
            </button>
          ))}
        </div>
      )}

      <LoveRecordDetailModalController />
    </div>
  );
}
