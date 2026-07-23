import { NavLink } from 'react-router-dom';
import styles from './MobileTabBar.module.css';

// 좁은 화면(≤640px)에서 GlobalHeader의 챕터 네비 대신 쓰는 하단 고정 탭바.
// GlobalHeader.module.css의 .nav는 같은 폭에서 숨겨지므로 항상 둘 중 하나만 보인다.
// 모바일에서는 글씨 없이 아이콘만 노출한다 (2026-07-23 사용자 지정).
const TABS = [
  { to: '/', label: '홈', icon: '/icons/home.png' },
  { to: '/love', label: '함께', icon: '/icons/love.png' },
  { to: '/wedding', label: '하나가', icon: '/icons/wedding.png' },
  { to: '/pregnancy', label: '셋이', icon: '/icons/pregnancy.png' },
];

export function MobileTabBar() {
  return (
    <nav className={styles.bar} aria-label="챕터 이동 (모바일)">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab)}
          aria-label={tab.label}
        >
          <img src={tab.icon} alt={tab.label} width={22} height={22} />
        </NavLink>
      ))}
    </nav>
  );
}
