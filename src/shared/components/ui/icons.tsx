// 흑백 선/점 아이콘 세트. 컬러 이모지(장소·날짜·삭제 등)를 대체한다 —
// 이모지는 OS·브라우저마다 모양과 색이 달라 디자인 통제가 안 되고, 톤이 튄다.
//
// 규칙:
//   - stroke는 currentColor — 쓰는 쪽의 글자색을 그대로 따라간다
//   - fill 없음 (점은 예외적으로 currentColor)
//   - 기본 14px, 글자 baseline에 맞도록 vertical-align 보정
//   - 장식이므로 aria-hidden — 의미는 옆 텍스트가 전달한다
import type { SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function Svg({ size = 14, style, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ verticalAlign: '-0.14em', flexShrink: 0, ...style }}
      {...rest}
    />
  );
}

/** 장소 — 지도 핀 */
export function IconPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 14.5s5-4.35 5-8a5 5 0 0 0-10 0c0 3.65 5 8 5 8Z" />
      <circle cx="8" cy="6.5" r="1.75" />
    </Svg>
  );
}

/** 날짜 — 달력 */
export function IconCalendar(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.5" />
      <path d="M2.25 6.5h11.5M5.5 2v2.5M10.5 2v2.5" />
    </Svg>
  );
}

/** 시각 — 시계 */
export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 4.75V8l2.25 1.5" />
    </Svg>
  );
}

/** 댓글 — 말풍선 */
export function IconComment(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.75 9.25a1.5 1.5 0 0 1-1.5 1.5H6l-3.75 2.5v-2.5a1.5 1.5 0 0 1-.5-1.12V4.5A1.5 1.5 0 0 1 3.25 3h9a1.5 1.5 0 0 1 1.5 1.5Z" />
    </Svg>
  );
}

/** 삭제 — 휴지통 */
export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.75 4.25h10.5M6.25 4.25V3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 .75.75v1.25" />
      <path d="M12.25 4.25 11.7 13a1 1 0 0 1-1 .95H5.3a1 1 0 0 1-1-.95L3.75 4.25" />
      <path d="M6.75 7v4M9.25 7v4" />
    </Svg>
  );
}

/** 안내 문구 — 전구 */
export function IconBulb(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 11.5a4 4 0 1 1 4 0v1.25a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1-.75-.75Z" />
      <path d="M6.75 14.25h2.5" />
    </Svg>
  );
}

/** 메모·주의 — 압정 */
export function IconNote(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 2.25 13.75 6.5l-1.6.4a2 2 0 0 0-1 .55l-2.4 2.4-2.6-2.6 2.4-2.4a2 2 0 0 0 .55-1Z" />
      <path d="M6.15 7.25 2.75 13.25l6-3.4" />
    </Svg>
  );
}

/** 영상 파일 */
export function IconVideo(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="4" width="8.5" height="8" rx="1.5" />
      <path d="M10.5 7.25 14 5.5v5l-3.5-1.75Z" />
    </Svg>
  );
}

/** 수정 — 연필 */
export function IconPencil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11.25 2.75a1.4 1.4 0 0 1 2 2L5.5 12.5l-2.75.75.75-2.75Z" />
      <path d="M10 4l2 2" />
    </Svg>
  );
}
