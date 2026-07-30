import { useRef, useState } from 'react';
import { ROLE_LABELS } from '@/shared/lib/rbac/permissions';
import { useSession } from '@/shared/hooks/useAuth';
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

  if (!profile) return null;

  const nickname = nicknameDraft ?? profile.nickname ?? '';
  const isNicknameChanged = nicknameDraft !== null && nicknameDraft !== (profile.nickname ?? '');

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
    e.target.value = '';
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
    </div>
  );
}
