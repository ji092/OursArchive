// 실제 인증(auth.uid → profiles, membership.role in ['master','partner']) 연동 전까지
// "지금 로그인한 사람"을 임시로 고정해둔다. 로그인이 붙으면 이 파일은 삭제하고 useAuth() 같은
// 훅으로 대체한다. 작성 폼의 작성자 선택, 댓글 작성/삭제 권한 판정에서 함께 참조한다.
export const LOVE_AUTHORS = ['지우', '현우'] as const;
export const CURRENT_AUTHOR_NAME: (typeof LOVE_AUTHORS)[number] = LOVE_AUTHORS[0];
