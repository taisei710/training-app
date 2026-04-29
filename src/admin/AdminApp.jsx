import { Routes, Route, Navigate } from 'react-router-dom'
import AdminHome from './pages/AdminHome'
import MemberDetail from './pages/MemberDetail'
import AllReports from './pages/AllReports'
import AdminSchedule from './pages/AdminSchedule'
import AdminAttendance from './pages/AdminAttendance'
import AdminBottomNav from './components/AdminBottomNav'

export default function AdminApp() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<AdminHome />} />
        <Route path="/member/:memberId" element={<MemberDetail />} />
        <Route path="/reports" element={<AllReports />} />
        <Route path="/attendance" element={<AdminAttendance />} />
        <Route path="/schedule" element={<AdminSchedule />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <AdminBottomNav />
    </div>
  )
}
