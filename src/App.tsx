import { Routes, Route } from 'react-router-dom'
import GuestUpload from './pages/GuestUpload/GuestUpload'
import SetupPortal from './pages/SetupPortal/SetupPortal'
import WeddingQR from './pages/WeddingQR/WeddingQR'

function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestUpload />} />
      <Route path="/index" element={<GuestUpload />} />
      <Route path="/setup-portal" element={<SetupPortal />} />
      <Route path="/wedding-qr" element={<WeddingQR />} />
    </Routes>
  )
}

export default App
