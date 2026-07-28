import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePregnancyActionsHost } from '../actionsPortal';
import { useCreateDiary, useDiaries } from '../hooks/usePregnancyData';
import type { Visibility } from '../types';
import { PregnancyDiaryCard } from './PregnancyDiaryCard';
import { PregnancyDiaryModalController } from './PregnancyDiaryModalController';
import styles from './PregnancyAlbumView.module.css';

// 성장 일기(사진 기록) 그리드 — 패턴 A(RecordThumbnail/RecordDetailModal) 재사용.
export function PregnancyAlbumView() {
  const { data: diaries } = useDiaries();
  const createDiary = useCreateDiary();
  const actionsHost = usePregnancyActionsHost();
  const [showForm, setShowForm] = useState(false);
  const [weekNo, setWeekNo] = useState(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isUltrasound, setIsUltrasound] = useState(false);
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));
  const [visibility, setVisibility] = useState<Visibility>('family');

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
    <div className={styles.wrap}>
      {actionsHost &&
        createPortal(
          <button type="button" className={styles.addButton} onClick={() => setShowForm((v) => !v)}>
            + 새 기록
          </button>,
          actionsHost,
        )}

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
        {(diaries ?? []).length === 0 && <p className={styles.empty}>아직 등록된 기록이 없어요.</p>}
      </div>

      <PregnancyDiaryModalController />
    </div>
  );
}
