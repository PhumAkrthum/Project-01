// backend-sma/src/routes/warranty.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireStore } from "../middleware/requireStore.js";
import { requireVerified } from "../middleware/requireVerified.js";
import { uploadWarrantyImages } from "../middleware/upload.js";
import {
  updateWarranty,
  downloadWarrantyPdf,
  uploadWarrantyImage,
  deleteWarrantyImage,
} from "../controllers/warranty.controller.js";

const router = Router();

// ต้อง login -> ต้องยืนยันอีเมล -> ต้องเป็นร้านค้า
router.use(requireAuth, requireVerified, requireStore);

router.patch("/:warrantyId", updateWarranty);
router.post("/:warrantyId/images", uploadWarrantyImages, uploadWarrantyImage);
router.delete("/:warrantyId/images/:imageId", deleteWarrantyImage);
router.get("/:warrantyId/pdf", downloadWarrantyPdf);

export default router;
