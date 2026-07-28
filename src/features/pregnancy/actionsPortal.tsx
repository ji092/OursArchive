import { createContext, useContext } from 'react';

// PregnancyLayout의 탭 바로 위, 우측 정렬 슬롯 — 각 탭 화면이 자신의 컨트롤(추가 버튼 등)을
// 이 슬롯에 portal로 렌더링한다 (wedding/actionsPortal.tsx와 동일 패턴).
export const PregnancyActionsHostContext = createContext<HTMLDivElement | null>(null);

export function usePregnancyActionsHost(): HTMLDivElement | null {
  return useContext(PregnancyActionsHostContext);
}
