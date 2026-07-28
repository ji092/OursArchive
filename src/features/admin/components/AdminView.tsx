import { useEffect, useState } from 'react';
import { useUpdateWorkspaceSettings, useWorkspaceSettings } from '@/shared/hooks/useWorkspaceSettings';
import type { WorkspaceSettings } from '@/shared/lib/workspace/workspaceSettingsApi';
import { useApproveJoinRequest, useJoinRequests, useRejectJoinRequest } from '../hooks/useJoinRequests';
import { useInviteMember, useMembers, useRemoveMember, useUpdateMemberRole } from '../hooks/useMembers';
import type { JoinRequest } from '../joinRequestsApi';
import { ROLE_LABELS, type MemberRole } from '../types';
import styles from './AdminView.module.css';

const ROLE_ORDER: MemberRole[] = ['master', 'partner', 'family', 'guest'];
const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  master: '모든 권한, 오직 1명',
  partner: '커플 상대 · 연애/결혼/임신 편집',
  family: '임신·출산(육아) 카테고리 열람',
  guest: '승인된 범위 열람',
};

// 라벨은 챕터 이름(시작/함께/하나가/셋이) 그대로, 옆 설명이 실제 의미다 (2026-07-23 사용자 지정).
const DATE_FIELDS: { key: keyof WorkspaceSettings; label: string; description: string }[] = [
  { key: 'firstMetDate', label: '시작', description: '첫만남' },
  { key: 'coupleStartDate', label: '함께', description: '만나기로 한 날' },
  { key: 'weddingDate', label: '하나가', description: '결혼 날짜' },
  { key: 'dueDate', label: '셋이', description: '출산일' },
];

