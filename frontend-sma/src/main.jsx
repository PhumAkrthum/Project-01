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
import CustomerWarranty from './pages/CustomerWarranty.jsx' // ★ เพิ่ม

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

// ★ ใหม่: guard สำหรับลูกค้า
function ProtectedCustomerRoute({ children }) {
  const location = useLocation()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const role = token ? decodeJwt(token)?.role : null

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location }} />
  }
  if (role !== 'CUSTOMER') {
    // ถ้าเป็นร้านอยู่แล้วให้ไปแดชบอร์ดร้าน
    if (role === 'STORE') return <Navigate to="/dashboard/warranty" replace />
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

      // Dashboard ร้าน (STORE)
      {
        path: '/dashboard/warranty',
        element: (
          <ProtectedStoreRoute>
            <WarrantyDashboard />
          </ProtectedStoreRoute>
        ),
      },

      // ★ หน้า "ใบรับประกันของฉัน" สำหรับลูกค้า (CUSTOMER)
      {
        path: '/customer/warranties',
        element: (
          <ProtectedCustomerRoute>
            <CustomerWarranty />
          </ProtectedCustomerRoute>
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
