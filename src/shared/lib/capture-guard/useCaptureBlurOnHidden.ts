import { useEffect, useState } from 'react';

// 요구사항 11.2 — 앱이 백그라운드로 전환되는 순간(OS 작업 전환 미리보기 등에 현재 화면이 캡처되는
// 타이밍) 민감한 콘텐츠에 블러를 씌운다. 브라우저는 OS 레벨 캡처 자체를 막을 권한이 없어 "억제"
// 목적이며 완전 차단이 아니다.
export function useCaptureBlurOnHidden(): boolean {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    function handleVisibility() {
      setIsBlurred(document.hidden);
    }
    function handleBlur() {
      setIsBlurred(true);
    }
    function handleFocus() {
      if (document.visibilityState === 'visible') setIsBlurred(false);
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return isBlurred;
}
