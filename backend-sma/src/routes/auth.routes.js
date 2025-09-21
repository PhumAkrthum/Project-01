// src/routes/auth.routes.js
import { Router } from 'express'
import {
  registerCustomer,
  registerStore,
  resendVerification,
  verifyEmail,
  login,
  me,
  requestPasswordReset,
  resetPassword
} from '../controllers/auth.controller.js'
import jwt from 'jsonwebtoken'

const router = Router()

function requireAuth(req, res, next) {
  // simple bearer auth
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Missing token' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

router.post('/register/customer', registerCustomer)
router.post('/register/store', registerStore)

router.post('/resend', resendVerification)
router.get('/verify', verifyEmail)

router.post('/login', login)
router.get('/me', requireAuth, me)

router.post('/forgot', requestPasswordReset)
router.post('/reset', resetPassword)

export default router
