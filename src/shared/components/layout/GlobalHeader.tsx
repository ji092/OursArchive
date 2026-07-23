import type { CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './GlobalHeader.module.css';

// 챕터 라벨(함께/하나가/셋이)은 요구사항 문서의 연애/결혼/임신이 아니라 Readdy 프론트 목업에서
// 확정된 실제 UI 문구를 그대로 따른다 (2026-07-22 목업 검토, DECISIONS.md 참조).
// 아이콘은 사용자가 제공한 public/icons/*.png (2026-07-23).
// 호버/활성 색상은 각 챕터 테마 변수를 그대로 참조한다(각 페이지 본문에 쓰는 색과 동일) —
// 2026-07-23 사용자 지정: 헤더 메뉴도 챕터별 색을 따라가도록 변경(기존엔 항상 하늘색 고정).
const CHAPTERS = [
  { to: '/love', label: '함께', icon: '/icons/love.png', accent: 'var(--color-accent)', accentHover: 'var(--color-accent-hover)', accentSoft: 'var(--color-accent-soft)' },
  { to: '/wedding', label: '하나가', icon: '/icons/wedding.png', accent: 'var(--color-wedding-accent)', accentHover: 'var(--color-wedding-accent-hover)', accentSoft: 'var(--color-wedding-accent-soft)' },
  { to: '/pregnancy', label: '셋이', icon: '/icons/pregnancy.png', accent: 'var(--color-pregnancy-accent)', accentHover: 'var(--color-pregnancy-accent-hover)', accentSoft: 'var(--color-pregnancy-accent-soft)' },
];

export interface GlobalHeaderProps {
  isMaster: boolean;
  unreadCount: number;
}

export function GlobalHeader({ isMaster, unreadCount }: GlobalHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.logoMark} aria-hidden="true">
            <img src="/icons/logoMark.png" alt="" width={18} height={18} />
          </span>
          <span>
            <span className={styles.brandName}>Ours Archive</span>
            <span className={styles.brandSub}>우리 둘의 기록</span>
          </span>
        </NavLink>

        <nav className={styles.nav} aria-label="챕터 이동">
          {CHAPTERS.map((chapter) => (
            <NavLink
              key={chapter.to}
              to={chapter.to}
              className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink)}
              style={
                {
                  '--nav-accent': chapter.accent,
                  '--nav-accent-hover': chapter.accentHover,
                  '--nav-accent-soft': chapter.accentSoft,
                } as CSSProperties
              }
            >
              <img src={chapter.icon} alt="" width={16} height={16} className={styles.navIcon} />
              {chapter.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          {isMaster && (
            <NavLink to="/admin/members" className={styles.iconButton} aria-label="관리 페이지">
              <ShieldIcon />
            </NavLink>
          )}
          <button type="button" className={styles.iconButton} aria-label="알림">
            <BellIcon />
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <div className={styles.avatar} aria-hidden="true">
            <img src="/icons/user.png" alt="" width={18} height={18} />
          </div>
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
