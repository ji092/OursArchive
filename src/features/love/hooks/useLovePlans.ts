import { useQuery } from '@tanstack/react-query';
import { mockLovePlans } from '../mockLovePlans';

// 계획(미래) 축 본 구현 전까지 목데이터를 그대로 반환한다. 실제 GET /love/plans 연동 시
// features/love/api.ts에 fetchLovePlans를 추가하고 이 훅만 그쪽을 바라보게 바꾼다.
export function useLovePlans() {
  return useQuery({
    queryKey: ['love-plans'],
    queryFn: async () => mockLovePlans,
  });
}
