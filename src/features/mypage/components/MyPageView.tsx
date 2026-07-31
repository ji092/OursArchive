import { useEffect, useRef, useState } from 'react';
import { ROLE_LABELS } from '@/shared/lib/rbac/permissions';
import { useSession } from '@/shared/hooks/useAuth';
import { isPushSubscribed, isPushSupported, registerPush, unregisterPush } from '@/shared/lib/push/registerPush';
import { useAvatarUrl, useMyProfile, useUpdateNickname, useUploadAvatar } from '../hooks/useProfile';
import styles from './MyPageView.module.css';

// 요구사항(2026-07-29 사용자 지정): 나의 정보 보기(권한), 프로필 사진 설정, 닉네임 설정 — 가볍게.
export function MyPageView() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useMyProfile(userId);
  const { data: avatarUrl } = useAvatarUrl(profile?.avatarPath);
  const updateNickname = useUpdateNickname(userId);
  const uploadAvatar = useUploadAvatar(userId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  if (!profile) return null;

  const nickname = nicknameDraft ?? profile.nickname ?? '';
  const isNicknameChanged = nicknameDraft !== null && nicknameDraft !== (profile.nickname ?? '');

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
    e.target.value = '';
  }

  // 일정 등록 후 확인/댓글이 없으면 escalate하는 리마인더(0016_schedule_ack.sql)를 OS 푸시로
  // 받을지 여기서 옵트인한다 — 브라우저가 사용자 제스처 없이는 알림 권한을 안 주기 때문에
  // 자동으로 구독시키지 않는다.
  async function togglePush() {
    if (!userId) return;
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await unregisterPush();
        setPushEnabled(false);
      } else {
        setPushEnabled(await registerPush(userId));
      }
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>마이페이지</h1>

      <div className={styles.avatarRow}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className={styles.avatar} />
        ) : (
          <img src="/icons/user.png" alt="" className={styles.avatar} />
        )}
        <button
          type="button"
          className={styles.avatarButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadAvatar.isPending}
        >
          {uploadAvatar.isPending ? '업로드 중...' : '사진 변경'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleAvatarChange}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>권한</span>
        <p className={styles.roleValue}>{profile.role ? ROLE_LABELS[profile.role] : '-'}</p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>닉네임</span>
        <div className={styles.nicknameRow}>
          <input
            className={styles.input}
            value={nickname}
            onChange={(e) => setNicknameDraft(e.target.value)}
            maxLength={20}
          />
          <button
            type="button"
            className={styles.saveButton}
            disabled={!isNicknameChanged || updateNickname.isPending}
            onClick={() => nicknameDraft !== null && updateNickname.mutate(nicknameDraft)}
          >
            저장
          </button>
        </div>
      </div>

      {isPushSupported() && (
        <div className={styles.field}>
          <span className={styles.label}>일정 알림</span>
          <div className={styles.nicknameRow}>
            <p className={styles.roleValue}>{pushEnabled ? '받는 중' : '꺼짐'}</p>
            <button type="button" className={styles.saveButton} disabled={pushBusy} onClick={togglePush}>
              {pushEnabled ? '끄기' : '켜기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
