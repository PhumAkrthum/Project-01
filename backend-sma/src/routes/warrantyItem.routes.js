// src/routes/warrantyItem.routes.js
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireVerified } from '../middleware/requireVerified.js';
import { requireStore } from '../middleware/requireStore.js';
import { uploadWarrantyImages } from '../middleware/uploadImages.js';
import {
  addItemImages,
  deleteItemImage,
  updateItem, // ⬅️ เพิ่มสำหรับ PATCH
} from '../controllers/warrantyItem.controller.js';

const router = Router();

// ต้องเป็นร้านค้า + ยืนยันอีเมล + login
router.use(requireAuth, requireVerified, requireStore);

// แก้ไขข้อมูลหลักของรายการ (รองรับแนบรูปได้ด้วยใน PATCH เดียวกัน)
router.patch('/:itemId', uploadWarrantyImages, updateItem);

// อัปโหลดรูปเพิ่ม (เฉพาะรูปอย่างเดียว)
router.post('/:itemId/images', uploadWarrantyImages, addItemImages);

// ลบรูป
router.delete('/:itemId/images/:imageId', deleteItemImage);

export default router;
