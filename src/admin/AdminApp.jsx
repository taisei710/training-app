import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AdminHome from './pages/AdminHome'
import MemberDetail from './pages/MemberDetail'
import AdminSchedule from './pages/AdminSchedule'
import AdminAttendance from './pages/AdminAttendance'
import AdminBottomNav from './components/AdminBottomNav'
import AdminLogin from './components/AdminLogin'
import styles from './AdminApp.module.css'

export default function AdminApp() {
  const [mode, setMode] = useState(
    () => sessionStorage.getItem('adminMode')
  )

  useEffect(() => { document.title = '研修管理｜管理者' }, [])

  const handleSelect = (selectedMode) => {
    sessionStorage.setItem('adminMode', selectedMode)
    setMode(selectedMode)
  }

  const handleReset = () => {
    sessionStorage.removeItem('adminMode')
    setMode(null)
  }

  if (!mode) {
    return <AdminLogin onSelect={handleSelect} />
  }

  const editMode = mode === 'edit'

  return (
    <div className="app-container" style={{ paddingTop: '44px' }}>
      <div className={styles.modeBar}>
        <span className={`${styles.modeBadge} ${editMode ? styles.modeBadgeEdit : styles.modeBadgeView}`}>
          {editMode ? '✏️ 編集モード' : '👁️ 閲覧のみ'}
        </span>
        <button className={styles.modeChangeBtn} onClick={handleReset}>
          モード変更
        </button>
      </div>
      <Routes>
        <Route path="/" element={<AdminHome />} />
        <Route path="/member/:memberId" element={<MemberDetail editMode={editMode} />} />
        <Route path="/attendance" element={<AdminAttendance editMode={editMode} />} />
        <Route path="/schedule" element={<AdminSchedule editMode={editMode} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <AdminBottomNav />
    </div>
  )
}
