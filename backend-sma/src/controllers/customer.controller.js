// backend-sma/src/controllers/customer.controller.js
import bcrypt from 'bcryptjs'
import { prisma } from '../db/prisma.js'
import * as warrantyCtrl from './warranty.controller.js'

/* =========================
 * Utilities
 * ========================= */

// UTC-safe date-only helper
function dateOnlyUTC(v) {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  if (isNaN(d)) return null
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// ใช้สูตร UTC date-only + Math.ceil ให้ตรงกับฝั่งร้าน/หน้ารายการอื่น ๆ
function statusFromDate(expiryDate, notifyDays = 30) {
  const exp = dateOnlyUTC(expiryDate)
  if (!exp) return { status: 'active', daysLeft: null }

  const today = dateOnlyUTC(new Date())
  const ONE_DAY = 24 * 60 * 60 * 1000
  const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / ONE_DAY)

  if (daysLeft < 0) return { status: 'expired', daysLeft }
  if (daysLeft <= (notifyDays ?? 30)) return { status: 'nearing_expiration', daysLeft }
  return { status: 'active', daysLeft }
}

function bool(v, fallback = false) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    if (/^(true|1|yes|on)$/i.test(v)) return true
    if (/^(false|0|no|off)$/i.test(v)) return false
  }
  return fallback
}

function trimOrNull(s) {
  if (typeof s !== 'string') return null
  const t = s.trim()
  return t ? t : null
}

/* =========================
 * Profile APIs (NEW)
 * ========================= */

// GET /customer/profile
export async function getMyProfile(req, res, next) {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { customerProfile: true },
    })
    if (!me || me.role !== 'CUSTOMER') {
      return res.status(404).json({ message: 'ไม่พบบัญชีลูกค้า' })
    }

    const p = me.customerProfile
    return res.json({
      email: me.email,
      firstName: p?.firstName ?? '',
      lastName: p?.lastName ?? '',
      phone: p?.phone ?? '',
      isConsent: !!p?.isConsent,
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /customer/profile
export async function updateMyProfile(req, res, next) {
  try {
    const body = req.body ?? {}

    const [me, exist] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id } }),
      prisma.customerProfile.findUnique({ where: { userId: req.user.id } }),
    ])

    if (!me || me.role !== 'CUSTOMER') {
      return res.status(404).json({ message: 'ไม่พบบัญชีลูกค้า' })
    }

    const data = {
      firstName: trimOrNull(body.firstName) ?? (exist?.firstName ?? ''),
      lastName: trimOrNull(body.lastName) ?? (exist?.lastName ?? ''),
      phone: trimOrNull(body.phone) ?? (exist?.phone ?? ''),
      isConsent: bool(body.isConsent, exist?.isConsent ?? false),
    }

    const saved = await prisma.customerProfile.upsert({
      where: { userId: req.user.id },
      update: data,
      create: { userId: req.user.id, ...data },
    })

    return res.json({
      message: 'บันทึกโปรไฟล์เรียบร้อย',
      profile: {
        email: me.email,
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone,
        isConsent: saved.isConsent,
      },
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /customer/change-password
export async function changeMyPassword(req, res, next) {
  try {
    const { old_password = '', new_password = '' } = req.body ?? {}

    const me = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!me || me.role !== 'CUSTOMER') {
      return res.status(404).json({ message: 'ไม่พบบัญชีลูกค้า' })
    }

    // ตรวจของเก่า
    const valid = await bcrypt.compare(String(old_password), me.passwordHash)
    if (!valid) {
      return res.status(400).json({ message: 'รหัสผ่านเดิมไม่ถูกต้อง' })
    }

    // ตรวจของใหม่
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
    }
    const same = await bcrypt.compare(String(new_password), me.passwordHash)
    if (same) {
      return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' })
    }

    const hash = await bcrypt.hash(String(new_password), 12)
    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: hash },
    })

    return res.json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อย' })
  } catch (err) {
    next(err)
  }
}

/* =========================
 * Warranties (EXISTING)
 * ========================= */

// GET /customer/warranties
export async function getMyWarranties(req, res, next) {
  try {
    const q = (req.query.q || '').trim()
    const status = req.query.status || 'all'

    const customerCond = {
      OR: [{ customerUserId: req.user.id }, { customerEmail: req.user.email }],
    }

    const where = q
      ? {
          AND: [
            customerCond,
            {
              OR: [
                { code: { contains: q, mode: 'insensitive' } },
                { items: { some: { productName: { contains: q, mode: 'insensitive' } } } },
                { store: { storeProfile: { storeName: { contains: q, mode: 'insensitive' } } } },
              ],
            },
          ],
        }
      : customerCond

    const list = await prisma.warranty.findMany({
      where,
      include: {
        store: { include: { storeProfile: true } },
        items: true, // images เป็น Json ใน item อยู่แล้ว
      },
      orderBy: { createdAt: 'desc' },
    })

    // enrich per item + filter by status
    const totalsCounter = { all: 0, active: 0, nearing_expiration: 0, expired: 0 }
    const filtered = list
      .map((w) => {
        const notifyDays = w.store?.storeProfile?.notifyDaysInAdvance ?? 30
        const items = (w.items || []).map((it) => {
          const s = statusFromDate(it.expiryDate, notifyDays)
          totalsCounter.all += 1
          totalsCounter[s.status] += 1
          return { ...it, _status: s.status, _daysLeft: s.daysLeft }
        })

        const itemsAfterFilter = status === 'all' ? items : items.filter((i) => i._status === status)
        return { ...w, items: itemsAfterFilter }
      })
      .filter((w) => w.items.length > 0 || status === 'all')

    res.json({
      totals: totalsCounter,
      data: filtered,
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /customer/warranty-items/:itemId/note
export async function updateMyNote(req, res, next) {
  try {
    const { itemId } = req.params // cuid string
    const { note = '' } = req.body

    const item = await prisma.warrantyItem.findUnique({
      where: { id: itemId },
      include: { warranty: true },
    })
    if (!item) return res.status(404).json({ message: 'Item not found' })

    const isOwner =
      item.warranty.customerUserId === req.user.id ||
      (item.warranty.customerEmail && item.warranty.customerEmail === req.user.email)

    if (!isOwner) return res.status(403).json({ message: 'Forbidden' })

    const updated = await prisma.warrantyItem.update({
      where: { id: itemId },
      data: { customerNote: String(note) },
    })

    res.json({ message: 'Saved', item: updated })
  } catch (err) {
    next(err)
  }
}

// GET /customer/warranties/:warrantyId/pdf
export async function getMyWarrantyPdf(req, res, next) {
  try {
    const { warrantyId } = req.params

    const w = await prisma.warranty.findUnique({ where: { id: warrantyId } })
    if (!w) return res.status(404).json({ message: 'Not found' })

    const isOwner =
      w.customerUserId === req.user.id ||
      (w.customerEmail && w.customerEmail === req.user.email)

    if (!isOwner) return res.status(403).json({ message: 'Forbidden' })

    // ส่งต่อให้ตัว renderer ที่มีอยู่จริง
    req.params.warrantyId = warrantyId
    return warrantyCtrl.downloadWarrantyPdf(req, res, next)
  } catch (err) {
    next(err)
  }
}
