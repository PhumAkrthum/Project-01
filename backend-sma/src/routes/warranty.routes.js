import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireVerified } from "../middleware/requireVerified.js";
import { requireStore } from "../middleware/requireStore.js";
import { downloadWarrantyPdf, getWarrantyHeader } from "../controllers/warranty.controller.js";

const router = Router();

// ต้อง login -> ต้องยืนยันอีเมล -> ต้องเป็นร้านค้า
router.use(requireAuth, requireVerified, requireStore);

// อ่านข้อมูลใบ (ถ้าต้องใช้)
router.get("/:warrantyId", getWarrantyHeader);

// สร้าง PDF ระดับ "ใบ"
router.get("/:warrantyId/pdf", downloadWarrantyPdf);

export default router;
