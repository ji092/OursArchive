import { useEffect, useState } from 'react';
import { IconCalendar, IconNote } from '@/shared/components/ui/icons';
import { formatMonthDayTime } from '@/shared/lib/date/formatDateTime';
import { createPortal } from 'react-dom';
import { AckRoleSelect } from '@/shared/components/schedule/AckRoleSelect';
import { ScheduleCommentPanel } from '@/shared/components/schedule/ScheduleCommentPanel';
import { usePregnancyActionsHost } from '../actionsPortal';
import { useCheckups, useCreateCheckup, useDeleteCheckup, useUpdateCheckup } from '../hooks/usePregnancyData';
import { useCurrentWorkspaceId, useMyMembership, useSession } from '@/shared/hooks/useAuth';
import { createScheduleAck } from '@/shared/lib/schedule/scheduleAckApi';
import { reportFailure } from '@/shared/lib/notice/failureNotice';
import type { AckRole } from '@/shared/lib/schedule/types';
import type { Checkup } from '../types';
import styles from './PregnancyCheckupView.module.css';

// 검진 등록/수정/삭제(2026-07-29 사용자 지정 — 기존엔 조회 전용이었음). 결혼/임신 다른 탭의
// "+ 추가" 팝업과 동일하게 actionsPortal로 페이지 헤더에 버튼을 꽂는다.
export function PregnancyCheckupView() {
  const workspaceId = useCurrentWorkspaceId();
  const { session } = useSession();
  const { data: myMembership } = useMyMembership(session?.user.id);
  const { data: checkups } = useCheckups(workspaceId);
  const createCheckup = useCreateCheckup(workspaceId);
  const updateCheckup = useUpdateCheckup(workspaceId);
  const deleteCheckup = useDeleteCheckup(workspaceId);
  const actionsHost = usePregnancyActionsHost();

  const [editing, setEditing] = useState<Checkup | 'new' | null>(null);
  const [weekNo, setWeekNo] = useState(1);
  const [title, setTitle] = useState('');
  const [hospital, setHospital] = useState('');
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [status, setStatus] = useState<Checkup['status']>('upcoming');
  const [note, setNote] = useState('');
  const [resultMemo, setResultMemo] = useState('');
  const [resultWeight, setResultWeight] = useState('');
  const [ackRole, setAckRole] = useState<AckRole>('partner');

  useEffect(() => {
    if (myMembership?.role === 'master') setAckRole('partner');
    else if (myMembership?.role === 'partner') setAckRole('master');
  }, [myMembership?.role]);

  const nextCheckup = checkups?.find((c) => c.status === 'upcoming');

  function openNew() {
    setWeekNo(1);
    setTitle('');
    setHospital('');
    setDoctor('');
    setDate(new Date().toISOString().slice(0, 10));
    setTime('10:00');
    setStatus('upcoming');
    setNote('');
    setResultMemo('');
    setResultWeight('');
    setEditing('new');
  }

  function openEdit(checkup: Checkup) {
    setWeekNo(checkup.weekNo);
    setTitle(checkup.title);
    setHospital(checkup.hospital);
    setDoctor(checkup.doctor);
    setDate(checkup.scheduledAt.slice(0, 10));
    setTime(checkup.scheduledAt.slice(11, 16));
    setStatus(checkup.status);
    setNote(checkup.note ?? '');
    setResultMemo(checkup.resultMemo ?? '');
    setResultWeight(checkup.resultWeight ? String(checkup.resultWeight) : '');
    setEditing(checkup);
  }

  function handleSubmit() {
    const userId = session?.user.id;
    if (!title.trim() || !hospital.trim() || !workspaceId || !userId) return;
    const input = {
      weekNo,
      title: title.trim(),
      hospital: hospital.trim(),
      doctor: doctor.trim(),
      scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
      status,
      note: note.trim() || undefined,
      resultMemo: resultMemo.trim() || undefined,
      resultWeight: resultWeight ? Number(resultWeight) : undefined,
    };

    function ack(sourceId: string) {
      createScheduleAck({ sourceType: 'pregnancy_checkup', sourceId, workspaceId: workspaceId!, createdBy: userId!, ackRole }).catch((cause) => reportFailure('일정은 저장됐지만 확인 알림 설정에 실패했어요. 일정을 수정해 확인 대상을 다시 지정해주세요.', cause));
    }

    if (editing === 'new') {
      createCheckup.mutate(input, { onSuccess: (newId) => { ack(newId); setEditing(null); } });
    } else if (editing) {
      updateCheckup.mutate({ id: editing.id, input }, { onSuccess: () => { ack(editing.id); setEditing(null); } });
    }
  }

  return (
    <div className={styles.grid}>
      {actionsHost &&
        createPortal(
          <button type="button" className={styles.addButton} onClick={openNew}>
            + 검진 추가
          </button>,
          actionsHost,
        )}

      {editing && (
        <div className={styles.overlay} onClick={() => setEditing(null)}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formHead}>
              <p className={styles.formTitle}>{editing === 'new' ? '검진 추가' : '검진 수정'}</p>
              <button type="button" className={styles.closeButton} onClick={() => setEditing(null)} aria-label="닫기">
                ✕
              </button>
            </div>
            <div className={styles.formRow}>
              <input type="number" className={styles.input} placeholder="주차" value={weekNo} min={1} max={40} onChange={(e) => setWeekNo(Number(e.target.value))} />
              <div className={styles.chipRow}>
                <button type="button" className={status === 'upcoming' ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => setStatus('upcoming')}>
                  예정
                </button>
                <button type="button" className={status === 'done' ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => setStatus('done')}>
                  완료
                </button>
              </div>
            </div>
            <input className={styles.input} placeholder="검진명 (예: 20주 정기검진)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className={styles.formRow}>
              <input className={styles.input} placeholder="병원" value={hospital} onChange={(e) => setHospital(e.target.value)} />
              <input className={styles.input} placeholder="담당의" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="time" className={styles.input} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <input className={styles.input} placeholder="방문 전 안내 (예: 성별 확인 가능)" value={note} onChange={(e) => setNote(e.target.value)} />
            <input className={styles.input} placeholder="소견 메모" value={resultMemo} onChange={(e) => setResultMemo(e.target.value)} />
            <input type="number" className={styles.input} placeholder="측정 체중(kg)" value={resultWeight} onChange={(e) => setResultWeight(e.target.value)} />

            <AckRoleSelect value={ackRole} onChange={setAckRole} />

            {editing !== 'new' && workspaceId && (
              <ScheduleCommentPanel
                sourceType="pregnancy_checkup"
                sourceId={editing.id}
                workspaceId={workspaceId}
                currentUserId={session?.user.id}
              />
            )}

            <div className={styles.formRow}>
              <button type="button" className={styles.submit} onClick={handleSubmit}>
                {editing === 'new' ? '추가하기' : '저장하기'}
              </button>
              {editing !== 'new' && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => {
                    deleteCheckup.mutate(editing.id);
                    setEditing(null);
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <section className={styles.card}>
        <p className={styles.sectionTitle}>NEXT CHECKUP</p>
        {nextCheckup ? (
          <div>
            <p className={styles.nextCheckupTitle}>{nextCheckup.title}</p>
            <p className={styles.nextCheckupMeta}>
              {nextCheckup.hospital} · {nextCheckup.doctor}
            </p>
            <p className={styles.nextCheckupMeta}><IconCalendar /> {formatMonthDayTime(nextCheckup.scheduledAt)}</p>
            {nextCheckup.note && <p className={styles.nextCheckupNote}><IconNote /> {nextCheckup.note}</p>}
          </div>
        ) : (
          <p className={styles.empty}>예정된 검진이 없어요.</p>
        )}
      </section>

      <section className={styles.card}>
        <p className={styles.sectionTitle}>검진 일정</p>
        {(checkups ?? []).map((checkup) => (
          <button key={checkup.id} type="button" className={styles.checkupRow} onClick={() => openEdit(checkup)}>
            <span className={checkup.status === 'done' ? styles.checkDone : styles.checkPending}>
              {checkup.status === 'done' ? '✓' : '○'}
            </span>
            <div>
              <p className={styles.checkupTitle}>{checkup.title}</p>
              <p className={styles.checkupMeta}>{checkup.hospital}</p>
            </div>
          </button>
        ))}
        {(checkups ?? []).length === 0 && <p className={styles.empty}>등록된 검진이 없어요.</p>}
      </section>
    </div>
  );
}
