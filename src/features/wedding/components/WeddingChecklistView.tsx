import { useState } from 'react';
import { useCreatePrepItem, usePrepItems, useUpdatePrepItem } from '../hooks/useWeddingData';
import type { PrepItem } from '../types';
import { PrepItemEditForm, toPrepItemPatch, type PrepItemEditFormValues } from './PrepItemEditForm';
import { PrepItemRow } from './PrepItemRow';
import styles from './WeddingChecklistView.module.css';

export function WeddingChecklistView() {
  const { data: items } = usePrepItems();
  const createItem = useCreatePrepItem();
  const updateItem = useUpdatePrepItem();
  const [editingItem, setEditingItem] = useState<PrepItem | 'new' | null>(null);

  const checklistItems = (items ?? []).filter((item) => item.checklist);

  function handleSubmit(values: PrepItemEditFormValues) {
    if (editingItem === 'new') {
      createItem.mutate(
        {
          title: values.title,
          category: values.category,
          assigneeName: values.assigneeName,
          checklist: { dueDate: values.dueDate },
          consultNoteIds: values.consultNoteIds,
          budget: values.plannedAmount ? { plannedAmount: Number(values.plannedAmount) } : undefined,
        },
        { onSuccess: () => setEditingItem(null) },
      );
      return;
    }
    if (editingItem) {
      updateItem.mutate(
        { id: editingItem.id, patch: toPrepItemPatch(values, editingItem) },
        { onSuccess: () => setEditingItem(null) },
      );
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <p className={styles.title}>체크리스트</p>
        <button type="button" className={styles.addButton} onClick={() => setEditingItem('new')}>
          + 항목 추가
        </button>
      </div>

      <div className={styles.list}>
        {checklistItems.map((item) => (
          <PrepItemRow key={item.id} item={item} onEdit={() => setEditingItem(item)} />
        ))}
        {checklistItems.length === 0 && <p className={styles.empty}>아직 등록된 항목이 없어요.</p>}
      </div>

      {editingItem && (
        <PrepItemEditForm
          item={editingItem === 'new' ? undefined : editingItem}
          onClose={() => setEditingItem(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
