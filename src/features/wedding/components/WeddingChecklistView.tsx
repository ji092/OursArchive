import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWeddingActionsHost } from '../actionsPortal';
import { useCreatePrepItem, usePrepItems, useUpdatePrepItem } from '../hooks/useWeddingData';
import { useCurrentWorkspaceId, useSession } from '@/shared/hooks/useAuth';
import type { PrepItem, WeddingCategory } from '../types';
import { buildBudget, CATEGORIES, PrepItemEditForm, toPrepItemPatch, type PrepItemEditFormValues } from './PrepItemEditForm';
import { PrepItemRow } from './PrepItemRow';
import { createScheduleAck } from '@/shared/lib/schedule/scheduleAckApi';
import { reportFailure } from '@/shared/lib/notice/failureNotice';
import styles from './WeddingChecklistView.module.css';

type SortMode = 'all' | 'category' | 'date';

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.6 12.6L12.6 4.6c-.4-.4-.9-.6-1.4-.6H5a1 1 0 0 0-1 1v6.2c0 .5.2 1 .6 1.4l8 8c.8.8 2 .8 2.8 0l5.2-5.2c.8-.8.8-2 0-2.8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.2 8.2h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SORT_OPTIONS: { mode: SortMode; label: string; icon: () => JSX.Element }[] = [
  { mode: 'all', label: '전체', icon: ListIcon },
  { mode: 'category', label: '카테고리별', icon: TagIcon },
  { mode: 'date', label: '날짜별', icon: CalendarIcon },
];

export function WeddingChecklistView() {
  const workspaceId = useCurrentWorkspaceId();
  const { session } = useSession();
  const { data: items } = usePrepItems(workspaceId);
  const createItem = useCreatePrepItem(workspaceId);
  const updateItem = useUpdatePrepItem(workspaceId);
  const actionsHost = useWeddingActionsHost();
  const [editingItem, setEditingItem] = useState<PrepItem | 'new' | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<WeddingCategory | null>(null);

  const checklistItems = (items ?? []).filter((item) => item.checklist);

  function handleSortModeChange(mode: SortMode) {
    setSortMode(mode);
    setCategoryFilter(null);
  }

  function handleSubmit(values: PrepItemEditFormValues) {
    const userId = session?.user.id;
    // 체크리스트 기한도 알림 대상 일정이다(2026-09-03). 항목은 이미 저장된 뒤라 확인 요청
    // 등록이 실패해도 되돌리지 않고 알리기만 한다.
    function ack(itemId: string) {
      if (!userId || !workspaceId) return;
      createScheduleAck({
        sourceType: 'checklist_due',
        sourceId: itemId,
        workspaceId,
        createdBy: userId,
        ackRole: values.ackRole,
      }).catch((cause) => reportFailure('항목은 저장됐지만 기한 알림 설정에 실패했어요. 항목을 다시 저장해주세요.', cause));
    }

    if (editingItem === 'new') {
      if (!workspaceId) return;
      createItem.mutate(
        {
          workspaceId,
          title: values.title,
          category: values.category,
          assigneeId: values.assigneeId,
          checklist: { dueDate: values.dueDate },
          consultNoteIds: values.consultNoteIds,
          budget: buildBudget(values),
        },
        { onSuccess: (newId) => { ack(newId); setEditingItem(null); } },
      );
      return;
    }
    if (editingItem) {
      const itemId = editingItem.id;
      updateItem.mutate(
        { id: itemId, patch: toPrepItemPatch(values, editingItem) },
        { onSuccess: () => { ack(itemId); setEditingItem(null); } },
      );
    }
  }

  const dateSortedItems =
    sortMode === 'date'
      ? [...checklistItems].sort((a, b) => a.checklist!.dueDate.localeCompare(b.checklist!.dueDate))
      : checklistItems;

  const categoryFilteredItems = categoryFilter ? checklistItems.filter((item) => item.category === categoryFilter) : [];

  const showCategoryGroups = sortMode === 'category' && !categoryFilter;
  const showFlatList = !showCategoryGroups;
  const flatListItems = sortMode === 'category' ? categoryFilteredItems : dateSortedItems;

  const actionsNode = (
    <>
      <div className={styles.sortGroup}>
        {SORT_OPTIONS.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            className={mode === sortMode ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
            onClick={() => handleSortModeChange(mode)}
            aria-label={label}
            title={label}
          >
            <Icon />
          </button>
        ))}
      </div>
      <button type="button" className={styles.addButton} onClick={() => setEditingItem('new')}>
        + 항목 추가
      </button>
    </>
  );

  return (
    <div className={styles.wrap}>
      {actionsHost && createPortal(actionsNode, actionsHost)}

      {sortMode === 'category' && (
        <div className={styles.categoryChipRow}>
          <button
            type="button"
            className={categoryFilter === null ? `${styles.categoryChip} ${styles.categoryChipActive}` : styles.categoryChip}
            onClick={() => setCategoryFilter(null)}
          >
            전체
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={category === categoryFilter ? `${styles.categoryChip} ${styles.categoryChipActive}` : styles.categoryChip}
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {showCategoryGroups && (
        <div className={styles.groupList}>
          {CATEGORIES.map((category) => {
            const groupItems = checklistItems.filter((item) => item.category === category);
            if (groupItems.length === 0) return null;
            return (
              <div key={category} className={styles.categoryGroup}>
                <p className={styles.categoryGroupTitle}>
                  {category} <span className={styles.categoryGroupCount}>{groupItems.length}</span>
                </p>
                <div className={styles.list}>
                  {groupItems.map((item) => (
                    <PrepItemRow key={item.id} item={item} onEdit={() => setEditingItem(item)} />
                  ))}
                </div>
              </div>
            );
          })}
          {checklistItems.length === 0 && <p className={styles.empty}>아직 등록된 항목이 없어요.</p>}
        </div>
      )}

      {showFlatList && (
        <div className={styles.list}>
          {flatListItems.map((item) => (
            <PrepItemRow key={item.id} item={item} onEdit={() => setEditingItem(item)} />
          ))}
          {flatListItems.length === 0 && <p className={styles.empty}>아직 등록된 항목이 없어요.</p>}
        </div>
      )}

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
