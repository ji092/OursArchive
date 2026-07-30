import styles from './Watermark.module.css';

export interface WatermarkProps {
  label: string;
  className?: string;
}

// 요구사항 11.2 — 원본 캡처를 막을 순 없으니, 유출 시 출처를 추적할 수 있도록 사용자 식별자·조회
// 시각을 저투명도 텍스트로 이미지 위에 반복 삽입한다. 부모 요소는 position: relative여야 한다.
export function Watermark({ label, className }: WatermarkProps) {
  const tiles = Array.from({ length: 12 });
  return (
    <div className={[styles.overlay, className].filter(Boolean).join(' ')} aria-hidden="true">
      {tiles.map((_, index) => (
        <span key={index} className={styles.tile}>
          {label}
        </span>
      ))}
    </div>
  );
}
