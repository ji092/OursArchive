import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ErrorPage } from '@/app/ErrorPage';
import { RequireActiveMember } from '@/app/RequireActiveMember';
import { RequireMaster } from '@/app/RequireMaster';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import LoveLayout from '@/pages/love/LoveLayout';
import LoveFeedPage from '@/pages/love/feed/LoveFeedPage';
import LoveCalendarPage from '@/pages/love/calendar/LoveCalendarPage';
import LoveMapPage from '@/pages/love/map/LoveMapPage';
import LoveCreatePage from '@/pages/love/create/LoveCreatePage';
import WeddingLayout from '@/pages/wedding/WeddingLayout';
import WeddingSummaryPage from '@/pages/wedding/summary/WeddingSummaryPage';
import WeddingChecklistPage from '@/pages/wedding/checklist/WeddingChecklistPage';
import WeddingSchedulePage from '@/pages/wedding/schedule/WeddingSchedulePage';
import WeddingBudgetPage from '@/pages/wedding/budget/WeddingBudgetPage';
import WeddingConsultNotesPage from '@/pages/wedding/consult-notes/WeddingConsultNotesPage';
import WeddingHoneymoonPage from '@/pages/wedding/honeymoon/WeddingHoneymoonPage';
import PregnancyLayout from '@/pages/pregnancy/PregnancyLayout';
import PregnancySchedulePage from '@/pages/pregnancy/schedule/PregnancySchedulePage';
import PregnancyAlbumPage from '@/pages/pregnancy/album/PregnancyAlbumPage';
import PregnancyCheckupPage from '@/pages/pregnancy/checkup/PregnancyCheckupPage';
import PregnancyPaymentPage from '@/pages/pregnancy/payment/PregnancyPaymentPage';
import BabyPage from '@/pages/baby/BabyPage';
import AdminPage from '@/pages/admin/AdminPage';
import InviteAcceptPage from '@/pages/auth/InviteAcceptPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import LoginPage from '@/pages/auth/LoginPage';

// 레코드 상세 모달은 경로가 아니라 ?record=<id> 쿼리 파라미터로 연다 (PHASE5 2.1, CLAUDE.md) —
// 그래서 /love, /pregnancy, /baby 각 페이지 내부에서 useSearchParams로 처리하고 별도 라우트를 만들지 않는다.
// 인증 페이지(초대 수락/재설정)는 GlobalHeader가 필요 없으므로 AppLayout 밖에 둔다.
export const router = createBrowserRouter([
  {
    element: <RequireActiveMember />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', element: <DashboardPage /> },
      {
        path: '/love',
        element: <LoveLayout />,
        children: [
          { index: true, element: <LoveFeedPage /> },
          { path: 'calendar', element: <LoveCalendarPage /> },
          { path: 'map', element: <LoveMapPage /> },
          { path: 'create', element: <LoveCreatePage /> },
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
          { path: 'payment', element: <PregnancyPaymentPage /> },
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
  { path: '/auth/invite/:token', element: <InviteAcceptPage /> },
  { path: '/auth/reset-password/:token', element: <ResetPasswordPage /> },
]);
