// src/main.jsx (หรือไฟล์ที่คุณใช้สร้าง Router หลัก)
import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useLocation,
  Navigate,
} from 'react-router-dom'
import './index.css'
import { AuthProvider } from './store/auth.jsx'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import WarrantyDashboard from './pages/WarrantyDashboard'

/** ===== Helpers / Guards ===== */
function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

function ProtectedStoreRoute({ children }) {
  const location = useLocation()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const role = token ? decodeJwt(token)?.role : null

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }
  if (role !== 'STORE') {
    return <Navigate to="/" replace />
  }
  return children
}

/** ===== Layouts ===== */
function Layout() {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard')
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {!isDashboard && <Navbar />}
      <main><Outlet /></main>
      {!isDashboard && <Footer />}
    </div>
  )
}

/** ===== Router ===== */
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/signin', element: <SignIn /> },
      { path: '/signup', element: <SignUp /> },
      { path: '/verify-email', element: <VerifyEmail /> },

      // Dashboard (ใช้ Guard กัน role ให้เป็นร้านค้าเท่านั้น)
      {
        path: '/dashboard/warranty',
        element: (
          <ProtectedStoreRoute>
            <WarrantyDashboard />
          </ProtectedStoreRoute>
        ),
      },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)
