import { computeBudgetSummary, computeCategoryBudget, formatWon } from '../deriveStats';
import { usePrepItems } from '../hooks/useWeddingData';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import styles from './WeddingBudgetView.module.css';

export function WeddingBudgetView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: items } = usePrepItems(workspaceId);
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
          <span className={styles.summaryLabel}>실지출비용</span>
          <span className={styles.summaryValue}>{formatWon(summary.used)}</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${summary.usedPercent}%` }} />
        </div>
        <p className={styles.percentLabel}>예산의 {summary.usedPercent}%</p>

        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>지출나갈돈</span>
          <span className={styles.summaryValue}>{formatWon(summary.remaining)}</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${summary.remainingPercent}%` }} />
        </div>
        <p className={styles.percentLabel}>예산의 {summary.remainingPercent}%</p>

        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>확정 총액 (계약금+중도금+잔금)</span>
          <span className={styles.summaryValue}>{formatWon(summary.committed)}</span>
        </div>
      </section>
    </div>
  );
}
