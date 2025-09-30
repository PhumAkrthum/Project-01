// backend-sma/src/controllers/store.controller.js
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma.js";
import {
  updateStoreProfileSchema,
  changePasswordSchema,
  createWarrantySchema,
} from "../utils/validators.js";
import {
  buildWarrantyPersistenceData,
  mapWarrantyForResponse,
  summarizeWarrantyStatuses,
} from "../utils/warranty.js";
import { sendError, sendSuccess } from "../utils/http.js";

const DEFAULT_NOTIFY_DAYS = 14;

// ✅ แก้จุดเดียว: ใช้ sub จากโทเคนเป็นแหล่งความจริง ไม่เชื่อ :storeId จากพารามิเตอร์
function parseStoreId(req, res) {
  const sub = Number(req.user?.sub);
  if (!Number.isInteger(sub)) {
    sendError(res, 403, "ไม่พบรหัสร้านในโทเคน");
    return null;
  }
  // ผูกพารามิเตอร์ให้เท่ากับ sub เสมอ เพื่อความสอดคล้อง
  req.params.storeId = String(sub);
  return sub;
}

function mapStoreProfile(profile, userEmail) {
  if (!profile) {
    return {
      storeName: "",
      contactName: "",
      email: userEmail ?? "",
      phone: "",
      address: "",
      businessHours: "",
      avatarUrl: "",
      storeType: "",
      ownerName: "",
      notifyDaysInAdvance: DEFAULT_NOTIFY_DAYS,
    };
  }

  return {
    storeName: profile.storeName,
    contactName: profile.contactName ?? profile.ownerName ?? "",
    email: profile.email ?? userEmail ?? "",
    phone: profile.phone,
    address: profile.address,
    businessHours: profile.businessHours,
    avatarUrl: profile.avatarUrl ?? "",
    storeType: profile.storeType,
    ownerName: profile.ownerName,
    notifyDaysInAdvance: profile.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS,
  };
}

export async function getStoreDashboard(req, res) {
  const storeId = parseStoreId(req, res);
  if (storeId == null) return;

  try {
    const store = await prisma.user.findUnique({
      where: { id: storeId },
      include: {
        storeProfile: true,
        warranties: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!store || store.role !== "STORE") {
      return sendError(res, 404, "ไม่พบบัญชีร้านค้า");
    }

    const notifyDays = store.storeProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;
    const warranties = store.warranties.map((warranty) =>
      mapWarrantyForResponse(warranty, { notifyDaysInAdvance: notifyDays })
    );

    const statusFilters = summarizeWarrantyStatuses(store.warranties, notifyDays);
    const filters = {
      statuses:
        statusFilters.length > 0
          ? statusFilters
          : [
              { code: "active", label: "ใช้งานได้", count: 0 },
              { code: "nearing_expiration", label: "ใกล้หมดอายุ", count: 0 },
              { code: "expired", label: "หมดอายุ", count: 0 },
            ],
    };

    return sendSuccess(res, {
      storeProfile: mapStoreProfile(store.storeProfile, store.email),
      warranties,
      filters,
    });
  } catch (error) {
    console.error("getStoreDashboard error", error);
    return sendError(res, 500, "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
  }
}

export async function updateStoreProfile(req, res) {
  const storeId = parseStoreId(req, res);
  if (storeId == null) return;

  try {
    const payload = updateStoreProfileSchema.parse(req.body ?? {});

    const [storeUser, existingProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: storeId } }),
      prisma.storeProfile.findUnique({ where: { userId: storeId } }),
    ]);

    if (!storeUser || storeUser.role !== "STORE") {
      return sendError(res, 404, "ไม่พบข้อมูลร้านค้า");
    }

    const updatable = {
      storeName: payload.storeName,
      contactName:
        payload.contactName ?? existingProfile?.contactName ?? existingProfile?.ownerName ?? null,
      ownerName:
        payload.ownerName ??
        existingProfile?.ownerName ??
        payload.contactName ??
        existingProfile?.contactName ??
        payload.storeName,
      storeType: payload.storeType ?? existingProfile?.storeType ?? "ทั่วไป",
      phone: payload.phone,
      email: payload.email || existingProfile?.email || storeUser.email,
      address: payload.address,
      businessHours: payload.businessHours ?? existingProfile?.businessHours ?? "",
      avatarUrl: payload.avatarUrl ?? existingProfile?.avatarUrl,
      notifyDaysInAdvance:
        payload.notifyDaysInAdvance ?? existingProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS,
    };

    if (!updatable.businessHours) updatable.businessHours = "ระบุเวลาทำการ";
    if (!updatable.ownerName) updatable.ownerName = payload.storeName;

    const nextProfile = await prisma.storeProfile.upsert({
      where: { userId: storeId },
      update: updatable,
      create: {
        userId: storeId,
        storeName: updatable.storeName,
        storeType: updatable.storeType,
        ownerName: updatable.ownerName,
        contactName: updatable.contactName,
        phone: updatable.phone,
        email: updatable.email,
        address: updatable.address,
        businessHours: updatable.businessHours,
        avatarUrl: updatable.avatarUrl,
        notifyDaysInAdvance: updatable.notifyDaysInAdvance,
        isConsent: existingProfile?.isConsent ?? true,
      },
    });

    return sendSuccess(res, {
      storeProfile: mapStoreProfile(nextProfile, storeUser.email),
    });
  } catch (error) {
    if (error?.name === "ZodError") {
      return sendError(res, 400, error.errors.map((e) => e.message).join(", "));
    }
    console.error("updateStoreProfile error", error);
    return sendError(res, 500, "ไม่สามารถบันทึกข้อมูลร้านได้");
  }
}

