import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePregnancyActionsHost } from '../actionsPortal';
import {
  computeExpenseCategoryTotals,
  computeExpenseTotal,
  filterExpensesByMonth,
  filterExpensesByYear,
} from '../deriveStats';
import { useCreateExpense, useDeleteExpense, useExpenses } from '../hooks/usePregnancyData';
import { PREGNANCY_EXPENSE_CATEGORIES, type PregnancyExpenseCategory } from '../types';
import styles from './PregnancyPaymentView.module.css';

type Period = 'month' | 'year';

function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

// 지불(가계부) — 임신·출산·육아 관련 지출을 월/연 단위로 보고, 카테고리별 합계를 확인한다.
// Master·파트너 전용 데이터다(0004_pregnancy_baby_policies.sql의 can_access_couple_content와 동일 원칙 —
// family/guest에게 열지 않는다. 실제 로그인 연동 전까지는 프론트에서 role 분기는 하지 않는다).
export function PregnancyPaymentView() {
  const { data: expenses } = useExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const actionsHost = usePregnancyActionsHost();

  const [period, setPeriod] = useState<Period>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<PregnancyExpenseCategory>('병원·검진');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const periodExpenses = useMemo(() => {
    const all = expenses ?? [];
    return period === 'month' ? filterExpensesByMonth(all, year, month) : filterExpensesByYear(all, year);
  }, [expenses, period, year, month]);

  const total = computeExpenseTotal(periodExpenses);
  const categoryTotals = computeExpenseCategoryTotals(periodExpenses);
  const maxCategoryAmount = categoryTotals[0]?.amount ?? 0;

  function changePeriod(delta: number) {
    setCursor(period === 'month' ? new Date(year, month + delta, 1) : new Date(year + delta, month, 1));
  }

  function handleSubmit() {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return;
    createExpense.mutate(
      { category, amount: amountNum, date, memo: memo.trim() },
      {
        onSuccess: () => {
          setShowForm(false);
          setAmount('');
          setMemo('');
        },
      },
    );
  }

  const actionsNode = (
    <button type="button" className={styles.addButton} onClick={() => setShowForm((v) => !v)}>
      + 지출 추가
    </button>
  );

  return (
    <div className={styles.wrap}>
      {actionsHost && createPortal(actionsNode, actionsHost)}

      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHead}>
              <p className={styles.formTitle}>지출 추가</p>
              <button type="button" className={styles.closeButton} onClick={() => setShowForm(false)} aria-label="닫기">
                ✕
              </button>
            </div>

            <label className={styles.label}>카테고리</label>
            <div className={styles.chipRow}>
              {PREGNANCY_EXPENSE_CATEGORIES.map((c) => (
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
              <div className={styles.field}>
                <label className={styles.label}>금액</label>
                <input type="number" className={styles.input} placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>날짜</label>
                <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <label className={styles.label}>메모</label>
            <input className={styles.input} placeholder="예: 16주 정밀초음파" value={memo} onChange={(e) => setMemo(e.target.value)} />

            <button type="button" className={styles.submit} onClick={handleSubmit}>
              추가하기
            </button>
          </div>
        </div>
      )}

      <div className={styles.periodRow}>
        <div className={styles.chipRow}>
          <button
            type="button"
            className={period === 'month' ? `${styles.chip} ${styles.chipActive}` : styles.chip}
            onClick={() => setPeriod('month')}
          >
            월별
          </button>
          <button
            type="button"
            className={period === 'year' ? `${styles.chip} ${styles.chipActive}` : styles.chip}
            onClick={() => setPeriod('year')}
          >
            연별
          </button>
        </div>
        <div className={styles.periodNav}>
          <button type="button" className={styles.navButton} onClick={() => changePeriod(-1)} aria-label="이전">
            ‹
          </button>
          <p className={styles.periodLabel}>{period === 'month' ? `${year}년 ${month + 1}월` : `${year}년`}</p>
          <button type="button" className={styles.navButton} onClick={() => changePeriod(1)} aria-label="다음">
            ›
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <p className={styles.cardTitle}>총 지출</p>
          <p className={styles.totalValue}>{formatWon(total)}</p>
          <p className={styles.totalHint}>{period === 'month' ? '이번 달' : '올해'} 임신·출산·육아 지출 합계</p>
        </section>

        <section className={styles.card}>
          <p className={styles.cardTitle}>카테고리별</p>
          {categoryTotals.length === 0 ? (
            <p className={styles.empty}>등록된 지출이 없어요.</p>
          ) : (
            <div className={styles.categoryList}>
              {categoryTotals.map(({ category: c, amount: a }) => (
                <div key={c} className={styles.categoryRow}>
                  <div className={styles.categoryHead}>
                    <span>{c}</span>
                    <span className={styles.categoryAmount}>{formatWon(a)}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${maxCategoryAmount === 0 ? 0 : Math.round((a / maxCategoryAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={styles.listCard}>
        <p className={styles.cardTitle}>지출 내역</p>
        <div className={styles.expenseList}>
          {periodExpenses.map((e) => (
            <div key={e.id} className={styles.expenseRow}>
              <span className={styles.expenseBadge}>{e.category}</span>
              <div className={styles.expenseInfo}>
                <p className={styles.expenseMemo}>{e.memo || e.category}</p>
                <p className={styles.expenseDate}>{e.date}</p>
              </div>
              <span className={styles.expenseAmount}>{formatWon(e.amount)}</span>
              <button type="button" className={styles.expenseDelete} onClick={() => deleteExpense.mutate(e.id)} aria-label="삭제">
                ✕
              </button>
            </div>
          ))}
          {periodExpenses.length === 0 && <p className={styles.empty}>등록된 지출이 없어요.</p>}
        </div>
      </section>
    </div>
  );
}
