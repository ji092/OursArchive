import styles from './ExitToast.module.css';

export interface ExitToastProps {
  visible: boolean;
}

export function ExitToast({ visible }: ExitToastProps) {
  if (!visible) return null;
  return (
    <div className={styles.toast} role="status">
      뒤로가기 한 번 더 누르면 종료돼요
    </div>
  );
}