export async function changeStorePassword(req, res) {
  const storeId = parseStoreId(req, res);
  if (storeId == null) return;

  try {
    const payload = changePasswordSchema.parse(req.body ?? {});

    const storeUser = await prisma.user.findUnique({ where: { id: storeId } });
    if (!storeUser || storeUser.role !== "STORE") {
      return sendError(res, 404, "ไม่พบข้อมูลร้านค้า");
    }

    const valid = await bcrypt.compare(payload.old_password, storeUser.passwordHash);
    if (!valid) {
      return sendError(res, 400, "รหัสผ่านเดิมไม่ถูกต้อง");
    }

    const newHash = await bcrypt.hash(payload.new_password, 12);
    await prisma.user.update({
      where: { id: storeId },
      data: { passwordHash: newHash },
    });

    return sendSuccess(res, { message: "เปลี่ยนรหัสผ่านเรียบร้อย" });
  } catch (error) {
    if (error?.name === "ZodError") {
      return sendError(res, 400, error.errors.map((e) => e.message).join(", "));
    }
    console.error("changeStorePassword error", error);
    return sendError(res, 500, "ไม่สามารถเปลี่ยนรหัสผ่านได้");
  }
}

export async function createWarranty(req, res) {
  const storeId = parseStoreId(req, res);
  if (storeId == null) return;

  try {
    const payload = createWarrantySchema.parse(req.body ?? {});
    const storeProfile = await prisma.storeProfile.findUnique({ where: { userId: storeId } });
    const persistence = buildWarrantyPersistenceData(payload);

    const created = await prisma.warranty.create({
      data: { ...persistence, storeId },
    });

    const notifyDays = storeProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;
    return sendSuccess(
      res,
      {
        message: "สร้างใบรับประกันเรียบร้อย",
        warranty: mapWarrantyForResponse(created, { notifyDaysInAdvance: notifyDays }),
      },
      201
    );
  } catch (error) {
    if (error?.name === "ZodError") {
      return sendError(res, 400, error.errors.map((e) => e.message).join(", "));
    }
    console.error("createWarranty error", error);
    return sendError(res, 500, "ไม่สามารถสร้างใบรับประกันได้");
  }
}
