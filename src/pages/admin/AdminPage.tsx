import { AdminView } from '@/features/admin/components/AdminView';

// master 전용 — 실제 접근 제한은 shared/lib/rbac 구현 후 라우터 가드로 연결 (서버 RLS가 최종 방어선).
export default function AdminPage() {
  return <AdminView />;
}
