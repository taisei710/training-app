import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Home from './pages/Home'
import Attendance from './pages/Attendance'
import SalesOfficeProgram from './pages/SalesOfficeProgram'
import TraineeSchedule from './pages/Schedule'
import BottomNav from './components/BottomNav'

export default function TraineeApp() {
  useEffect(() => { document.title = '研修管理｜研修生' }, [])

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
        <Route path="/attendance" element={<Attendance user={currentUser} />} />
        <Route path="/sales-office-program" element={<SalesOfficeProgram user={currentUser} />} />
        <Route path="/schedule" element={<TraineeSchedule user={currentUser} />} />
        <Route path="*" element={<Navigate to="/trainee" replace />} />
      </Routes>
      <BottomNav />
    </div>
  )
}
