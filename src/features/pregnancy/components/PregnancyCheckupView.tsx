import { useCheckups } from '../hooks/usePregnancyData';
import styles from './PregnancyCheckupView.module.css';

function formatCheckupDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function PregnancyCheckupView() {
  const { data: checkups } = useCheckups();
  const nextCheckup = checkups?.find((c) => c.status === 'upcoming');

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <p className={styles.sectionTitle}>NEXT CHECKUP</p>
        {nextCheckup ? (
          <div>
            <p className={styles.nextCheckupTitle}>{nextCheckup.title}</p>
            <p className={styles.nextCheckupMeta}>
              {nextCheckup.hospital} · {nextCheckup.doctor}
            </p>
            <p className={styles.nextCheckupMeta}>📅 {formatCheckupDate(nextCheckup.scheduledAt)}</p>
            {nextCheckup.note && <p className={styles.nextCheckupNote}>📌 {nextCheckup.note}</p>}
          </div>
        ) : (
          <p className={styles.empty}>예정된 검진이 없어요.</p>
        )}
      </section>

      <section className={styles.card}>
        <p className={styles.sectionTitle}>검진 일정</p>
        {(checkups ?? []).map((checkup) => (
          <div key={checkup.id} className={styles.checkupRow}>
            <span className={checkup.status === 'done' ? styles.checkDone : styles.checkPending}>
              {checkup.status === 'done' ? '✓' : '○'}
            </span>
            <div>
              <p className={styles.checkupTitle}>{checkup.title}</p>
              <p className={styles.checkupMeta}>{checkup.hospital}</p>
            </div>
          </div>
        ))}
        {(checkups ?? []).length === 0 && <p className={styles.empty}>등록된 검진이 없어요.</p>}
      </section>
    </div>
  );
}
