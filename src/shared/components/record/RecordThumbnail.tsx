import styles from './RecordThumbnail.module.css';

// 패턴 A(11.3) — 피드 카드/달력 아이콘/지도 핀이 공유하는 프리뷰 컴포넌트. 챕터별 로직은 넣지 않고
// props로만 표현을 바꾼다. R2 연동 전까지는 imageUrl이 없으면 gradient만으로 자리를 채운다.
export interface RecordThumbnailProps {
  imageUrl?: string;
  gradient?: string;
  alt: string;
  className?: string;
}

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #dce9f5, #eef2f6)';

export function RecordThumbnail({ imageUrl, gradient, alt, className }: RecordThumbnailProps) {
  if (imageUrl) {
    return <img src={imageUrl} alt={alt} className={`${styles.thumb} ${className ?? ''}`} />;
  }
  return (
    <div
      className={`${styles.thumb} ${className ?? ''}`}
      style={{ background: gradient ?? FALLBACK_GRADIENT }}
      role="img"
      aria-label={alt}
    />
  );
}
