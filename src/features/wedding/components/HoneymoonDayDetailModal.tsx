import { useEffect, useState, type ChangeEvent } from 'react';
import { saveHoneymoonDayPhotos } from '../api';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import type { HoneymoonDay, PaymentMethod } from '../types';
import styles from './HoneymoonDayDetailModal.module.css';

const MAX_PHOTOS = 10;
const PAYMENT_METHODS: PaymentMethod[] = ['카드', '현금'];

export interface HoneymoonDayDetailModalProps {
  day: HoneymoonDay;
  onClose: () => void;
  onSave: (patch: Omit<HoneymoonDay, 'id' | 'dayNumber' | 'photos'>) => void;
}

// 일차 상세 — 메모/예산은 부모의 whole-object 저장(save_honeymoon RPC)을 그대로 타고, 사진만
// day.id가 안정적이라는 전제(WeddingHoneymoonView.tsx addDay() 참조) 하에 즉시 업로드/삭제한다.
export function HoneymoonDayDetailModal({ day, onClose, onSave }: HoneymoonDayDetailModalProps) {
  const workspaceId = useCurrentWorkspaceId();
  const [title, setTitle] = useState(day.title);
  const [detail, setDetail] = useState(day.detail);
  const [existingPhotos, setExistingPhotos] = useState(day.photos);
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ file: File; previewUrl: string }[]>([]);
  const [plannedAmount, setPlannedAmount] = useState(day.budget.plannedAmount ? String(day.budget.plannedAmount) : '');
  const [usedAmount, setUsedAmount] = useState(day.budget.usedAmount ? String(day.budget.usedAmount) : '');
  const [method, setMethod] = useState<PaymentMethod | null>(day.budget.method);
  const [memo, setMemo] = useState(day.budget.memo);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const room = MAX_PHOTOS - existingPhotos.length - newPhotos.length;
    const accepted = files.slice(0, Math.max(0, room)).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setNewPhotos((prev) => [...prev, ...accepted]);
    event.target.value = '';
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((prev) => {
      const removed = prev[index];
      if (removed) setRemovedPhotoPaths((paths) => [...paths, removed.path]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSave() {
    if (!title.trim() || !workspaceId) return;
    setIsSaving(true);
    try {
      await saveHoneymoonDayPhotos(workspaceId, day.id, removedPhotoPaths, newPhotos.map((p) => p.file));
      onSave({
        title: title.trim(),
        detail: detail.trim(),
        budget: { plannedAmount: Number(plannedAmount || 0), usedAmount: Number(usedAmount || 0), method, memo },
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <p className={styles.headerTitle}>{day.dayNumber}일차 상세</p>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <label className={styles.label}>제목</label>
        <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className={styles.label}>메모</label>
        <textarea className={styles.textarea} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="이 날의 메모를 남겨보세요" />

        <label className={styles.label}>
          사진 <span className={styles.photoCount}>{existingPhotos.length + newPhotos.length}/{MAX_PHOTOS}</span>
        </label>
        <div className={styles.photoGrid}>
          {existingPhotos.map((photo, i) => (
            <div
              key={`existing-${i}`}
              className={styles.photoThumb}
              style={{ backgroundImage: photo.imageUrl ? `url(${photo.imageUrl})` : undefined, background: photo.imageUrl ? undefined : photo.gradient }}
            >
              <button type="button" className={styles.photoRemove} onClick={() => removeExistingPhoto(i)} aria-label="사진 삭제">
                ✕
              </button>
            </div>
          ))}
          {newPhotos.map((photo, i) => (
            <div key={i} className={styles.photoThumb} style={{ backgroundImage: `url(${photo.previewUrl})` }}>
              <button type="button" className={styles.photoRemove} onClick={() => removeNewPhoto(i)} aria-label="사진 삭제">
                ✕
              </button>
            </div>
          ))}
          {existingPhotos.length + newPhotos.length < MAX_PHOTOS && (
            <label className={styles.photoAdd}>
              +
              <input type="file" accept="image/*" multiple hidden onChange={handlePhotoChange} />
            </label>
          )}
        </div>

        <label className={styles.label}>예산</label>
        <input
          type="number"
          className={styles.input}
          placeholder="0"
          value={plannedAmount}
          onChange={(e) => setPlannedAmount(e.target.value)}
        />

        <label className={styles.label}>실제 지출</label>
        <input type="number" className={styles.input} placeholder="0" value={usedAmount} onChange={(e) => setUsedAmount(e.target.value)} />

        <label className={styles.label}>지출 방식</label>
        <div className={styles.paymentRow}>
          <div className={styles.chipRow}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                className={m === method ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                onClick={() => setMethod(m === method ? null : m)}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type="text"
            className={styles.input}
            placeholder="메모 (예: 현대카드, 계좌이체)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        <button type="button" className={styles.submit} onClick={handleSave} disabled={isSaving}>
          {isSaving ? '저장 중…' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