export function AdminView() {
  const { data: joinRequests } = useJoinRequests();
  const approveJoinRequest = useApproveJoinRequest();
  const rejectJoinRequest = useRejectJoinRequest();
  const { data: members } = useMembers();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const inviteMember = useInviteMember();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [relationLabel, setRelationLabel] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<MemberRole, 'master'>>('family');

  const { data: settings } = useWorkspaceSettings();
  const updateSettings = useUpdateWorkspaceSettings();
  const [dateDraft, setDateDraft] = useState<WorkspaceSettings | null>(null);

  useEffect(() => {
    if (settings) setDateDraft(settings);
  }, [settings]);

  function handleDateChange(key: keyof WorkspaceSettings, value: string) {
    setDateDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleSaveDates() {
    if (dateDraft) updateSettings.mutate(dateDraft);
  }

  if (!members) return <p>불러오는 중…</p>;

  const counts = ROLE_ORDER.reduce<Record<MemberRole, number>>(
    (acc, role) => ({ ...acc, [role]: members.filter((m) => m.role === role).length }),
    { master: 0, partner: 0, family: 0, guest: 0 },
  );

  function handleInvite() {
    if (!email.trim()) return;
    inviteMember.mutate(
      { email: email.trim(), relationLabel: relationLabel.trim() || '게스트', role: inviteRole },
      {
        onSuccess: () => {
          setShowInvite(false);
          setEmail('');
          setRelationLabel('');
        },
      },
    );
  }

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>ADMIN</p>
      <h1 className={styles.title}>
        관리 <span className={styles.titleAccent}>페이지</span>
      </h1>
      <p className={styles.subtitle}>Master 페이지예요. 애인·가족·게스트를 초대하고 권한을 조정하세요.</p>

      <div className={styles.dateSection}>
        <p className={styles.listTitle}>주요 날짜</p>
        <p className={styles.dateSectionHint}>여기서 입력한 날짜가 메인·연애·결혼·임신 화면의 D+/D-DAY 계산에 그대로 쓰여요.</p>
        <div className={styles.dateGrid}>
          {DATE_FIELDS.map((field) => (
            <label key={field.key} className={styles.dateField}>
              <span className={styles.dateFieldLabel}>
                {field.label} <span className={styles.dateFieldDesc}>· {field.description}</span>
              </span>
              <input
                type="date"
                className={styles.dateInput}
                value={dateDraft?.[field.key] ?? ''}
                onChange={(e) => handleDateChange(field.key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <button type="button" className={styles.submit} onClick={handleSaveDates} disabled={!dateDraft}>
          {updateSettings.isSuccess ? '저장됨 ✓' : '날짜 저장하기'}
        </button>
      </div>

      {joinRequests && joinRequests.length > 0 && (
        <div className={styles.joinRequestSection}>
          <p className={styles.listTitle}>가입 요청 {joinRequests.length}건</p>
          <p className={styles.dateSectionHint}>OAuth로 로그인해 가입을 요청한 사람들이에요. 역할을 정해 승인하거나 거절하세요.</p>
          <div className={styles.joinRequestList}>
            {joinRequests.map((request) => (
              <JoinRequestRow
                key={request.id}
                request={request}
                onApprove={(role) => approveJoinRequest.mutate({ id: request.id, role })}
                onReject={() => rejectJoinRequest.mutate(request.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className={styles.summaryRow}>
        {ROLE_ORDER.map((role) => (
          <div key={role} className={styles.summaryCard}>
            <p className={styles.summaryRoleLabel}>{ROLE_LABELS[role].toUpperCase()}</p>
            <p className={styles.summaryCount}>{counts[role]}명</p>
            <p className={styles.summaryDesc}>{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>

      <div className={styles.listHead}>
        <p className={styles.listTitle}>구성원</p>
        <button type="button" className={styles.inviteButton} onClick={() => setShowInvite((v) => !v)}>
          👤+ 구성원 초대
        </button>
      </div>

      {showInvite && (
        <div className={styles.inviteForm}>
          <input className={styles.input} placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={styles.input} placeholder="관계 (예: 친정 어머니)" value={relationLabel} onChange={(e) => setRelationLabel(e.target.value)} />
          <select className={styles.select} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Exclude<MemberRole, 'master'>)}>
            <option value="partner">애인</option>
            <option value="family">가족</option>
            <option value="guest">게스트</option>
          </select>
          <button type="button" className={styles.submit} onClick={handleInvite}>
            초대 보내기
          </button>
        </div>
      )}

      <div className={styles.list}>
        {members.map((member) => (
          <div key={member.id} className={styles.row}>
            <span className={styles.avatar} aria-hidden="true" />
            <div className={styles.info}>
              <p className={styles.name}>
                {member.name}
                {member.status === 'invited' && <span className={styles.pendingBadge}>초대 대기</span>}
              </p>
              <p className={styles.meta}>
                {member.relationLabel} · {member.email}
              </p>
            </div>
            {member.role === 'master' ? (
              <span className={styles.masterBadge}>Master</span>
            ) : (
              <select
                className={styles.roleSelect}
                value={member.role}
                onChange={(e) => updateRole.mutate({ id: member.id, role: e.target.value as MemberRole })}
              >
                <option value="partner">애인</option>
                <option value="family">가족</option>
                <option value="guest">게스트</option>
              </select>
            )}
            {member.role !== 'master' && (
              <button type="button" className={styles.removeButton} onClick={() => removeMember.mutate(member.id)} aria-label="내보내기">
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function JoinRequestRow({
  request,
  onApprove,
  onReject,
}: {
  request: JoinRequest;
  onApprove: (role: Exclude<MemberRole, 'master'>) => void;
  onReject: () => void;
}) {
  const [role, setRole] = useState<Exclude<MemberRole, 'master'>>('family');

  return (
    <div className={styles.joinRequestRow}>
      <span className={styles.avatar} aria-hidden="true" />
      <div className={styles.info}>
        <p className={styles.name}>{request.name ?? '이름 미확인'}</p>
        {request.joinMessage && <p className={styles.joinMessage}>“{request.joinMessage}”</p>}
      </div>
      <select className={styles.roleSelect} value={role} onChange={(e) => setRole(e.target.value as Exclude<MemberRole, 'master'>)}>
        <option value="partner">애인</option>
        <option value="family">가족</option>
        <option value="guest">게스트</option>
      </select>
      <button type="button" className={styles.approveButton} onClick={() => onApprove(role)}>
        승인
      </button>
      <button type="button" className={styles.rejectButton} onClick={onReject}>
        거절
      </button>
    </div>
  );
}
