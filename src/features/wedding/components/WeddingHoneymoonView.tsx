import { useState } from 'react';
import { computeCategoryBudget, formatWon } from '../deriveStats';
import { useHoneymoon, usePrepItems, useUpdateHoneymoon } from '../hooks/useWeddingData';
import styles from './WeddingHoneymoonView.module.css';

export function WeddingHoneymoonView() {
  const { data: honeymoon } = useHoneymoon();
  const { data: items } = usePrepItems();
  const updateHoneymoon = useUpdateHoneymoon();
  const [editing, setEditing] = useState(false);
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!honeymoon || !items) return <p>불러오는 중…</p>;

  const budget = computeCategoryBudget(items)['신혼여행'];
  const nights = Math.max(0, Math.round((new Date(honeymoon.endDate).getTime() - new Date(honeymoon.startDate).getTime()) / 86400000));

  function startEdit() {
    setDestination(honeymoon!.destination);
    setStartDate(honeymoon!.startDate);
    setEndDate(honeymoon!.endDate);
    setEditing(true);
  }

  function saveEdit() {
    updateHoneymoon.mutate({ ...honeymoon!, destination, startDate, endDate }, { onSuccess: () => setEditing(false) });
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
          {honeymoon.days.map((day) => (
            <div key={day.dayNumber} className={styles.dayRow}>
              <span className={styles.dayNumber}>{day.dayNumber}</span>
              <div>
                <p className={styles.dayTitle}>{day.title}</p>
                <p className={styles.dayDetail}>{day.detail}</p>
              </div>
            </div>
          ))}
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
              <span className={styles.infoLabel}>사용</span>
              <span className={styles.infoValue}>{formatWon(budget.used)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>잔여</span>
              <span className={styles.infoValue}>{formatWon(budget.planned - budget.used)}</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${budget.planned === 0 ? 0 : Math.min(Math.round((budget.used / budget.planned) * 100), 100)}%` }}
              />
            </div>
          </>
        ) : (
          <p className={styles.empty}>예산 탭에서 &apos;신혼여행&apos; 카테고리 예산을 등록해보세요.</p>
        )}
        <p className={styles.editHint}>예산 탭에서 수정하기 →</p>
      </section>
    </div>
  );
}
