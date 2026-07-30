import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ErrorPage } from '@/app/ErrorPage';
import { RequireActiveMember } from '@/app/RequireActiveMember';
import { RequireCoupleAccess } from '@/app/RequireCoupleAccess';
import { RequireMaster } from '@/app/RequireMaster';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import LoveLayout from '@/pages/love/LoveLayout';
import LoveFeedPage from '@/pages/love/feed/LoveFeedPage';
import LoveCalendarPage from '@/pages/love/calendar/LoveCalendarPage';
import LoveMapPage from '@/pages/love/map/LoveMapPage';
import LoveCreatePage from '@/pages/love/create/LoveCreatePage';
import LovePlanCreatePage from '@/pages/love/plan-create/LovePlanCreatePage';
import WeddingLayout from '@/pages/wedding/WeddingLayout';
import WeddingSummaryPage from '@/pages/wedding/summary/WeddingSummaryPage';
import WeddingChecklistPage from '@/pages/wedding/checklist/WeddingChecklistPage';
import WeddingSchedulePage from '@/pages/wedding/schedule/WeddingSchedulePage';
import WeddingBudgetPage from '@/pages/wedding/budget/WeddingBudgetPage';
import WeddingConsultNotesPage from '@/pages/wedding/consult-notes/WeddingConsultNotesPage';
import WeddingHoneymoonPage from '@/pages/wedding/honeymoon/WeddingHoneymoonPage';
import WeddingVendorContactsPage from '@/pages/wedding/vendor-contacts/WeddingVendorContactsPage';
import WeddingExpensesPage from '@/pages/wedding/expenses/WeddingExpensesPage';
import PregnancyLayout from '@/pages/pregnancy/PregnancyLayout';
import PregnancySchedulePage from '@/pages/pregnancy/schedule/PregnancySchedulePage';
import PregnancyAlbumPage from '@/pages/pregnancy/album/PregnancyAlbumPage';
import PregnancyCheckupPage from '@/pages/pregnancy/checkup/PregnancyCheckupPage';
import PregnancyHealthLogPage from '@/pages/pregnancy/health-log/PregnancyHealthLogPage';
import PregnancyPaymentPage from '@/pages/pregnancy/payment/PregnancyPaymentPage';
import BabyPage from '@/pages/baby/BabyPage';
import AdminPage from '@/pages/admin/AdminPage';
import MyPagePage from '@/pages/mypage/MyPagePage';
import LoginPage from '@/pages/auth/LoginPage';

// 레코드 상세 모달은 경로가 아니라 ?record=<id> 쿼리 파라미터로 연다 (PHASE5 2.1, CLAUDE.md) —
// 그래서 /love, /pregnancy, /baby 각 페이지 내부에서 useSearchParams로 처리하고 별도 라우트를 만들지 않는다.
// 가입은 카카오 OAuth 자가가입 + Master 승인뿐이다(이메일 초대/비밀번호 재설정 없음, 2026-07-30 확정) —
// 그래서 /login 하나만 AppLayout 밖에 둔다.
export const router = createBrowserRouter([
  {
    element: <RequireActiveMember />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/mypage', element: <MyPagePage /> },
      {
        // love/wedding/pregnancy는 master·partner 전용 (2026-07-29 사용자 지정) — family/guest는
        // RequireCoupleAccess가 접근권한 팝업을 띄우고 홈으로 돌려보낸다. /baby는 의도적으로 밖에 둔다
        // (아기 생기면 family에게도 열릴 챕터라 RequireActiveMember 통과만으로 접근 가능해야 함).
        element: <RequireCoupleAccess />,
        children: [
          {
            path: '/love',
            element: <LoveLayout />,
            children: [
              { index: true, element: <LoveFeedPage /> },
              { path: 'calendar', element: <LoveCalendarPage /> },
              { path: 'map', element: <LoveMapPage /> },
              { path: 'create', element: <LoveCreatePage /> },
              { path: 'plan/create', element: <LovePlanCreatePage /> },
            ],
          },
          {
            path: '/wedding',
            element: <WeddingLayout />,
            children: [
              { index: true, element: <WeddingSummaryPage /> },
              { path: 'checklist', element: <WeddingChecklistPage /> },
              { path: 'schedule', element: <WeddingSchedulePage /> },
              { path: 'budget', element: <WeddingBudgetPage /> },
              { path: 'consult-notes', element: <WeddingConsultNotesPage /> },
              { path: 'honeymoon', element: <WeddingHoneymoonPage /> },
              { path: 'vendor-contacts', element: <WeddingVendorContactsPage /> },
              { path: 'expenses', element: <WeddingExpensesPage /> },
            ],
          },
          {
            path: '/pregnancy',
            element: <PregnancyLayout />,
            children: [
              { index: true, element: <Navigate to="schedule" replace /> },
              { path: 'schedule', element: <PregnancySchedulePage /> },
              { path: 'album', element: <PregnancyAlbumPage /> },
              { path: 'checkup', element: <PregnancyCheckupPage /> },
              { path: 'health-log', element: <PregnancyHealthLogPage /> },
              { path: 'payment', element: <PregnancyPaymentPage /> },
            ],
          },
        ],
      },
      { path: '/baby', element: <BabyPage /> },
      {
        element: <RequireMaster />,
        children: [{ path: '/admin/members', element: <AdminPage /> }],
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
]);
