import styles from './AccessDeniedModal.module.css';

// 재사용 가능한 첫 alert형 모달 프리미티브 — RecordDetailModal류(데이터 편집)와 달리
// "메시지 + 확인 버튼" 하나뿐인 안내용. family/guest가 couple 전용 챕터에 진입했을 때
// RequireCoupleAccess가 이걸 띄우고, 확인을 누르면 호출부가 홈으로 돌려보낸다.
export function AccessDeniedModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true">
      <div className={styles.panel}>
        <p className={styles.title}>접근 권한이 없어요</p>
        <p className={styles.body}>이 페이지는 접근 권한이 없습니다. 관리자에게 문의해주세요.</p>
        <button type="button" className={styles.confirmButton} onClick={onConfirm}>
          확인
        </button>
      </div>
    </div>
  );
}
