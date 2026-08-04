import { useSearchParams } from 'react-router-dom';
import { RecordThumbnail } from '@/shared/components/record/RecordThumbnail';
import type { PregnancyDiary } from '../types';
import styles from './PregnancyDiaryCard.module.css';

export function PregnancyDiaryCard({ diary }: { diary: PregnancyDiary }) {
  const [, setSearchParams] = useSearchParams();

  return (
    <button type="button" className={styles.card} onClick={() => setSearchParams({ record: diary.id })}>
      <div className={styles.thumbWrap}>
        <RecordThumbnail imageUrl={diary.imageUrl} gradient={diary.gradient} alt={diary.title} className={styles.thumb} />
        <span className={styles.weekBadge}>{diary.weekNo}주차</span>
        {diary.isUltrasound && <span className={styles.ultrasoundBadge}>초음파</span>}
      </div>
      <div className={styles.body}>
        <p className={styles.title}>{diary.title}</p>
        <p className={styles.text}>{diary.body}</p>
        <p className={styles.meta}>{diary.recordedAt}</p>
      </div>
    </button>
  );
}
