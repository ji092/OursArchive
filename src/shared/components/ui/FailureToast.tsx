import { useEffect, useState } from 'react';
import { subscribeFailureNotice } from '@/shared/lib/notice/failureNotice';
import styles from './FailureToast.module.css';

// 8초. 되돌릴 수 없는 실패를 알리는 문구라 조작 안내를 읽을 시간이 필요하다
// (ExitToast의 짧은 힌트와 다르다).
const VISIBLE_MS = 8000;

export function FailureToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeFailureNotice(setMessage), []);

  useEffect(() => {
    if (message === null) return;
    // 새 메시지가 오면 이전 타이머는 정리되고 8초가 다시 시작된다.
    const timer = setTimeout(() => setMessage(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (message === null) return null;
  return (
    <div className={styles.toast} role="alert">
      {message}
    </div>
  );
}
