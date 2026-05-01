import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TraineeApp from './trainee/TraineeApp'
import AdminApp from './admin/AdminApp'
import ManifestUpdater from './ManifestUpdater'

export default function App() {
  return (
    <BrowserRouter>
      <ManifestUpdater />
      <Routes>
        <Route path="/trainee/*" element={<TraineeApp />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/" element={<Navigate to="/trainee" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
