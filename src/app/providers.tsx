import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

// 서버 상태(love_record, prep_item 등)는 이 캐시 하나만 진실로 삼는다 (PHASE5 1장, CLAUDE.md).
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
