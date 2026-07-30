import { useEffect } from 'react';

// 요구사항 11.2 — 우클릭 저장/드래그 저장/개발자도구·인쇄 단축키처럼 "쉬운 경로"의 캡처·저장만
// 억제한다. 물리 캡처 버튼·외부 카메라·OS 스크린샷 도구는 브라우저가 관여할 수 없는 영역이라
// 대상이 아니다 (우회 가능성이 항상 있음, 완전 차단 아님).
export function useBlockCaptureShortcuts() {
  useEffect(() => {
    function handleContextMenu(event: MouseEvent) {
      event.preventDefault();
    }

    function handleDragStart(event: DragEvent) {
      event.preventDefault();
    }

    function handleKeydown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const withModifier = event.ctrlKey || event.metaKey;

      const isDevtools = event.key === 'F12' || (withModifier && event.shiftKey && ['i', 'j', 'c'].includes(key));
      const isViewSource = withModifier && key === 'u';
      const isSaveOrPrint = withModifier && ['s', 'p'].includes(key);

      if (isDevtools || isViewSource || isSaveOrPrint) event.preventDefault();
    }

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, []);
}
