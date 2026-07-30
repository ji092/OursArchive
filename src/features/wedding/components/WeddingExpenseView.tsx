import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWeddingActionsHost } from '../actionsPortal';
import { formatWon } from '../deriveStats';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  usePrepItems,
  useUpdateExpense,
} from '../hooks/useWeddingData';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import { WEDDING_CATEGORIES, type Expense, type WeddingCategory } from '../types';
import styles from './WeddingExpenseView.module.css';

// 지출 내역 별도 관리(expense) — budget_attr(항목별 예산 요약)과 별개로, prep_item에 안 묶인
// 단독 지출까지 자유롭게 기록하는 가계부 (2026-07-30 사용자 지정 신규 화면).
export function WeddingExpenseView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: expenses } = useExpenses(workspaceId);
  const { data: prepItems } = usePrepItems(workspaceId);
  const createExpense = useCreateExpense(workspaceId);
  const updateExpense = useUpdateExpense(workspaceId);
  const deleteExpense = useDeleteExpense(workspaceId);
  const actionsHost = useWeddingActionsHost();

  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [category, setCategory] = useState<WeddingCategory>('웨딩홀');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<Expense['status']>('planned');
  const [prepItemId, setPrepItemId] = useState('');

  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);
  const paidTotal = (expenses ?? []).filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);

  function openNew() {
    setCategory('웨딩홀');
    setAmount('');
    setStatus('planned');
    setPrepItemId('');
    setEditing('new');
  }

  function openEdit(expense: Expense) {
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setStatus(expense.status);
    setPrepItemId(expense.prepItemId ?? '');
    setEditing(expense);
  }

  function handleSubmit() {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return;
    const input = { category, amount: amountNum, status, prepItemId: prepItemId || null };
    if (editing === 'new') {
      createExpense.mutate(input, { onSuccess: () => setEditing(null) });
    } else if (editing) {
      updateExpense.mutate({ id: editing.id, input }, { onSuccess: () => setEditing(null) });
    }
  }

  const itemById = new Map((prepItems ?? []).map((item) => [item.id, item]));

  return (
    <div className={styles.wrap}>
      {actionsHost &&
        createPortal(
          <button type="button" className={styles.addButton} onClick={openNew}>
            + 지출 추가
          </button>,
          actionsHost,
        )}

      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>전체 지출 · 지불완료</span>
        <span className={styles.summaryValue}>
          {formatWon(total)} · {formatWon(paidTotal)}
        </span>
      </div>

      {editing && (
        <div className={styles.overlay} onClick={() => setEditing(null)}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHead}>
              <p className={styles.formTitle}>{editing === 'new' ? '지출 추가' : '지출 수정'}</p>
              <button type="button" className={styles.closeButton} onClick={() => setEditing(null)} aria-label="닫기">
                ✕
              </button>
            </div>

            <div className={styles.chipRow}>
              {WEDDING_CATEGORIES.map((c) => (
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

            <div className={styles.formRow}>
              <input type="number" className={styles.input} placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <div className={styles.chipRow}>
                <button type="button" className={status === 'planned' ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => setStatus('planned')}>
                  예정
                </button>
                <button type="button" className={status === 'paid' ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => setStatus('paid')}>
                  지불완료
                </button>
              </div>
            </div>

            <select className={styles.select} value={prepItemId} onChange={(e) => setPrepItemId(e.target.value)}>
              <option value="">연결된 체크리스트 항목 없음</option>
              {(prepItems ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>

            <div className={styles.formRow}>
              <button type="button" className={styles.submit} onClick={handleSubmit}>
                {editing === 'new' ? '추가하기' : '저장하기'}
              </button>
              {editing !== 'new' && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => {
                    deleteExpense.mutate(editing.id);
                    setEditing(null);
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {(expenses ?? []).map((expense) => (
          <button key={expense.id} type="button" className={styles.row} onClick={() => openEdit(expense)}>
            <span className={styles.rowBadge}>{expense.category}</span>
            <span className={styles.rowStatus}>{expense.status === 'paid' ? '지불완료' : '예정'}</span>
            {expense.prepItemId && itemById.get(expense.prepItemId) && (
              <span className={styles.rowStatus}>{itemById.get(expense.prepItemId)!.title}</span>
            )}
            <span className={styles.rowAmount}>{formatWon(expense.amount)}</span>
          </button>
        ))}
        {(expenses ?? []).length === 0 && <p className={styles.empty}>등록된 지출이 없어요.</p>}
      </div>
    </div>
  );
}
