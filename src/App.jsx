import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TraineeApp from './trainee/TraineeApp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/trainee/*" element={<TraineeApp />} />
        <Route path="/" element={<Navigate to="/trainee" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
