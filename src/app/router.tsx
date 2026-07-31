import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ErrorPage } from '@/app/ErrorPage';
import { RequireActiveMember } from '@/app/RequireActiveMember';
import { RequireCoupleAccess } from '@/app/RequireCoupleAccess';
import { RequireMaster } from '@/app/RequireMaster';

// 각 페이지를 route.lazy()로 동적 import한다 (react-router v6.4+) — 로그인 화면만 봐도 되는
// 사용자가 결혼/임신/관리자 코드까지 전부 다운로드받지 않도록 챕터별로 청크를 쪼갠다.
// 가드 컴포넌트(RequireActiveMember 등)는 항상 필요해서 정적 import로 남긴다.
export const router = createBrowserRouter([
  {
    element: <RequireActiveMember />,
    errorElement: <ErrorPage />,
    children: [
      { path: '/', lazy: () => import('@/pages/dashboard/DashboardPage').then((m) => ({ Component: m.default })) },
      { path: '/mypage', lazy: () => import('@/pages/mypage/MyPagePage').then((m) => ({ Component: m.default })) },
      {
        // love/wedding/pregnancy는 master·partner 전용 (2026-07-29 사용자 지정) — family/guest는
        // RequireCoupleAccess가 접근권한 팝업을 띄우고 홈으로 돌려보낸다. /baby는 의도적으로 밖에 둔다
        // (아기 생기면 family에게도 열릴 챕터라 RequireActiveMember 통과만으로 접근 가능해야 함).
        element: <RequireCoupleAccess />,
        children: [
          {
            path: '/love',
            lazy: () => import('@/pages/love/LoveLayout').then((m) => ({ Component: m.default })),
            children: [
              { index: true, lazy: () => import('@/pages/love/feed/LoveFeedPage').then((m) => ({ Component: m.default })) },
              { path: 'calendar', lazy: () => import('@/pages/love/calendar/LoveCalendarPage').then((m) => ({ Component: m.default })) },
              { path: 'map', lazy: () => import('@/pages/love/map/LoveMapPage').then((m) => ({ Component: m.default })) },
              { path: 'create', lazy: () => import('@/pages/love/create/LoveCreatePage').then((m) => ({ Component: m.default })) },
              { path: 'plan/create', lazy: () => import('@/pages/love/plan-create/LovePlanCreatePage').then((m) => ({ Component: m.default })) },
            ],
          },
          {
            path: '/wedding',
            lazy: () => import('@/pages/wedding/WeddingLayout').then((m) => ({ Component: m.default })),
            children: [
              { index: true, lazy: () => import('@/pages/wedding/summary/WeddingSummaryPage').then((m) => ({ Component: m.default })) },
              { path: 'checklist', lazy: () => import('@/pages/wedding/checklist/WeddingChecklistPage').then((m) => ({ Component: m.default })) },
              { path: 'schedule', lazy: () => import('@/pages/wedding/schedule/WeddingSchedulePage').then((m) => ({ Component: m.default })) },
              { path: 'budget', lazy: () => import('@/pages/wedding/budget/WeddingBudgetPage').then((m) => ({ Component: m.default })) },
              { path: 'consult-notes', lazy: () => import('@/pages/wedding/consult-notes/WeddingConsultNotesPage').then((m) => ({ Component: m.default })) },
              { path: 'honeymoon', lazy: () => import('@/pages/wedding/honeymoon/WeddingHoneymoonPage').then((m) => ({ Component: m.default })) },
              { path: 'vendor-contacts', lazy: () => import('@/pages/wedding/vendor-contacts/WeddingVendorContactsPage').then((m) => ({ Component: m.default })) },
              { path: 'expenses', lazy: () => import('@/pages/wedding/expenses/WeddingExpensesPage').then((m) => ({ Component: m.default })) },
            ],
          },
          {
            path: '/pregnancy',
            lazy: () => import('@/pages/pregnancy/PregnancyLayout').then((m) => ({ Component: m.default })),
            children: [
              { index: true, element: <Navigate to="schedule" replace /> },
              { path: 'schedule', lazy: () => import('@/pages/pregnancy/schedule/PregnancySchedulePage').then((m) => ({ Component: m.default })) },
              { path: 'album', lazy: () => import('@/pages/pregnancy/album/PregnancyAlbumPage').then((m) => ({ Component: m.default })) },
              { path: 'checkup', lazy: () => import('@/pages/pregnancy/checkup/PregnancyCheckupPage').then((m) => ({ Component: m.default })) },
              { path: 'health-log', lazy: () => import('@/pages/pregnancy/health-log/PregnancyHealthLogPage').then((m) => ({ Component: m.default })) },
              { path: 'payment', lazy: () => import('@/pages/pregnancy/payment/PregnancyPaymentPage').then((m) => ({ Component: m.default })) },
            ],
          },
        ],
      },
      { path: '/baby', lazy: () => import('@/pages/baby/BabyPage').then((m) => ({ Component: m.default })) },
      {
        element: <RequireMaster />,
        children: [
          { path: '/admin/members', lazy: () => import('@/pages/admin/AdminPage').then((m) => ({ Component: m.default })) },
        ],
      },
    ],
  },
  {
    path: '/login',
    lazy: () => import('@/pages/auth/LoginPage').then((m) => ({ Component: m.default })),
  },
]);
