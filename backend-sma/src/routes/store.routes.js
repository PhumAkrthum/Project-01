import { Router } from "express";
import {
  getStoreDashboard,
  updateStoreProfile,
  changeStorePassword,
  createWarranty,
} from "../controllers/store.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireStore } from "../middleware/requireStore.js";

const router = Router();
router.use(requireAuth, requireStore);

router.get("/:storeId/dashboard", getStoreDashboard);
router.patch("/:storeId/profile", updateStoreProfile);
router.post("/:storeId/change-password", changeStorePassword);
router.post("/:storeId/warranties", createWarranty);

export default router;
