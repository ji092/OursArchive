import { useState } from 'react';
import { useDeletePrepItem, useToggleChecklistDone } from '../hooks/useWeddingData';
import type { PrepItem } from '../types';
import styles from './PrepItemRow.module.css';

// 패턴 B(11.3, PHASE3 폴더 규칙) — 결혼 prep_item 전용 리스트 행. 다른 챕터에 재사용하지 않는다.
export interface PrepItemRowProps {
  item: PrepItem;
  onEdit: () => void;
}

export function PrepItemRow({ item, onEdit }: PrepItemRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleDone = useToggleChecklistDone();
  const deleteItem = useDeletePrepItem();
  if (!item.checklist) return null;

  return (
    <div className={styles.row}>
      <button
        type="button"
        className={item.checklist.done ? `${styles.checkbox} ${styles.checkboxChecked}` : styles.checkbox}
        onClick={() => toggleDone.mutate(item.id)}
        aria-label="완료 토글"
      >
        {item.checklist.done && '✓'}
      </button>

      <div className={styles.info}>
        <p className={item.checklist.done ? `${styles.title} ${styles.titleDone}` : styles.title}>{item.title}</p>
        <p className={styles.meta}>
          {item.category} · {item.checklist.dueDate} · 담당 {item.assigneeName ?? '함께'}
        </p>
      </div>

      <div className={styles.menuWrap}>
        <button type="button" className={styles.menuButton} onClick={() => setMenuOpen((v) => !v)} aria-label="더보기">
          ⋮
        </button>
        {menuOpen && (
          <div className={styles.menu}>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
            >
              수정
            </button>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                deleteItem.mutate(item.id);
              }}
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
