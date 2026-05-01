import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AdminHome from './pages/AdminHome'
import MemberDetail from './pages/MemberDetail'
import AdminSchedule from './pages/AdminSchedule'
import AdminAttendance from './pages/AdminAttendance'
import AdminBottomNav from './components/AdminBottomNav'

export default function AdminApp() {
  useEffect(() => { document.title = '研修管理｜管理者' }, [])
  return (
    <div className="app-container">
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
