export {};

// 카카오맵 JS SDK는 공식 타입 패키지가 없어 window.kakao를 any로 선언해 둔다.
declare global {
  interface Window {
    kakao: any;
  }
}
