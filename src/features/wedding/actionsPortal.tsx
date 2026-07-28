import { createContext, useContext } from 'react';

// WeddingLayout의 탭 바로 위, 우측 정렬 슬롯 — 각 탭 화면(예: 체크리스트)이 자신의 컨트롤(정렬 아이콘,
// 항목 추가 버튼 등)을 이 슬롯에 portal로 렌더링한다. 탭별 컨트롤을 레이아웃과 분리해 유지하기 위함.
export const WeddingActionsHostContext = createContext<HTMLDivElement | null>(null);

export function useWeddingActionsHost(): HTMLDivElement | null {
  return useContext(WeddingActionsHostContext);
}
