// src/routes/customer.routes.js
import { Router } from 'express';

// รองรับทุกแบบ: default / named / CJS
import * as requireAuthMod from '../middleware/requireAuth.js';
import * as requireVerifiedMod from '../middleware/requireVerified.js';
import * as requireCustomerMod from '../middleware/requireCustomer.js';

import * as customerCtrl from '../controllers/customer.controller.js';

const requireAuth =
  requireAuthMod.default ?? requireAuthMod.requireAuth ?? requireAuthMod;

const requireVerified =
  requireVerifiedMod.default ?? requireVerifiedMod.requireVerified ?? requireVerifiedMod;

const requireCustomer =
  requireCustomerMod.default ?? requireCustomerMod.requireCustomer ?? requireCustomerMod;

const router = Router();

// ลูกค้าดึงใบรับประกันของตัวเอง + ค้นหา/ฟิลเตอร์
router.get(
  '/warranties',
  requireAuth,
  requireVerified,
  requireCustomer,
  customerCtrl.getMyWarranties
);

// ลูกค้าอัปเดตหมายเหตุในรายการสินค้า
router.patch(
  '/warranty-items/:itemId/note',
  requireAuth,
  requireVerified,
  requireCustomer,
  customerCtrl.updateMyNote
);

// ดาวน์โหลด PDF ใบรับประกันของตัวเอง
router.get(
  '/warranties/:warrantyId/pdf',
  requireAuth,
  requireVerified,
  requireCustomer,
  customerCtrl.getMyWarrantyPdf
);

export default router;
