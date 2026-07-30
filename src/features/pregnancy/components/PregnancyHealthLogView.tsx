import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePregnancyActionsHost } from '../actionsPortal';
import { useCreateHealthLog, useDeleteHealthLog, useHealthLogs } from '../hooks/usePregnancyData';
import { useCurrentWorkspaceId } from '@/shared/hooks/useAuth';
import styles from './PregnancyHealthLogView.module.css';

// 건강기록(health_log) — 체중/혈압/증상/태동 횟수를 날짜별로 남긴다. 2026-07-29 사용자 지정으로
// 이번에 처음 화면을 만든다 (기존엔 프론트 자체가 없었음). 수정 기능은 없이 기록/삭제만.
export function PregnancyHealthLogView() {
  const workspaceId = useCurrentWorkspaceId();
  const { data: logs } = useHealthLogs(workspaceId);
  const createLog = useCreateHealthLog(workspaceId);
  const deleteLog = useDeleteHealthLog(workspaceId);
  const actionsHost = usePregnancyActionsHost();

  const [showForm, setShowForm] = useState(false);
  const [loggedAt, setLoggedAt] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [symptom, setSymptom] = useState('');
  const [fetalMovementCount, setFetalMovementCount] = useState('');

  function handleSubmit() {
    createLog.mutate(
      {
        loggedAt,
        weight: weight ? Number(weight) : undefined,
        bloodPressure: bloodPressure.trim() || undefined,
        symptom: symptom.trim() || undefined,
        fetalMovementCount: fetalMovementCount ? Number(fetalMovementCount) : undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setWeight('');
          setBloodPressure('');
          setSymptom('');
          setFetalMovementCount('');
        },
      },
    );
  }

  return (
    <div className={styles.wrap}>
      {actionsHost &&
        createPortal(
          <button type="button" className={styles.addButton} onClick={() => setShowForm((v) => !v)}>
            + 기록 추가
          </button>,
          actionsHost,
        )}

      {showForm && (
        <div className={styles.form}>
          <input type="date" className={styles.input} value={loggedAt} onChange={(e) => setLoggedAt(e.target.value)} />
          <div className={styles.formRow}>
            <input type="number" className={styles.input} placeholder="체중(kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
            <input className={styles.input} placeholder="혈압 (예: 120/80)" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
            <input type="number" className={styles.input} placeholder="태동 횟수" value={fetalMovementCount} onChange={(e) => setFetalMovementCount(e.target.value)} />
          </div>
          <input className={styles.input} placeholder="증상 메모" value={symptom} onChange={(e) => setSymptom(e.target.value)} />
          <button type="button" className={styles.submit} onClick={handleSubmit}>
            기록 저장하기
          </button>
        </div>
      )}

      <div className={styles.list}>
        {(logs ?? []).map((log) => (
          <div key={log.id} className={styles.row}>
            <div className={styles.rowInfo}>
              <p className={styles.rowDate}>{log.loggedAt}</p>
              <p className={styles.rowMeta}>
                {[
                  log.weight != null && `체중 ${log.weight}kg`,
                  log.bloodPressure && `혈압 ${log.bloodPressure}`,
                  log.fetalMovementCount != null && `태동 ${log.fetalMovementCount}회`,
                  log.symptom,
                ]
                  .filter(Boolean)
                  .join(' · ') || '기록 없음'}
              </p>
            </div>
            <button type="button" className={styles.deleteButton} onClick={() => deleteLog.mutate(log.id)} aria-label="삭제">
              ✕
            </button>
          </div>
        ))}
        {(logs ?? []).length === 0 && <p className={styles.empty}>아직 기록이 없어요.</p>}
      </div>
    </div>
  );
}
