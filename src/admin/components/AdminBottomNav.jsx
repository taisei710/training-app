import { NavLink } from 'react-router-dom'
import styles from './AdminBottomNav.module.css'

const tabs = [
  { to: '/admin', label: 'ホーム', icon: '📊', end: true },
  { to: '/admin/schedule', label: 'スケジュール', icon: '🗓️' },
  { to: '/admin/attendance', label: '勤怠', icon: '⏱️' },
]

export default function AdminBottomNav() {
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
