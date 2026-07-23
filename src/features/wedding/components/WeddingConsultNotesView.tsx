import { useState } from 'react';
import { useCreateConsultNote, useConsultNotes } from '../hooks/useWeddingData';
import type { ConsultNote } from '../types';
import styles from './WeddingConsultNotesView.module.css';

export function WeddingConsultNotesView() {
  const { data: notes } = useConsultNotes();
  const createNote = useCreateConsultNote();
  const [showForm, setShowForm] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ConsultNote['status']>('scheduled');
  const [keyMemos, setKeyMemos] = useState('');
  const [questions, setQuestions] = useState('');

  function handleSubmit() {
    if (!vendorName.trim()) return;
    createNote.mutate(
      {
        vendorName: vendorName.trim(),
        vendorType: vendorType.trim() || '기타',
        visitDate,
        status,
        keyMemos: keyMemos.split('\n').map((line) => line.trim()).filter(Boolean),
        questions: questions.split('\n').map((line) => line.trim()).filter(Boolean),
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setVendorName('');
          setVendorType('');
          setKeyMemos('');
          setQuestions('');
        },
      },
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.title}>상담 노트</p>
        <button type="button" className={styles.addButton} onClick={() => setShowForm((v) => !v)}>
          + 노트 추가
        </button>
      </div>

      {showForm && (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <input className={styles.input} placeholder="업체명" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            <input className={styles.input} placeholder="유형 (웨딩홀/스튜디오 등)" value={vendorType} onChange={(e) => setVendorType(e.target.value)} />
          </div>
          <div className={styles.formRow}>
            <input type="date" className={styles.input} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            <div className={styles.chipRow}>
              <button type="button" className={status === 'scheduled' ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => setStatus('scheduled')}>
                예정
              </button>
              <button type="button" className={status === 'done' ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => setStatus('done')}>
                완료
              </button>
            </div>
          </div>
          <textarea className={styles.textarea} placeholder="핵심 메모 (줄바꿈으로 구분)" value={keyMemos} onChange={(e) => setKeyMemos(e.target.value)} />
          <textarea className={styles.textarea} placeholder="물어볼 것 (줄바꿈으로 구분)" value={questions} onChange={(e) => setQuestions(e.target.value)} />
          <button type="button" className={styles.submit} onClick={handleSubmit}>
            추가하기
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {(notes ?? []).map((note) => (
          <div key={note.id} className={styles.card}>
            <div className={styles.cardHead}>
              <p className={styles.vendorName}>{note.vendorName}</p>
              <span className={note.status === 'done' ? styles.badgeDone : styles.badgeScheduled}>{note.status === 'done' ? '완료' : '예정'}</span>
            </div>
            <p className={styles.vendorMeta}>
              {note.vendorType} · {note.visitDate}
            </p>
            {note.keyMemos.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>핵심 메모</p>
                {note.keyMemos.map((memo, i) => (
                  <p key={i} className={styles.item}>
                    ✓ {memo}
                  </p>
                ))}
              </div>
            )}
            {note.questions.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>물어볼 것</p>
                {note.questions.map((question, i) => (
                  <p key={i} className={styles.item}>
                    ? {question}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
