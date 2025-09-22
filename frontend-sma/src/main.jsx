
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './store/auth.jsx'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import WarrantyDashboard from './pages/WarrantyDashboard'

function Layout(){
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main><Outlet /></main>
      <Footer />
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/signin', element: <SignIn /> },
      { path: '/signup', element: <SignUp /> },
      { path: '/verify-email', element: <VerifyEmail /> },
       // Dashboard screens have their own in-app headers.
      { path: '/dashboard/warranty', element: <WarrantyDashboard /> },
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)
