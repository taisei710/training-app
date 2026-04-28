import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const tabs = [
  { to: '/trainee', label: 'ホーム', icon: '🏠', end: true },
  { to: '/trainee/submit', label: '日報提出', icon: '✏️' },
  { to: '/trainee/history', label: '履歴', icon: '📄' },
  { to: '/trainee/schedule', label: 'スケジュール', icon: '🗓️' },
]

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.tabActive : ''}`
          }
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
