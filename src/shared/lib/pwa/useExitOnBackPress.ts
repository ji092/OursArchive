import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const EXIT_HINT_MS = 2000;

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

// 안드로이드 PWA로 설치해서 쓰면, 하위 화면들에서 뒤로가기로 계속 거슬러 올라가다 홈(대시보드,
// "/")에 도달한 다음 한 번 더 뒤로가기를 누르면 그대로 앱이 꺼진다 — 실수로 앱이 종료되는 걸
// 막기 위해 홈에서만 "한 번 더 누르면 종료" 트랩을 건다. 홈 도달 시 더미 history state를 하나
// 밀어넣어 첫 번째 뒤로가기는 popstate로 가로채 힌트만 보여주고, EXIT_HINT_MS 안에 두 번째
// 뒤로가기가 들어오면 더미를 다시 안 밀어넣어 실제 종료(OS/브라우저가 처리)로 이어지게 한다.
// standalone(PWA 설치 상태)이 아니면 일반 웹 뒤로가기 동작을 그대로 둔다 — 브라우저 탭에서
// 쓰는 사람의 뒤로가기를 건드리면 안 되기 때문.
export function useExitOnBackPress(): boolean {
  const location = useLocation();
  const [showHint, setShowHint] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    if (!isStandalone() || location.pathname !== '/') {
      armedRef.current = false;
      setShowHint(false);
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    window.history.pushState({ exitGuard: true }, '', window.location.href);

    function handlePopState() {
      if (armedRef.current) return; // 두 번째 뒤로가기 — 더미를 다시 안 밀어넣어 그대로 종료되게 둔다
      armedRef.current = true;
      setShowHint(true);
      window.history.pushState({ exitGuard: true }, '', window.location.href);
      hideTimer = setTimeout(() => {
        armedRef.current = false;
        setShowHint(false);
      }, EXIT_HINT_MS);
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(hideTimer);
    };
  }, [location.pathname]);

  return showHint;
}
