import { useLoveRecords } from '../hooks/useLoveRecords';
import { LoveFeedCard } from './LoveFeedCard';
import { LoveRecordDetailModalController } from './LoveRecordDetailModalController';
import styles from './LoveFeedView.module.css';

export function LoveFeedView() {
  const { data: records, isLoading } = useLoveRecords();

  if (isLoading || !records) {
    return <p className={styles.loading}>불러오는 중…</p>;
  }

  return (
    <div className={styles.grid}>
      {records.map((record) => (
        <LoveFeedCard key={record.id} record={record} />
      ))}
      <LoveRecordDetailModalController />
    </div>
  );
}
