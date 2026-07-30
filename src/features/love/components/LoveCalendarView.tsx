import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { useLovePlans } from '../hooks/useLovePlans';
import { useLoveRecords } from '../hooks/useLoveRecords';
import { LoveRecordDetailModalController } from './LoveRecordDetailModalController';
import styles from './LoveCalendarView.module.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function LoveCalendarView() {
  const { session } = useSession();
  const { data: membership } = useMyMembership(session?.user.id);
  const { data: records } = useLoveRecords(membership?.workspaceId);
  const { data: plans } = useLovePlans(membership?.workspaceId);
  const [, setSearchParams] = useSearchParams();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, typeof records>();
    for (const record of records ?? []) {
      const key = toDateKey(record.recordedAt);
      const bucket = map.get(key) ?? [];
      bucket.push(record);
      map.set(key, bucket as NonNullable<typeof records>);
    }
    return map;
  }, [records]);

  const plansByDate = useMemo(() => {
    const map = new Map<string, typeof plans>();
    for (const plan of plans ?? []) {
      const bucket = map.get(plan.plannedAt) ?? [];
      bucket.push(plan);
      map.set(plan.plannedAt, bucket as NonNullable<typeof plans>);
    }
    return map;
  }, [plans]);

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDayOfMonth.getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function goToMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDateKey(null);
  }

  const selectedRecords = selectedDateKey ? (recordsByDate.get(selectedDateKey) ?? []) : [];

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
        {WEEKDAYS.map((day) => (
          <span key={day} className={styles.weekday}>
            {day}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <div key={`blank-${index}`} className={styles.cellBlank} />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayRecords = recordsByDate.get(dateKey) ?? [];
          const dayPlans = plansByDate.get(dateKey) ?? [];
          const isSelected = dateKey === selectedDateKey;
          return (
            <button
              key={dateKey}
              type="button"
              className={isSelected ? `${styles.cell} ${styles.cellSelected}` : styles.cell}
              onClick={() => setSelectedDateKey(isSelected ? null : dateKey)}
            >
              <span className={styles.cellDate}>{day}</span>
              {dayRecords.length > 0 && (
                <span className={styles.cellMarker}>
                  <img src="/icons/camera.png" alt="" width={20} height={20} />
                  {dayRecords.length > 1 && <span className={styles.cellMarkerCount}>{dayRecords.length}</span>}
                </span>
              )}
              {dayPlans.length > 0 && (
                <span className={styles.cellSchedule} title={dayPlans.map((plan) => plan.title).join(', ')}>
                  {dayPlans.map((plan) => (
                    <span key={plan.id} className={styles.cellScheduleDot} />
                  ))}
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
          {selectedRecords.length === 0 && <p className={styles.dayPanelEmpty}>이 날의 기록이 없어요.</p>}
          {selectedRecords.map((record) => (
            <button
              key={record.id}
              type="button"
              className={styles.dayPanelItem}
              onClick={() => setSearchParams({ record: record.id })}
            >
              <span className={styles.dayPanelItemAuthor}>{record.authorName}</span>
              <span className={styles.dayPanelItemBody}>{record.body}</span>
              <span className={styles.dayPanelItemPlace}>📍 {record.placeName}</span>
            </button>
          ))}
        </div>
      )}

      <LoveRecordDetailModalController />
    </div>
  );
}
