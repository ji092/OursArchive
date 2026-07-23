import { useState } from 'react';
import { useConsultNotes } from '../hooks/useWeddingData';
import type { PrepItem, WeddingCategory } from '../types';
import styles from './PrepItemEditForm.module.css';

// 패턴 B(11.3, PHASE3 폴더 규칙) — 결혼 prep_item 전용 속성 편집 폼. 다른 챕터에 재사용하지 않는다.
// Readdy 프론트 목업(2026-07-22 검토)에서 확인한 필드 구성 그대로: 제목/카테고리/마감날짜/담당/
// 상담노트 연결(다대다)/예산(선택) — 체크리스트 탭 전용이라 일정(schedule) 필드는 여기 없다.
const CATEGORIES: WeddingCategory[] = ['웨딩홀', '스드메', '예물예단', '청첩장', '신혼여행', '혼수', '기타'];
const ASSIGNEES = ['지우', '현우'] as const;

export interface PrepItemEditFormValues {
  title: string;
  category: WeddingCategory;
  assigneeName: string | null;
  dueDate: string;
  consultNoteIds: string[];
  plannedAmount: string;
}

export interface PrepItemEditFormProps {
  item?: PrepItem;
  onClose: () => void;
  onSubmit: (values: PrepItemEditFormValues) => void;
}

export function PrepItemEditForm({ item, onClose, onSubmit }: PrepItemEditFormProps) {
  const { data: consultNotes } = useConsultNotes();
  const [title, setTitle] = useState(item?.title ?? '');
  const [category, setCategory] = useState<WeddingCategory>(item?.category ?? CATEGORIES[0]);
  const [assigneeName, setAssigneeName] = useState<string | null>(item?.assigneeName ?? null);
  const [dueDate, setDueDate] = useState(item?.checklist?.dueDate ?? new Date().toISOString().slice(0, 10));
  const [consultNoteIds, setConsultNoteIds] = useState<string[]>(item?.consultNoteIds ?? []);
  const [plannedAmount, setPlannedAmount] = useState(item?.budget ? String(item.budget.plannedAmount) : '');

  function toggleConsultNote(id: string) {
    setConsultNoteIds((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  }

  function handleSubmit() {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), category, assigneeName, dueDate, consultNoteIds, plannedAmount });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <p className={styles.headerTitle}>{item ? '항목 수정' : '항목 추가'}</p>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <label className={styles.label}>제목</label>
        <input className={styles.input} value={title} onChange={(event) => setTitle(event.target.value)} />

        <label className={styles.label}>카테고리</label>
        <div className={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={c === category ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>마감날짜</label>
            <input type="date" className={styles.input} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <p className={styles.hint}>변경 시 일정에 자동 반영</p>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>담당</label>
            <div className={styles.chipRow}>
              {ASSIGNEES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={name === assigneeName ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  onClick={() => setAssigneeName(name)}
                >
                  {name}
                </button>
              ))}
              <button
                type="button"
                className={assigneeName === null ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                onClick={() => setAssigneeName(null)}
              >
                함께
              </button>
            </div>
          </div>
        </div>

        <label className={styles.label}>내용 (상담노트 연결)</label>
        <div className={styles.noteList}>
          {(consultNotes ?? []).map((note) => (
            <label key={note.id} className={styles.noteCheck}>
              <input
                type="checkbox"
                checked={consultNoteIds.includes(note.id)}
                onChange={() => toggleConsultNote(note.id)}
              />
              {note.vendorName} ({note.vendorType})
            </label>
          ))}
        </div>

        <label className={styles.label}>예산 (선택)</label>
        <input
          type="number"
          className={styles.input}
          placeholder="0"
          value={plannedAmount}
          onChange={(event) => setPlannedAmount(event.target.value)}
        />
        <p className={styles.hint}>입력 시 &apos;{category}&apos; 항목으로 예산에 반영</p>

        <button type="button" className={styles.submit} onClick={handleSubmit}>
          저장하기
        </button>
      </div>
    </div>
  );
}

// item이 있으면(수정) 기존 done/usedAmount를 보존하고, 없으면(신규 생성) 기본값(false/0)으로 채운다.
export function toPrepItemPatch(values: PrepItemEditFormValues, item?: PrepItem): Partial<Omit<PrepItem, 'id'>> {
  return {
    title: values.title,
    category: values.category,
    assigneeName: values.assigneeName,
    checklist: { done: item?.checklist?.done ?? false, dueDate: values.dueDate },
    consultNoteIds: values.consultNoteIds,
    budget: values.plannedAmount
      ? { plannedAmount: Number(values.plannedAmount), usedAmount: item?.budget?.usedAmount ?? 0 }
      : undefined,
  };
}
