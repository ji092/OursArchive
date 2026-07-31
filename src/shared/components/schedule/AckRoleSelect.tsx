import { ROLE_LABELS } from '@/shared/lib/rbac/permissions';
import type { AckRole } from '@/shared/lib/schedule/types';
import styles from './AckRoleSelect.module.css';

const ACK_ROLES: AckRole[] = ['master', 'partner'];

export interface AckRoleSelectProps {
  value: AckRole;
  onChange: (role: AckRole) => void;
}

// love/wedding/pregnancy는 master·partner만 접근 가능해 확인 요청 대상도 이 둘 중 하나로 고정한다.
export function AckRoleSelect({ value, onChange }: AckRoleSelectProps) {
  return (
    <div className={styles.wrap}>
      <label className={styles.label}>확인 요청 대상</label>
      <div className={styles.chipRow}>
        {ACK_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className={role === value ? `${styles.chip} ${styles.chipActive}` : styles.chip}
            onClick={() => onChange(role)}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>
    </div>
  );
}
