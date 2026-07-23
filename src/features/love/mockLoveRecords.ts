// GET /love/records(API 명세 6.3)가 아직 연결되지 않아 임시로 둔 목데이터.
// 실제 연동 시 이 파일은 삭제하고 features/love/api.ts + React Query 훅(useLoveRecords)으로 교체한다.
export interface LoveRecordComment {
  id: string;
  authorName: string;
  body: string;
}

export interface LoveRecord {
  id: string;
  authorName: string;
  placeName: string;
  lat?: number;
  lng?: number;
  body: string;
  recordedAt: string; // ISO 8601
  photos: { gradient: string }[];
  comments: LoveRecordComment[];
}

export const mockLoveRecords: LoveRecord[] = [
  {
    id: 'love-1',
    authorName: '지우',
    placeName: '반포 한강공원',
    lat: 37.5106,
    lng: 126.9966,
    body: '한강에서 노을 보면서 산책, 바람이 진짜 좋았던 하루.',
    recordedAt: '2026-07-12T18:20:00+09:00',
    photos: [
      { gradient: 'linear-gradient(135deg, #f6c98d, #f19a8e)' },
      { gradient: 'linear-gradient(135deg, #f2b6a3, #ecd7c3)' },
    ],
    comments: [
      { id: 'c1', authorName: '현우', body: '우리 또 가자 여기' },
      { id: 'c2', authorName: '지우', body: 'ㅋㅋㅋ 좋지' },
      { id: 'c3', authorName: '현우', body: '다음엔 자전거 타고!' },
    ],
  },
  {
    id: 'love-2',
    authorName: '현우',
    placeName: '성수동 카페거리',
    lat: 37.5445,
    lng: 127.0559,
    body: '우연히 들어간 카페인데 크루아상이 진짜 맛있었어. 다음에 또 오자.',
    recordedAt: '2026-07-05T13:00:00+09:00',
    photos: [{ gradient: 'linear-gradient(135deg, #efe3d6, #d9cfc2)' }],
    comments: [{ id: 'c4', authorName: '지우', body: '나도 먹고싶다ㅠㅠ' }],
  },
  {
    id: 'love-3',
    authorName: '지우',
    placeName: '함덕 해수욕장',
    lat: 33.5427,
    lng: 126.6699,
    body: '제주도 첫날, 에메랄드빛 바다 보고 완전 힐링했다.',
    recordedAt: '2026-06-21T15:40:00+09:00',
    photos: [
      { gradient: 'linear-gradient(135deg, #9fd4e0, #d7ecf0)' },
      { gradient: 'linear-gradient(135deg, #bfe3ea, #eef7f8)' },
    ],
    comments: [],
  },
  {
    id: 'love-4',
    authorName: '현우',
    placeName: '이태원 브런치집',
    lat: 37.5346,
    lng: 126.9947,
    body: '주말 브런치 데이트, 오랜만에 여유롭게 얘기 많이 했다.',
    recordedAt: '2026-06-08T11:30:00+09:00',
    photos: [{ gradient: 'linear-gradient(135deg, #f4d9c6, #f0e6d2)' }],
    comments: [{ id: 'c5', authorName: '지우', body: '여기 또 가자!!' }],
  },
];
