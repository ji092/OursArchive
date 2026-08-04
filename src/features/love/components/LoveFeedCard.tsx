import { useState } from 'react';
import { IconComment, IconPin } from '@/shared/components/ui/icons';
import { useSearchParams } from 'react-router-dom';
import { RecordThumbnail } from '@/shared/components/record/RecordThumbnail';
import type { LoveRecord } from '../types';
import styles from './LoveFeedCard.module.css';

function formatRecordedAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function LoveFeedCard({ record }: { record: LoveRecord }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [, setSearchParams] = useSearchParams();
  const hasMultiplePhotos = record.photos.length > 1;

  function openDetail() {
    setSearchParams({ record: record.id });
  }

  return (
    <article className={styles.card}>
      <button type="button" className={styles.header} onClick={openDetail}>
        <span className={styles.avatar} aria-hidden="true" />
        <span className={styles.headerText}>
          <span className={styles.author}>{record.authorName}</span>
          <span className={styles.place}><IconPin /> {record.placeName}</span>
        </span>
      </button>

      <div className={styles.photoArea}>
        <button type="button" className={styles.photoButton} onClick={openDetail} aria-label="상세 보기">
          <RecordThumbnail
            gradient={record.photos[photoIndex]?.gradient}
            imageUrl={record.photos[photoIndex]?.imageUrl}
            alt={`${record.authorName}의 기록 사진`}
          />
        </button>
        {hasMultiplePhotos && (
          <>
            <button
              type="button"
              className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
              onClick={(event) => {
                event.stopPropagation();
                setPhotoIndex((i) => (i - 1 + record.photos.length) % record.photos.length);
              }}
              aria-label="이전 사진"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
              onClick={(event) => {
                event.stopPropagation();
                setPhotoIndex((i) => (i + 1) % record.photos.length);
              }}
              aria-label="다음 사진"
            >
              ›
            </button>
            <span className={styles.photoCounter}>
              {photoIndex + 1}/{record.photos.length}
            </span>
          </>
        )}
      </div>

      <button type="button" className={styles.body} onClick={openDetail}>
        <p className={styles.bodyText}>{record.body}</p>
        <p className={styles.footer}>
          <IconComment /> 댓글 {record.comments.length} · {formatRecordedAt(record.recordedAt)}
        </p>
      </button>
    </article>
  );
}
