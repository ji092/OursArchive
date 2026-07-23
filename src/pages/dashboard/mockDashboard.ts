// 백엔드 GET /dashboard(API 명세 6.2)가 아직 연결되지 않아 임시로 둔 목데이터.
// Readdy 프론트 목업(2026-07-22 검토)에 나온 값을 그대로 반영했다 — 실제 연동 시 이 파일은 삭제하고
// features/dashboard/api.ts + React Query 훅으로 교체한다.
export interface DashboardMock {
  summary: {
    daysTogether: number;
    weddingChecklistDone: number;
    weddingChecklistTotal: number;
    birthDday: number;
  };
  recent: {
    love: { body: string; placeName: string; imageUrl: string };
    weddingNextEvent: { title: string; location: string; scheduledAtLabel: string; checklistDone: number; checklistTotal: number };
    pregnancyNextCheckup: { title: string; hospital: string; doctor: string; scheduledAtLabel: string; weekNo: number; sizeMetaphor: string };
  };
}

export const dashboardMock: DashboardMock = {
  summary: {
    daysTogether: 463,
    weddingChecklistDone: 3,
    weddingChecklistTotal: 8,
    birthDday: -156,
  },
  recent: {
    love: {
      body: '한강에서 노을 보면서 산책, 바람이 진짜 좋았던 하루.',
      placeName: '반포 한강공원',
      imageUrl: '',
    },
    weddingNextEvent: {
      title: '웨딩홀 A 실사 상담',
      location: '논현 W웨딩홀',
      scheduledAtLabel: '8월 5일 (수) 오후 02:00',
      checklistDone: 3,
      checklistTotal: 8,
    },
    pregnancyNextCheckup: {
      title: '20주 정기검진',
      hospital: '미즈메디 병원',
      doctor: '김소영',
      scheduledAtLabel: '8월 5일 오후 03:30',
      weekNo: 18,
      sizeMetaphor: '고구마',
    },
  },
};
