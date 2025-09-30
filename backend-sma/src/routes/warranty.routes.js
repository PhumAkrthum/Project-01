import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireStore } from "../middleware/requireStore.js";
import { uploadWarrantyImages } from "../middleware/upload.js";
import { updateWarranty, downloadWarrantyPdf, uploadWarrantyImage, deleteWarrantyImage } from "../controllers/warranty.controller.js";

const router = Router();
router.use(requireAuth, requireStore);

router.patch("/:warrantyId", updateWarranty);
router.post("/:warrantyId/images", uploadWarrantyImages, uploadWarrantyImage);
router.delete("/:warrantyId/images/:imageId", deleteWarrantyImage);
router.get("/:warrantyId/pdf", downloadWarrantyPdf);

export default router;
