import { useEffect, useState } from 'react';
import { useConsultNotes } from '../hooks/useWeddingData';
import { WEDDING_CATEGORIES, type PaymentMethod, type PrepItem, type WeddingCategory } from '../types';
import styles from './PrepItemEditForm.module.css';

// 패턴 B(11.3, PHASE3 폴더 규칙) — 결혼 prep_item 전용 속성 편집 폼. 다른 챕터에 재사용하지 않는다.
// Readdy 프론트 목업(2026-07-22 검토)에서 확인한 필드 구성 그대로: 제목/카테고리/마감날짜/담당/
// 상담노트 연결(다대다)/예산(선택) — 체크리스트 탭 전용이라 일정(schedule) 필드는 여기 없다.
export const CATEGORIES = WEDDING_CATEGORIES;
const ASSIGNEES = ['지영', '경영'] as const;
const PAYMENT_METHODS: PaymentMethod[] = ['카드', '현금'];

export interface PrepItemEditFormValues {
  title: string;
  category: WeddingCategory;
  assigneeName: string | null;
  dueDate: string;
  consultNoteIds: string[];
  plannedAmount: string;
  depositAmount: string;
  depositMethod: PaymentMethod | null;
  depositMemo: string;
  interimAmount: string;
  interimMethod: PaymentMethod | null;
  interimMemo: string;
  balanceAmount: string;
  balanceMethod: PaymentMethod | null;
  balanceMemo: string;
  usedAmount: string;
}

export interface PrepItemEditFormProps {
  item?: PrepItem;
  onClose: () => void;
  onSubmit: (values: PrepItemEditFormValues) => void;
}

// 계약금/중도금/잔금 공용 입력 블록 — 금액 + 지출수단(카드/현금) + 메모(예: "현대카드", "계좌이체", "인출").
interface PaymentFieldProps {
  label: string;
  amount: string;
  onAmountChange: (value: string) => void;
  method: PaymentMethod | null;
  onMethodChange: (value: PaymentMethod | null) => void;
  memo: string;
  onMemoChange: (value: string) => void;
}

