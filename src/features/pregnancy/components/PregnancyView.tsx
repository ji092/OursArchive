import { useState } from 'react';
import { computeDday, computeCurrentWeek, computeProgressPercent } from '../deriveStats';
import { useCheckups, useCreateDiary, useDiaries, useDueDate, useWeekContent } from '../hooks/usePregnancyData';
import type { Visibility } from '../types';
import { PregnancyDiaryCard } from './PregnancyDiaryCard';
import { PregnancyDiaryModalController } from './PregnancyDiaryModalController';
import styles from './PregnancyView.module.css';

function formatCheckupDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function PregnancyView() {
  const { data: dueDate } = useDueDate();
  const { data: diaries } = useDiaries();
  const { data: checkups } = useCheckups();
  const createDiary = useCreateDiary();
  const [showForm, setShowForm] = useState(false);
  const [weekNo, setWeekNo] = useState(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isUltrasound, setIsUltrasound] = useState(false);
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));
  const [visibility, setVisibility] = useState<Visibility>('family');

  const currentWeek = dueDate ? computeCurrentWeek(dueDate) : 1;
  const dday = dueDate ? computeDday(dueDate) : 0;
  const progress = computeProgressPercent(currentWeek);
  const { data: weekContent } = useWeekContent(currentWeek);
  const nextCheckup = checkups?.find((c) => c.status === 'upcoming');

  function handleCreate() {
    if (!title.trim() || !body.trim()) return;
    createDiary.mutate(
      { weekNo, title: title.trim(), body: body.trim(), isUltrasound, recordedAt, visibility },
      {
        onSuccess: () => {
          setShowForm(false);
          setTitle('');
          setBody('');
        },
      },
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>PREGNANCY · BABY</p>
          <h1 className={styles.title}>
            우리가 <span className={styles.titleAccent}>셋이,</span>
          </h1>
          <p className={styles.subtitle}>
            {dueDate ? (
              <>
                {currentWeek}주차 · 예정일 {dueDate} · D{dday > 0 ? '-' : '+'}
                {Math.abs(dday)}
              </>
            ) : (
              '예정일 -'
            )}
          </p>
        </div>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>주차</span>
            <span className={styles.summaryValue}>{currentWeek}주</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>아기 크기</span>
            <span className={styles.summaryValue}>{weekContent?.sizeMetaphor ?? '-'} 크기</span>
          </div>
        </div>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.progressLabels}>
        <span>1주</span>
        <span>만나기 까지 {progress}%</span>
        <span>40주</span>
      </div>

      {weekContent && (
        <section className={styles.thisWeek}>
          <p className={styles.thisWeekTitle}>THIS WEEK</p>
          <p className={styles.thisWeekBody}>{weekContent.development}</p>
          <p className={styles.thisWeekTip}>💡 {weekContent.motherTip}</p>
        </section>
      )}

      <div className={styles.grid}>
        <section>
          <div className={styles.sectionHead}>
            <p className={styles.sectionTitle}>성장 일기</p>
            <button type="button" className={styles.addButton} onClick={() => setShowForm((v) => !v)}>
              + 새 기록
            </button>
          </div>

          {showForm && (
            <div className={styles.form}>
              <div className={styles.formRow}>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="주차"
                  value={weekNo}
                  min={1}
                  max={40}
                  onChange={(e) => setWeekNo(Number(e.target.value))}
                />
                <input type="date" className={styles.input} value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
              </div>
              <input className={styles.input} placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className={styles.textarea} placeholder="내용" value={body} onChange={(e) => setBody(e.target.value)} />
              <div className={styles.formRow}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={isUltrasound} onChange={(e) => setIsUltrasound(e.target.checked)} />
                  초음파 사진이에요
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={visibility === 'family'} onChange={(e) => setVisibility(e.target.checked ? 'family' : 'couple')} />
                  가족과 공유
                </label>
              </div>
              <button type="button" className={styles.submit} onClick={handleCreate}>
                기록 저장하기
              </button>
            </div>
          )}

          <div className={styles.diaryGrid}>
            {(diaries ?? []).map((diary) => (
              <PregnancyDiaryCard key={diary.id} diary={diary} />
            ))}
          </div>
        </section>

        <section className={styles.sideCard}>
          <p className={styles.sectionTitle}>NEXT CHECKUP</p>
          {nextCheckup ? (
            <div>
              <p className={styles.nextCheckupTitle}>{nextCheckup.title}</p>
              <p className={styles.nextCheckupMeta}>
                {nextCheckup.hospital} · {nextCheckup.doctor}
              </p>
              <p className={styles.nextCheckupMeta}>📅 {formatCheckupDate(nextCheckup.scheduledAt)}</p>
              {nextCheckup.note && <p className={styles.nextCheckupNote}>📌 {nextCheckup.note}</p>}
            </div>
          ) : (
            <p className={styles.empty}>예정된 검진이 없어요.</p>
          )}

          <p className={styles.sectionTitle} style={{ marginTop: 20 }}>
            검진 일정
          </p>
          {(checkups ?? []).map((checkup) => (
            <div key={checkup.id} className={styles.checkupRow}>
              <span className={checkup.status === 'done' ? styles.checkDone : styles.checkPending}>
                {checkup.status === 'done' ? '✓' : '○'}
              </span>
              <div>
                <p className={styles.checkupTitle}>{checkup.title}</p>
                <p className={styles.checkupMeta}>{checkup.hospital}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <PregnancyDiaryModalController />
    </main>
  );
}
