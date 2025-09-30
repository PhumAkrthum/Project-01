import { Router } from "express";
import {
  getStoreDashboard,
  updateStoreProfile,
  changeStorePassword,
  createWarranty,
} from "../controllers/store.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireStore } from "../middleware/requireStore.js";
import { requireVerified } from "../middleware/requireVerified.js";

const router = Router();

// ต้อง login -> ต้องยืนยันอีเมล -> ต้องเป็นร้าน/เจ้าของ storeId
router.use(requireAuth, requireVerified, requireStore);

router.get("/:storeId/dashboard", getStoreDashboard);
router.patch("/:storeId/profile", updateStoreProfile);
router.post("/:storeId/change-password", changeStorePassword);
router.post("/:storeId/warranties", createWarranty);

export default router;
