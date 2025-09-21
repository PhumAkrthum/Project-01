// src/controllers/auth.controller.js
import { prisma } from '../db/prisma.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js'
import crypto from 'crypto'

// ========= helpers =========
function buildFrontendUrl(pathname, params = {}) {
  const base = process.env.FRONTEND_URL || process.env.APP_URL
  if (!base) throw new Error('Missing FRONTEND_URL (or APP_URL) in .env')
  const url = new URL(pathname, base)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}
function addHours(date, hours) {
  const d = new Date(date)
  d.setHours(d.getHours() + hours)
  return d
}
function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
}
function newRandomToken() {
  return crypto.randomBytes(32).toString('hex')
}
// ===========================

export async function registerCustomer(req, res) {
  try {
    const { firstName, lastName, email, phone, password, isConsent } = req.body
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' })

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        role: 'CUSTOMER',
        customerProfile: { create: { firstName, lastName, phone, isConsent: !!isConsent } }
      },
      include: { customerProfile: true }
    })

    const token = newRandomToken()
    await prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: addHours(new Date(), 24) // 24 ชั่วโมง
      }
    })

    const verifyUrl = buildFrontendUrl('/verify-email', { token })
    await sendVerificationEmail({ to: user.email, verifyUrl })

    res.status(201).json({ ok: true, message: 'ลงทะเบียนสำเร็จ โปรดยืนยันอีเมล' })
  } catch (err) {
    console.error('registerCustomer error:', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
}

export async function registerStore(req, res) {
  try {
    const { storeName, typeStore, ownerStore, phone, address, timeAvailable, email, password, isConsent } = req.body
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' })

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        role: 'STORE',
        storeProfile: {
          create: { storeName, typeStore, ownerStore, phone, address, timeAvailable, isConsent: !!isConsent }
        }
      },
      include: { storeProfile: true }
    })

    const token = newRandomToken()
    await prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: addHours(new Date(), 24)
      }
    })

    const verifyUrl = buildFrontendUrl('/verify-email', { token })
    await sendVerificationEmail({ to: user.email, verifyUrl })

    res.status(201).json({ ok: true, message: 'ลงทะเบียนสำเร็จ โปรดยืนยันอีเมล' })
  } catch (err) {
    console.error('registerStore error:', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
}

export async function resendVerification(req, res) {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีนี้' })
    if (user.emailVerifiedAt) return res.status(400).json({ message: 'ยืนยันอีเมลแล้ว' })

    // ล้าง token เก่า (ถ้ามี) แล้วออกใหม่
    await prisma.verificationToken.deleteMany({ where: { userId: user.id } })
    const token = newRandomToken()
    await prisma.verificationToken.create({
      data: { token, userId: user.id, expiresAt: addHours(new Date(), 24) }
    })

    const verifyUrl = buildFrontendUrl('/verify-email', { token })
    await sendVerificationEmail({ to: user.email, verifyUrl })

    res.json({ ok: true, message: 'ส่งอีเมลยืนยันใหม่แล้ว' })
  } catch (err) {
    console.error('resendVerification error:', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
}

export async function verifyEmail(req, res) {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ message: 'Missing token' })

    const row = await prisma.verificationToken.findUnique({ where: { token } })
    if (!row) return res.status(400).json({ message: 'โทเคนไม่ถูกต้อง' })
    if (row.usedAt) return res.status(400).json({ message: 'โทเคนนี้ถูกใช้แล้ว' })
    if (new Date(row.expiresAt) < new Date()) return res.status(400).json({ message: 'โทเคนหมดอายุ' })

    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.verificationToken.update({ where: { token }, data: { usedAt: new Date() } })
    ])

    res.json({ ok: true, message: 'ยืนยันอีเมลสำเร็จ' })
  } catch (err) {
    console.error('verifyEmail error:', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({
      where: { email },
      include: { customerProfile: true, storeProfile: true }
    })
    if (!user) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })

    const ok = await bcrypt.compare(password, user.passwordHash || '')
    if (!ok) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })

    if (!user.emailVerifiedAt) {
      return res.status(403).json({ message: 'Email not verified' })
    }

    const token = signJwt({ sub: String(user.id), email: user.email, role: user.role })
    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.role === 'CUSTOMER' ? user.customerProfile : user.storeProfile
    }
    res.json({ user: safeUser, token })
  } catch (err) {
    console.error('login error:', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
}

export async function me(req, res) {
  try {
    const id = Number(req.user?.sub)
    if (!id) return res.status(401).json({ message: 'Unauthorized' })
    const user = await prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true, storeProfile: true }
    })
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชี' })
    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.role === 'CUSTOMER' ? user.customerProfile : user.storeProfile
    }
    res.json(safeUser)
  } catch (err) {
    console.error('me error:', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
}

export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.json({ ok: true, message: 'ถ้ามีบัญชีนี้ เราจะส่งอีเมลให้' }) // ไม่บอกว่าไม่มี

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
    const token = newRandomToken()
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: addHours(new Date(), 1) } // 1 ชั่วโมง
    })

    // ลิงก์ไปหน้าเว็บ reset
    const resetUrl = buildFrontendUrl('/reset-password', { token })
    await sendPasswordResetEmail({ to: user.email, resetUrl })

    res.json({ ok: true, message: 'ถ้ามีบัญชีนี้ เราได้ส่งอีเมลให้แล้ว' })
  } catch (err) {
    console.error('requestPasswordReset error:', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ message: 'ข้อมูลไม่ครบ' })

    const row = await prisma.passwordResetToken.findUnique({ where: { token } })
    if (!row) return res.status(400).json({ message: 'โทเคนไม่ถูกต้อง' })
    if (row.usedAt) return res.status(400).json({ message: 'โทเคนนี้ถูกใช้แล้ว' })
    if (new Date(row.expiresAt) < new Date()) return res.status(400).json({ message: 'โทเคนหมดอายุ' })

    const hash = await bcrypt.hash(password, 10)
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash: hash } }),
      prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } })
    ])

    res.json({ ok: true, message: 'ตั้งรหัสผ่านใหม่สำเร็จ' })
  } catch (err) {
    console.error('resetPassword error:', err)
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' })
  }
}
