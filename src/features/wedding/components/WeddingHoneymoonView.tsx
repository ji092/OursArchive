import { useState } from 'react';
import { computeCategoryBudget, formatWon } from '../deriveStats';
import { useHoneymoon, usePrepItems, useUpdateHoneymoon } from '../hooks/useWeddingData';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import type { Honeymoon, HoneymoonDay } from '../types';
import { HoneymoonDayDetailModal } from './HoneymoonDayDetailModal';
import styles from './WeddingHoneymoonView.module.css';

const EMPTY_HONEYMOON: Honeymoon = { destination: '', startDate: '', endDate: '', days: [] };

function renumber(days: HoneymoonDay[]): HoneymoonDay[] {
  return days.map((day, index) => ({ ...day, dayNumber: index + 1 }));
}

export function WeddingHoneymoonView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: fetchedHoneymoon, isLoading } = useHoneymoon(workspaceId);
  const { data: items } = usePrepItems(workspaceId);
  const updateHoneymoon = useUpdateHoneymoon(workspaceId);
  const [editing, setEditing] = useState(false);
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const [daysEditMode, setDaysEditMode] = useState(false);

  if (isLoading || !items) return <p>불러오는 중…</p>;
  const honeymoon = fetchedHoneymoon ?? EMPTY_HONEYMOON;

  const budget = computeCategoryBudget(items)['신혼여행'];
  const nights = Math.max(0, Math.round((new Date(honeymoon.endDate).getTime() - new Date(honeymoon.startDate).getTime()) / 86400000));
  const openDay = openDayId ? honeymoon.days.find((d) => d.id === openDayId) : undefined;

  function startEdit() {
    setDestination(honeymoon!.destination);
    setStartDate(honeymoon!.startDate);
    setEndDate(honeymoon!.endDate);
    setEditing(true);
  }

  function saveEdit() {
    updateHoneymoon.mutate({ ...honeymoon!, destination, startDate, endDate }, { onSuccess: () => setEditing(false) });
  }

  function saveDays(days: HoneymoonDay[]) {
    updateHoneymoon.mutate({ ...honeymoon!, days: renumber(days) });
  }

  function addDay() {
    const newDay: HoneymoonDay = {
      id: crypto.randomUUID(),
      dayNumber: honeymoon!.days.length + 1,
      title: `${honeymoon!.days.length + 1}일차`,
      detail: '',
      photos: [],
      budget: { plannedAmount: 0, usedAmount: 0, method: null, memo: '' },
    };
    saveDays([...honeymoon!.days, newDay]);
    setOpenDayId(newDay.id);
  }

  function removeDay(id: string) {
    saveDays(honeymoon!.days.filter((day) => day.id !== id));
  }

  function moveDay(id: string, direction: -1 | 1) {
    const index = honeymoon!.days.findIndex((day) => day.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= honeymoon!.days.length) return;
    const next = [...honeymoon!.days];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    saveDays(next);
  }

  function saveDayDetail(id: string, patch: Omit<HoneymoonDay, 'id' | 'dayNumber' | 'photos'>) {
    saveDays(honeymoon!.days.map((day) => (day.id === id ? { ...day, ...patch } : day)));
    setOpenDayId(null);
  }

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.overviewHead}>
          <p className={styles.destination}>
            {honeymoon.destination} · {nights}박 {nights + 1}일
          </p>
          <button type="button" className={styles.editButton} onClick={editing ? saveEdit : startEdit}>
            {editing ? '저장' : '✏️'}
          </button>
        </div>

        {editing ? (
          <div className={styles.editForm}>
            <input className={styles.input} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="여행지" />
            <div className={styles.formRow}>
              <input type="date" className={styles.input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="date" className={styles.input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        ) : (
          <p className={styles.dateRange}>
            {honeymoon.startDate} ~ {honeymoon.endDate}
          </p>
        )}

        <div className={styles.days}>
          {honeymoon.days.map((day, index) => (
            <div key={day.id} className={styles.dayRow}>
              <span className={styles.dayNumber}>{day.dayNumber}</span>
              <button type="button" className={styles.dayBody} onClick={() => setOpenDayId(day.id)}>
                <p className={styles.dayTitle}>{day.title}</p>
                <p className={styles.dayDetail}>{day.detail || '메모 없음'}</p>
                {day.photos.length > 0 && <p className={styles.dayPhotoCount}>사진 {day.photos.length}장</p>}
                {day.budget.plannedAmount > 0 && (
                  <>
                    <p className={styles.dayBudgetLabel}>
                      {formatWon(day.budget.usedAmount)} / {formatWon(day.budget.plannedAmount)}
                    </p>
                    <div className={styles.dayProgressTrack}>
                      <div
                        className={styles.dayProgressFill}
                        style={{ width: `${Math.min(Math.round((day.budget.usedAmount / day.budget.plannedAmount) * 100), 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </button>
              {daysEditMode && (
                <div className={styles.dayActions}>
                  <button
                    type="button"
                    className={styles.dayActionButton}
                    onClick={() => moveDay(day.id, -1)}
                    disabled={index === 0}
                    aria-label="위로 이동"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.dayActionButton}
                    onClick={() => moveDay(day.id, 1)}
                    disabled={index === honeymoon.days.length - 1}
                    aria-label="아래로 이동"
                  >
                    ↓
                  </button>
                  <button type="button" className={styles.dayActionButton} onClick={() => removeDay(day.id)} aria-label="삭제">
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.daysFooter}>
          <button type="button" className={styles.addDayButton} onClick={addDay}>
            + 일정 추가
          </button>
          <button type="button" className={styles.editDaysButton} onClick={() => setDaysEditMode((v) => !v)}>
            {daysEditMode ? '완료' : '순서·삭제 편집'}
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>여행 정보</p>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>여행지</span>
          <span className={styles.infoValue}>{honeymoon.destination}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>기간</span>
          <span className={styles.infoValue}>
            {nights}박 {nights + 1}일
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>날짜</span>
          <span className={styles.infoValue}>
            {honeymoon.startDate} ~ {honeymoon.endDate}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>총 일정</span>
          <span className={styles.infoValue}>{honeymoon.days.length}개</span>
        </div>

        <p className={styles.cardTitle} style={{ marginTop: 20 }}>
          예산 현황
        </p>
        {budget ? (
          <>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>계획</span>
              <span className={styles.infoValue}>{formatWon(budget.planned)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>실지출</span>
              <span className={styles.infoValue}>{formatWon(budget.used)}</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${budget.planned === 0 ? 0 : Math.min(Math.round((budget.used / budget.planned) * 100), 100)}%`,
                }}
              />
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>지출나갈돈</span>
              <span className={styles.infoValue}>{formatWon(budget.planned - budget.used)}</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${budget.planned === 0 ? 0 : Math.min(Math.round((Math.max(budget.planned - budget.used, 0) / budget.planned) * 100), 100)}%`,
                }}
              />
            </div>
          </>
        ) : (
          <p className={styles.empty}>예산 탭에서 &apos;신혼여행&apos; 카테고리 예산을 등록해보세요.</p>
        )}
        <p className={styles.editHint}>예산 탭에서 수정하기 →</p>
      </section>

      {openDay && (
        <HoneymoonDayDetailModal
          day={openDay}
          onClose={() => setOpenDayId(null)}
          onSave={(patch) => saveDayDetail(openDay.id, patch)}
        />
      )}
    </div>
  );
}
