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
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('adminAuthenticated') === 'true'
  )

  useEffect(() => { document.title = '研修管理｜管理者' }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated')
    setAuthenticated(false)
  }

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />
  }

  return (
    <div className="app-container">
      <button className={styles.logoutBtn} onClick={handleLogout}>
        ログアウト
      </button>
      <Routes>
        <Route path="/" element={<AdminHome />} />
        <Route path="/member/:memberId" element={<MemberDetail />} />
        <Route path="/attendance" element={<AdminAttendance />} />
        <Route path="/schedule" element={<AdminSchedule />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <AdminBottomNav />
    </div>
  )
}