function PaymentField({ label, amount, onAmountChange, method, onMethodChange, memo, onMemoChange }: PaymentFieldProps) {
  return (
    <div className={styles.paymentField}>
      <label className={styles.label}>{label}</label>
      <input
        type="number"
        className={styles.input}
        placeholder="0"
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
      />
      <div className={styles.paymentRow}>
        <div className={styles.chipRow}>
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              className={m === method ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => onMethodChange(m === method ? null : m)}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          type="text"
          className={styles.input}
          placeholder="메모 (예: 현대카드, 계좌이체, 인출)"
          value={memo}
          onChange={(event) => onMemoChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export function PrepItemEditForm({ item, onClose, onSubmit }: PrepItemEditFormProps) {
  const { data: consultNotes } = useConsultNotes();
  const [title, setTitle] = useState(item?.title ?? '');
  const [category, setCategory] = useState<WeddingCategory>(item?.category ?? CATEGORIES[0]);
  const [assigneeName, setAssigneeName] = useState<string | null>(item?.assigneeName ?? null);
  const [dueDate, setDueDate] = useState(item?.checklist?.dueDate ?? new Date().toISOString().slice(0, 10));
  const [consultNoteIds, setConsultNoteIds] = useState<string[]>(item?.consultNoteIds ?? []);
  const [plannedAmount, setPlannedAmount] = useState(item?.budget ? String(item.budget.plannedAmount) : '');
  const [depositAmount, setDepositAmount] = useState(item?.budget ? String(item.budget.deposit.amount) : '');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod | null>(item?.budget?.deposit.method ?? null);
  const [depositMemo, setDepositMemo] = useState(item?.budget?.deposit.memo ?? '');
  const [interimAmount, setInterimAmount] = useState(item?.budget ? String(item.budget.interim.amount) : '');
  const [interimMethod, setInterimMethod] = useState<PaymentMethod | null>(item?.budget?.interim.method ?? null);
  const [interimMemo, setInterimMemo] = useState(item?.budget?.interim.memo ?? '');
  const [balanceAmount, setBalanceAmount] = useState(item?.budget ? String(item.budget.balance.amount) : '');
  const [balanceMethod, setBalanceMethod] = useState<PaymentMethod | null>(item?.budget?.balance.method ?? null);
  const [balanceMemo, setBalanceMemo] = useState(item?.budget?.balance.memo ?? '');
  const [usedAmount, setUsedAmount] = useState(item?.budget ? String(item.budget.usedAmount) : '');

  // 계약금/중도금/잔금 중 하나라도 양수면 실지출비용을 그 합계로 자동 반영한다 (2026-07-24 사용자 지정).
  useEffect(() => {
    const sum = Number(depositAmount || 0) + Number(interimAmount || 0) + Number(balanceAmount || 0);
    if (sum > 0) setUsedAmount(String(sum));
  }, [depositAmount, interimAmount, balanceAmount]);

  const remainingAmount = Number(plannedAmount || 0) - Number(usedAmount || 0);

  function toggleConsultNote(id: string) {
    setConsultNoteIds((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  }

  function handleSubmit() {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      category,
      assigneeName,
      dueDate,
      consultNoteIds,
      plannedAmount,
      depositAmount,
      depositMethod,
      depositMemo,
      interimAmount,
      interimMethod,
      interimMemo,
      balanceAmount,
      balanceMethod,
      balanceMemo,
      usedAmount,
    });
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

        <PaymentField
          label="계약금"
          amount={depositAmount}
          onAmountChange={setDepositAmount}
          method={depositMethod}
          onMethodChange={setDepositMethod}
          memo={depositMemo}
          onMemoChange={setDepositMemo}
        />
        <PaymentField
          label="중도금"
          amount={interimAmount}
          onAmountChange={setInterimAmount}
          method={interimMethod}
          onMethodChange={setInterimMethod}
          memo={interimMemo}
          onMemoChange={setInterimMemo}
        />
        <PaymentField
          label="잔금"
          amount={balanceAmount}
          onAmountChange={setBalanceAmount}
          method={balanceMethod}
          onMethodChange={setBalanceMethod}
          memo={balanceMemo}
          onMemoChange={setBalanceMemo}
        />

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>실지출비용</label>
            <input
              type="number"
              className={styles.input}
              placeholder="0"
              value={usedAmount}
              onChange={(event) => setUsedAmount(event.target.value)}
            />
            <p className={styles.hint}>계약금·중도금·잔금 입력 시 자동 합산</p>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>지출나갈돈</label>
            <input type="text" className={styles.input} readOnly value={`${remainingAmount.toLocaleString('ko-KR')}원`} />
            <p className={styles.hint}>예산 − 실지출비용</p>
          </div>
        </div>

        <button type="button" className={styles.submit} onClick={handleSubmit}>
          저장하기
        </button>
      </div>
    </div>
  );
}

// item이 있으면(수정) 기존 done을 보존하고, 없으면(신규 생성) 기본값(false)으로 채운다.
// 예산 입력(예산/계약금/중도금/잔금/실지출비용) 중 하나라도 있으면 budget 객체를 만든다 — 나머지 미입력분은 0/null.
export function toPrepItemPatch(values: PrepItemEditFormValues, item?: PrepItem): Partial<Omit<PrepItem, 'id'>> {
  return {
    title: values.title,
    category: values.category,
    assigneeName: values.assigneeName,
    checklist: { done: item?.checklist?.done ?? false, dueDate: values.dueDate },
    consultNoteIds: values.consultNoteIds,
    budget: buildBudget(values),
  };
}

export function buildBudget(values: PrepItemEditFormValues): PrepItem['budget'] {
  const hasBudgetInput =
    values.plannedAmount ||
    values.depositAmount ||
    values.interimAmount ||
    values.balanceAmount ||
    values.usedAmount;
  if (!hasBudgetInput) return undefined;
  return {
    plannedAmount: Number(values.plannedAmount || 0),
    deposit: { amount: Number(values.depositAmount || 0), method: values.depositMethod, memo: values.depositMemo },
    interim: { amount: Number(values.interimAmount || 0), method: values.interimMethod, memo: values.interimMemo },
    balance: { amount: Number(values.balanceAmount || 0), method: values.balanceMethod, memo: values.balanceMemo },
    usedAmount: Number(values.usedAmount || 0),
  };
}
