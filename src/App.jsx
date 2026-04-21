import { useState, Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import StarField from './components/StarField'
import SolarSystem from './components/SolarSystem'
import IntroLoader from './components/IntroLoader'
import Home from './pages/Home'
import Register from './pages/Register'
import RegistrationSuccess from './pages/RegistrationSuccess'
import UploadPPT from './pages/UploadPPT'
import Admin from './pages/Admin'
import Verify from './pages/Verify'

const CosmonautFlying = lazy(() => import('./components/CosmonautFlying'))

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const [intro, setIntro] = useState(!isAdmin)

  return (
    <>
      <StarField />
      <SolarSystem />
      <Suspense fallback={null}><CosmonautFlying /></Suspense>
      {intro && <IntroLoader onDone={() => setIntro(false)} />}
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register/success" element={<RegistrationSuccess />} />
              <Route path="/upload" element={<UploadPPT />} />
            </Routes>
          </>
        } />
      </Routes>
    </>
  )
}
