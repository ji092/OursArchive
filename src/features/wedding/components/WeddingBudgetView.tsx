import { computeBudgetSummary, computeCategoryBudget, formatWon } from '../deriveStats';
import { usePrepItems } from '../hooks/useWeddingData';
import styles from './WeddingBudgetView.module.css';

export function WeddingBudgetView() {
  const { data: items } = usePrepItems();
  if (!items) return <p>불러오는 중…</p>;

  const categoryBudget = computeCategoryBudget(items);
  const summary = computeBudgetSummary(items);

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <p className={styles.cardTitle}>항목별 예산</p>
        <div className={styles.categoryList}>
          {Object.entries(categoryBudget).map(([category, budget]) => {
            const isOver = budget!.used > budget!.planned;
            const percent = budget!.planned === 0 ? 0 : Math.min(Math.round((budget!.used / budget!.planned) * 100), 100);
            return (
              <div key={category} className={styles.categoryRow}>
                <div className={styles.categoryHead}>
                  <span>{category}</span>
                  <span className={isOver ? styles.categoryAmountOver : styles.categoryAmount}>
                    {formatWon(budget!.used)} / {formatWon(budget!.planned)}
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={isOver ? `${styles.progressFill} ${styles.progressFillOver}` : styles.progressFill} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.cardTitle}>전체 요약</p>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>계획 총액</span>
          <span className={styles.summaryValue}>{formatWon(summary.planned)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>사용 합계</span>
          <span className={styles.summaryValue}>{formatWon(summary.used)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>남은 예산</span>
          <span className={styles.summaryValue}>{formatWon(summary.remaining)}</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${summary.percent}%` }} />
        </div>
        <p className={styles.percentLabel}>현재 예산의 {summary.percent}% 사용 중</p>
      </section>
    </div>
  );
}
