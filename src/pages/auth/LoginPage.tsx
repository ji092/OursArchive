import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithKakao, signOut, submitJoinRequest } from '@/shared/lib/auth/authApi';
import { myMembershipQueryKey, useMyMembership, useSession } from '@/shared/hooks/useAuth';
import styles from './LoginPage.module.css';

// OAuth(카카오) 자가가입 + Master 승인 플로우의 로그인 화면 (구글 로그인은 미사용, 2026-07-28 사용자 지정).
// 1) 미로그인: 소셜 로그인 버튼만 표시
// 2) 로그인 O, membership 없음: "자기는 누구다" 소개 메시지 입력 후 가입 요청
// 3) 가입 요청 O, status=pending/invited: 승인 대기 안내
// 4) status=active: 대시보드로 이동
export default function LoginPage() {
  const { session, isLoading: isSessionLoading } = useSession();
  const userId = session?.user.id;
  const { data: membership, isLoading: isMembershipLoading } = useMyMembership(userId);

  if (isSessionLoading || (userId && isMembershipLoading)) {
    return (
      <main className={styles.page}>
        <div className={styles.card} />
      </main>
    );
  }

  if (!session) {
    return (
      <main className={styles.page}>
        <ProviderChoiceCard />
      </main>
    );
  }

  if (membership?.status === 'active') {
    return <Navigate to="/" replace />;
  }

  if (membership) {
    return (
      <main className={styles.page}>
        <PendingCard joinMessage={membership.joinMessage} />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <JoinRequestCard userId={userId!} />
    </main>
  );
}

function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.logoMark} aria-hidden="true">
        <img src="/icons/logoMark.png" alt="" width={22} height={22} />
      </span>
      <span className={styles.brandName}>Ours Archive</span>
      <p className={styles.brandSub}>우리 들의 기록</p>
    </div>
  );
}

function ProviderChoiceCard() {
  const [error, setError] = useState<string | null>(null);

  async function handleKakao() {
    setError(null);
    try {
      await signInWithKakao();
    } catch {
      setError('카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  }

  return (
    <div className={styles.card}>
      <Brand />
      <p className={styles.lead}>카카오로 로그인하고, 우리 가족만의 기록을 시작해요.</p>

      <div className={styles.providerList}>
        <button type="button" className={`${styles.providerButton} ${styles.kakao}`} onClick={handleKakao}>
          <KakaoIcon />
          카카오로 시작하기
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <p className={styles.footnote}>
        처음이신가요? 로그인 후 자기소개를 남기면 가족 관리자가 확인하고 권한을 열어드려요.
      </p>
    </div>
  );
}

function JoinRequestCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: () => submitJoinRequest(userId, message.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myMembershipQueryKey(userId) }),
    // 아래에서 mutation.isError로 폼 안에 직접 표시하므로 전역 토스트는 끈다(중복 안내 방지).
    meta: { silentError: true },
  });

  return (
    <div className={styles.card}>
      <Brand />
      <p className={styles.lead}>처음 오셨네요. 어떤 분인지 간단히 알려주시면 가족 관리자가 확인할게요.</p>

      <form
        className={styles.joinForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (!message.trim() || mutation.isPending) return;
          mutation.mutate();
        }}
      >
        <textarea
          className={styles.joinTextarea}
          placeholder="본인을 소개하는 단어를 작성해 주세요"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={200}
        />
        <button type="submit" className={styles.submitButton} disabled={!message.trim() || mutation.isPending}>
          {mutation.isPending ? '보내는 중…' : '가입 요청 보내기'}
        </button>
        {mutation.isError && <p className={styles.error}>요청을 보내지 못했어요. 다시 시도해주세요.</p>}
      </form>

      <button type="button" className={styles.signOutLink} onClick={() => signOut()}>
        다른 계정으로 로그인
      </button>
    </div>
  );
}

function PendingCard({ joinMessage }: { joinMessage: string | null }) {
  return (
    <div className={styles.card}>
      <Brand />
      <p className={styles.lead}>가입 요청을 보냈어요. 가족 관리자의 승인을 기다리고 있어요.</p>
      {joinMessage && <p className={styles.pendingMessage}>“{joinMessage}”</p>}
      <button type="button" className={styles.signOutLink} onClick={() => signOut()}>
        다른 계정으로 로그인
      </button>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#181600"
        d="M12 3c-5.52 0-10 3.48-10 7.78 0 2.77 1.86 5.2 4.66 6.58-.2.75-.74 2.76-.85 3.19-.13.53.2.52.42.38.17-.11 2.7-1.83 3.8-2.58.63.09 1.28.14 1.97.14 5.52 0 10-3.48 10-7.71C22 6.48 17.52 3 12 3z"
      />
    </svg>
  );
}
