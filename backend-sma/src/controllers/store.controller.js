// backend-sma/src/controllers/store.controller.js
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma.js";
import { sendError, sendSuccess } from "../utils/http.js";

// หมายเหตุ: เพื่อให้แก้ได้เร็ว ผมไม่เรียกใช้ zod schema เดิมในจุด create หลายรายการ
// (รองรับทั้ง payload เดิมแบบรายการเดียว และ payload ใหม่แบบหลายรายการ)

const DEFAULT_NOTIFY_DAYS = 14;

function parseStoreId(req, res) {
  const storeId = Number(req.params.storeId);
  if (!Number.isInteger(storeId)) {
    sendError(res, 400, "Store id must be a number");
    return null;
  }
  if (Number(req.user?.sub) !== storeId) {
    sendError(res, 403, "คุณไม่มีสิทธิ์เข้าถึงร้านค้านี้");
    return null;
  }
  return storeId;
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

/** ===== utilities ===== */
function pad3(n) {
  const s = String(n);
  return s.length >= 3 ? s : "0".repeat(3 - s.length) + s;
}

async function nextWarrantyCodeForStore(storeId) {
  // หา code ล่าสุดของร้าน แล้ว +1 => WR001, WR002, ...
  const last = await prisma.warranty.findFirst({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const lastNum =
    last?.code?.match(/^WR(\d+)$/)?.[1] ? Number(last.code.match(/^WR(\d+)$/)[1]) : 0;
  return `WR${pad3(lastNum + 1 || 1)}`;
}

function daysBetween(a, b) {
  const diff = Math.ceil((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
  return diff;
}

function addMonths(date, m) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
}

/** map header + items => payload response ฝั่งหน้า */
function mapWarrantyHeaderForResponse(header, notifyDays) {
  return {
    id: header.id,
    code: header.code,
    customerEmail: header.customerEmail ?? null, // ✅ ใช้จาก header เท่านั้น
    customerName: header.customerName ?? null,
    customerPhone: header.customerPhone ?? null,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,

    // ทำรายการย่อย
    items: (header.items || []).map((w) => {
      const today = new Date();
      const exp = w.expiryDate ? new Date(w.expiryDate) : null;
      let statusCode = "active";
      let statusTag = "ใช้งานได้";
      let statusColor = "text-emerald-600 bg-emerald-50";

      if (exp) {
        const remain = daysBetween(today, exp);
        if (remain < 0) {
          statusCode = "expired";
          statusTag = "หมดอายุ";
          statusColor = "text-rose-600 bg-rose-50";
        } else if (remain <= (notifyDays ?? DEFAULT_NOTIFY_DAYS)) {
          statusCode = "nearing_expiration";
          statusTag = "ใกล้หมดอายุ";
          statusColor = "text-amber-700 bg-amber-50";
        }
      }

      return {
        id: w.id,
        productName: w.productName,
        serial: w.serial,
        purchaseDate: w.purchaseDate ? new Date(w.purchaseDate).toISOString().slice(0, 10) : null,
        expiryDate: w.expiryDate ? new Date(w.expiryDate).toISOString().slice(0, 10) : null,
        durationMonths: w.durationMonths ?? null,
        durationDays: w.durationDays ?? null,
        coverageNote: w.coverageNote ?? null,
        note: w.note ?? null,
        images: Array.isArray(w.images) ? w.images : (w.images ? w.images : []),

        statusCode,
        statusTag,
        statusColor,

        daysLeft: exp ? daysBetween(today, exp) : null,
      };
    }),
  };
}

/** ===== controllers ===== */

export async function getStoreDashboard(req, res) {
  const storeId = parseStoreId(req, res);
  if (storeId == null) return;

  try {
    const store = await prisma.user.findUnique({
      where: { id: storeId },
      include: {
        storeProfile: true,
      },
    });

    if (!store || store.role !== "STORE") {
      return sendError(res, 404, "ไม่พบบัญชีร้านค้า");
    }

    const notifyDays = store.storeProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;

    const headers = await prisma.warranty.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const mapped = headers.map((h) => mapWarrantyHeaderForResponse(h, notifyDays));

    // สรุปสถานะจากทุก items
    const allItems = headers.flatMap((h) => h.items);
    const now = new Date();
    let active = 0,
      nearing = 0,
      expired = 0;
    for (const it of allItems) {
      const exp = it.expiryDate ? new Date(it.expiryDate) : null;
      if (!exp) {
        active++;
        continue;
      }
      const remain = daysBetween(now, exp);
      if (remain < 0) expired++;
      else if (remain <= notifyDays) nearing++;
      else active++;
    }

    const filters = {
      statuses: [
        { code: "active", label: "ใช้งานได้", count: active },
        { code: "nearing_expiration", label: "ใกล้หมดอายุ", count: nearing },
        { code: "expired", label: "หมดอายุ", count: expired },
      ],
    };

    return sendSuccess(res, {
      storeProfile: mapStoreProfile(store.storeProfile, store.email),
      warranties: mapped, // ตอนนี้เป็น “ใบ” และแต่ละใบมี items ภายใน
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
    const body = req.body ?? {};

    const [storeUser, existingProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: storeId } }),
      prisma.storeProfile.findUnique({ where: { userId: storeId } }),
    ]);

    if (!storeUser || storeUser.role !== "STORE") {
      return sendError(res, 404, "ไม่พบข้อมูลร้านค้า");
    }

    const updatable = {
      storeName: body.storeName,
      contactName: body.contactName ?? existingProfile?.contactName ?? existingProfile?.ownerName ?? null,
      ownerName:
        body.ownerName ??
        existingProfile?.ownerName ??
        body.contactName ??
        existingProfile?.contactName ??
        body.storeName,
      storeType: body.storeType ?? existingProfile?.storeType ?? "ทั่วไป",
      phone: body.phone,
      email: body.email || existingProfile?.email || storeUser.email,
      address: body.address,
      businessHours: body.businessHours ?? existingProfile?.businessHours ?? "",
      avatarUrl: body.avatarUrl ?? existingProfile?.avatarUrl,
      notifyDaysInAdvance:
        body.notifyDaysInAdvance ?? existingProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS,
    };

    if (!updatable.businessHours) updatable.businessHours = "ระบุเวลาทำการ";
    if (!updatable.ownerName) updatable.ownerName = body.storeName;

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
    console.error("updateStoreProfile error", error);
    return sendError(res, 500, "ไม่สามารถบันทึกข้อมูลร้านได้");
  }
}

export async function changeStorePassword(req, res) {
  const storeId = parseStoreId(req, res);
  if (storeId == null) return;

  try {
    const body = req.body ?? {};

    const storeUser = await prisma.user.findUnique({ where: { id: storeId } });
    if (!storeUser || storeUser.role !== "STORE") {
      return sendError(res, 404, "ไม่พบข้อมูลร้านค้า");
    }

    const valid = await bcrypt.compare(body.old_password, storeUser.passwordHash);
    if (!valid) {
      return sendError(res, 400, "รหัสผ่านเดิมไม่ถูกต้อง");
    }

    const newHash = await bcrypt.hash(body.new_password, 12);
    await prisma.user.update({
      where: { id: storeId },
      data: { passwordHash: newHash },
    });

    return sendSuccess(res, { message: "เปลี่ยนรหัสผ่านเรียบร้อย" });
  } catch (error) {
    console.error("changeStorePassword error", error);
    return sendError(res, 500, "ไม่สามารถเปลี่ยนรหัสผ่านได้");
  }
}

/**
 * NEW: สร้างใบรับประกัน “ใบเดียว” แต่รับ items หลายรายการ
 * รองรับ 2 รูปแบบ
 *  - payload ใหม่: { items: [...items] }  → จะสร้าง Header เดียว + หลาย items
 *  - payload เดิม (รายการเดียว)          → จะสร้าง Header ใหม่ 1 ใบ + 1 item
 */
export async function createWarranty(req, res) {
  const storeId = parseStoreId(req, res);
  if (storeId == null) return;

  try {
    const body = req.body ?? {};
    const storeProfile = await prisma.storeProfile.findUnique({ where: { userId: storeId } });
    const notifyDays = storeProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;

    // สร้าง code ใบใหม่
    const code = await nextWarrantyCodeForStore(storeId);

    // ถ้า payload ใหม่มี items เป็น array ⇒ หลายรายการในใบเดียว
    if (Array.isArray(body.items) && body.items.length > 0) {
      const first = body.items[0];

      const createdHeader = await prisma.warranty.create({
        data: {
          storeId,
          code,
          customerEmail: first?.customer_email ?? null,
          customerName: null,
          customerPhone: null,
          items: {
            create: body.items.map((it) => {
              const purchase = it.purchase_date ? new Date(it.purchase_date) : new Date();
              let expiry = it.expiry_date ? new Date(it.expiry_date) : null;
              const dm = Number(it.duration_months || it.durationMonths || 0);
              if (!expiry && dm > 0) {
                expiry = addMonths(purchase, dm);
              }
              return {
                productName: String(it.product_name || "").trim(),
                serial: String(it.serial || "").trim() || null,
                purchaseDate: purchase,
                expiryDate: expiry,
                durationMonths: dm || null,
                durationDays: expiry ? daysBetween(purchase, expiry) : null,
                coverageNote: String(it.warranty_terms || "").trim() || null,
                note: String(it.note || "").trim() || null,
                images: [], // ไว้อัปโหลดเพิ่มภายหลังต่อ item
              };
            }),
          },
        },
        include: { items: true },
      });

      return sendSuccess(
        res,
        {
          message: "สร้างใบรับประกันเรียบร้อย",
          warranty: mapWarrantyHeaderForResponse(createdHeader, notifyDays),
        },
        201
      );
    }

    // ✅ fallback: payload เก่า (สร้าง 1 รายการ = 1 ใบ + 1 item)
    const purchase = body.purchase_date ? new Date(body.purchase_date) : new Date();
    let expiry = body.expiry_date ? new Date(body.expiry_date) : null;
    const dm = Number(body.duration_months || body.durationMonths || 0);
    if (!expiry && dm > 0) expiry = addMonths(purchase, dm);

    const createdHeader = await prisma.warranty.create({
      data: {
        storeId,
        code,
        customerEmail: body.customer_email ?? null,
        items: {
          create: [
            {
              productName: String(body.product_name || "").trim(),
              serial: String(body.serial || "").trim() || null,
              purchaseDate: purchase,
              expiryDate: expiry,
              durationMonths: dm || null,
              durationDays: expiry ? daysBetween(purchase, expiry) : null,
              coverageNote: String(body.warranty_terms || "").trim() || null,
              note: String(body.note || "").trim() || null,
              images: [],
            },
          ],
        },
      },
      include: { items: true },
    });

    return sendSuccess(
      res,
      {
        message: "สร้างใบรับประกันเรียบร้อย",
        warranty: mapWarrantyHeaderForResponse(createdHeader, notifyDays),
      },
      201
    );
  } catch (error) {
    console.error("createWarranty error", error);
    return sendError(res, 500, "ไม่สามารถสร้างใบรับประกันได้");
  }
}
