import type { Checkup, PregnancyDiary, WeekContent } from './types';

// Readdy 프론트 목업(2026-07-22 검토)에 나온 값을 그대로 반영한 초기 목데이터.
// 출산 예정일(dueDate)은 관리 페이지에서 입력하는 workspace 설정으로 옮겨졌다
// (src/shared/lib/workspace/workspaceSettingsApi.ts, 2026-07-23).

export const mockDiaries: PregnancyDiary[] = [
  {
    id: 'diary-1',
    weekNo: 20,
    title: '태동 처음 느낀 날',
    body: '저녁 먹고 소파에 누워있는데 아랫배가 톡톡. 남편이 안 움직여서 아쉬워했다.',
    isUltrasound: false,
    recordedAt: '2026-07-30',
    visibility: 'family',
    gradient: 'linear-gradient(135deg, #d8c9ec, #f0e6f5)',
    comments: [],
  },
  {
    id: 'diary-2',
    weekNo: 16,
    title: '정밀 초음파',
    body: '성별 확인은 안 했지만 팔다리랑 배 성장이 잘 되고 있대요. 진짜 사람 모양이 보여요!',
    isUltrasound: true,
    recordedAt: '2026-07-08',
    visibility: 'family',
    gradient: 'linear-gradient(135deg, #9fd4e0, #d7ecf0)',
    comments: [{ id: 'pc-1', authorName: '엄마', body: '벌써 이렇게 컸구나 ㅠㅠ' }],
  },
  {
    id: 'diary-3',
    weekNo: 12,
    title: '입덧이 줄었어요',
    body: '드디어 입덧이 잦아들기 시작. 밥맛이 조금씩 돌아온다.',
    isUltrasound: false,
    recordedAt: '2026-06-11',
    visibility: 'family',
    gradient: 'linear-gradient(135deg, #f6c98d, #f19a8e)',
    comments: [],
  },
  {
    id: 'diary-4',
    weekNo: 8,
    title: '첫 초음파',
    body: '아기집을 처음 확인한 날. 아직 작은 콩알만 하지만 심장 소리를 들었다.',
    isUltrasound: true,
    recordedAt: '2026-05-14',
    visibility: 'family',
    gradient: 'linear-gradient(135deg, #efe3d6, #d9cfc2)',
    comments: [],
  },
];

export const mockCheckups: Checkup[] = [
  {
    id: 'checkup-1',
    weekNo: 6,
    title: '6주 초기검진',
    hospital: '미즈메디 병원',
    doctor: '김소영',
    scheduledAt: '2026-05-14T10:00:00+09:00',
    status: 'done',
    resultMemo: '아기집 확인, 심박 정상',
  },
  {
    id: 'checkup-2',
    weekNo: 12,
    title: '12주 정기검진 + 1차 기형아 검사',
    hospital: '미즈메디 병원',
    doctor: '김소영',
    scheduledAt: '2026-06-11T14:00:00+09:00',
    status: 'done',
    resultMemo: '기형아 검사 저위험군',
  },
  {
    id: 'checkup-3',
    weekNo: 16,
    title: '16주 정밀초음파',
    hospital: '미즈메디 병원',
    doctor: '김소영',
    scheduledAt: '2026-07-08T11:00:00+09:00',
    status: 'done',
    resultMemo: '팔다리·장기 발달 양호',
  },
  {
    id: 'checkup-4',
    weekNo: 20,
    title: '20주 정기검진',
    hospital: '미즈메디 병원',
    doctor: '김소영',
    scheduledAt: '2026-08-05T15:30:00+09:00',
    status: 'upcoming',
    note: '성별 확인 가능',
  },
  {
    id: 'checkup-5',
    weekNo: 24,
    title: '24주 임신성 당뇨 검사',
    hospital: '미즈메디 병원',
    doctor: '김소영',
    scheduledAt: '2026-09-02T10:30:00+09:00',
    status: 'upcoming',
  },
];

// 실제로는 40주치가 필요하지만(요구사항 5.4 week_content), 의학적 정확성이 필요한 콘텐츠라
// DECISIONS.md 2026-07-22 결정대로 지금은 스키마/화면만 만들고 실데이터는 채우지 않는다.
// 현재 주차(18주) 근방만 자리표시자로 둔다.
export const mockWeekContent: Record<number, WeekContent> = {
  18: {
    weekNo: 18,
    sizeMetaphor: '고구마',
    weightG: 190,
    lengthCm: 14.2,
    development: '청각이 발달해 엄마 목소리를 듣기 시작해요.',
    motherTip: '태동을 느끼기 시작할 시기예요. 무리한 움직임은 피하고 충분히 쉬어주세요.',
  },
};
