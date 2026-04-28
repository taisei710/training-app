import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Home from './pages/Home'
import ReportSubmit from './pages/ReportSubmit'
import ReportHistory from './pages/ReportHistory'
import SalesOfficeProgram from './pages/SalesOfficeProgram'
import TraineeCalendar from './pages/Calendar'
import BottomNav from './components/BottomNav'

export default function TraineeApp() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('trainee_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (member) => {
    setCurrentUser(member)
    sessionStorage.setItem('trainee_user', JSON.stringify(member))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    sessionStorage.removeItem('trainee_user')
  }

  if (!currentUser) {
    return (
      <div className="app-container">
        <Login onLogin={handleLogin} />
      </div>
    )
  }

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Home user={currentUser} onLogout={handleLogout} />} />
        <Route path="/submit" element={<ReportSubmit user={currentUser} />} />
        <Route path="/history" element={<ReportHistory user={currentUser} />} />
        <Route path="/sales-office-program" element={<SalesOfficeProgram user={currentUser} />} />
        <Route path="/calendar" element={<TraineeCalendar user={currentUser} />} />
        <Route path="*" element={<Navigate to="/trainee" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
