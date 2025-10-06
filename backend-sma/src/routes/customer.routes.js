// backend-sma/src/routes/customer.routes.js
import { Router } from 'express'

// รองรับทุกแบบ: default / named / CJS
import * as requireAuthMod from '../middleware/requireAuth.js'
import * as requireVerifiedMod from '../middleware/requireVerified.js'
import * as requireCustomerMod from '../middleware/requireCustomer.js'

import * as customerCtrl from '../controllers/customer.controller.js'

// interop ให้ทำงานได้ทั้ง default/named/CJS
function pickFn(mod, named) {
  return (typeof mod?.default === 'function' && mod.default)
      || (typeof mod?.[named] === 'function' && mod[named])
      || (typeof mod === 'function' && mod)
}
const requireAuth = pickFn(requireAuthMod, 'requireAuth')
const requireVerified = pickFn(requireVerifiedMod, 'requireVerified')
const requireCustomer = pickFn(requireCustomerMod, 'requireCustomer')

const router = Router()

/* =========================
 *  โปรไฟล์ & รหัสผ่าน (NEW)
 * ========================= */

// ดึงโปรไฟล์ลูกค้าปัจจุบัน
router.get(
  '/profile',
  requireAuth, requireVerified, requireCustomer,
  customerCtrl.getMyProfile
)

// แก้ไขโปรไฟล์ลูกค้า
router.patch(
  '/profile',
  requireAuth, requireVerified, requireCustomer,
  customerCtrl.updateMyProfile
)

// เปลี่ยนรหัสผ่านลูกค้า
router.patch(
  '/change-password',
  requireAuth, requireVerified, requireCustomer,
  customerCtrl.changeMyPassword
)

/* =========================
 *  ใบรับประกัน (EXISTING)
 * ========================= */

// ลูกค้าดึงใบรับประกันของตัวเอง + ค้นหา/ฟิลเตอร์
router.get(
  '/warranties',
  requireAuth, requireVerified, requireCustomer,
  customerCtrl.getMyWarranties
)

// ลูกค้าอัปเดตหมายเหตุในรายการสินค้า
router.patch(
  '/warranty-items/:itemId/note',
  requireAuth, requireVerified, requireCustomer,
  customerCtrl.updateMyNote
)

// ดาวน์โหลด PDF ใบรับประกันของตัวเอง
router.get(
  '/warranties/:warrantyId/pdf',
  requireAuth, requireVerified, requireCustomer,
  customerCtrl.getMyWarrantyPdf
)

export default router
