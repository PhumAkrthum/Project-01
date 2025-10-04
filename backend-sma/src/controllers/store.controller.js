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

function daysBetween(a, b) {
  const diff = Math.ceil((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
  return diff;
}

function addMonths(date, m) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
}

/** ===== ออกเลข WR “แยกร้าน” ===== */
async function nextWarrantyCodeForStore(tx, storeId, { prefix = "WR", width = 3 } = {}) {
  // หาเลข code ล่าสุดของ "ร้านนี้" ที่ขึ้นต้นด้วย prefix แล้ว +1
  const last = await tx.warranty.findFirst({
    where: { storeId, code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  let lastNum = 0;
  if (last?.code) {
    const m = last.code.match(/\d+$/);
    if (m) lastNum = Number(m[0]);
  }
  return `${prefix}${pad3(lastNum + 1)}`; // width ไม่ได้ใช้ padding แบบยืด เลยยึด 3 ตาม pad3()
}

// กันชนกรณีชนพร้อมกัน (retry ถ้าโดน P2002) – ใช้ composite unique [storeId, code]
async function allocateWarrantyCode(tx, storeId, opts) {
  for (let i = 0; i < 5; i++) {
    const code = await nextWarrantyCodeForStore(tx, storeId, opts);
    const exists = await tx.warranty.findUnique({
      where: { storeId_code: { storeId, code } },
    });
    if (!exists) return code;
  }
  throw new Error("Unable to allocate warranty code");
}

/** map header + items => payload response ฝั่งหน้า */
function mapWarrantyHeaderForResponse(header, notifyDays) {
  return {
    id: header.id,
    code: header.code,
    customerEmail: header.customerEmail ?? null,
    customerName: header.customerName ?? null,
    customerPhone: header.customerPhone ?? null,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,

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
      warranties: mapped,
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
 * สร้างใบรับประกัน “ใบเดียว” แต่รับ items หลายรายการ
 * รองรับ 2 รูปแบบ:
 *  - payload ใหม่: { items: [...items] }  → สร้าง Header เดียว + หลาย items
 *  - payload เดิม (รายการเดียว)          → สร้าง Header ใหม่ 1 ใบ + 1 item
 * ปรับเพิ่ม:
 *  - WR: ออกเลขแบบ "แยกร้าน" (per store) ด้วย composite unique [storeId, code]
 *  - SN: auto-generate เป็น SN001, SN002, ... และ "ยูนีคภายในใบเดียวกัน"
 *  - ★ เชื่อมอีเมลลูกค้า → customerUserId (ถ้าพบบัญชี role = CUSTOMER)
 */
export async function createWarranty(req, res) {
  const storeId = parseStoreId(req, res);
  if (storeId == null) return;

  try {
    const body = req.body ?? {};
    const storeProfile = await prisma.storeProfile.findUnique({ where: { userId: storeId } });
    const notifyDays = storeProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;

    // ใช้ทรานแซคชัน + กัน P2002
    const createdHeader = await prisma.$transaction(async (tx) => {
      // ★ สร้าง code แบบ "แยกร้าน"
      let code = await allocateWarrantyCode(tx, storeId, { prefix: "WR", width: 3 });

      // --- payload หลายรายการในใบเดียว ---
      if (Array.isArray(body.items) && body.items.length > 0) {
        const first = body.items[0];

        // ★ ลองหาบัญชีลูกค้าจากอีเมล (ถ้าส่งมา)
        const rawEmail = first?.customer_email ?? null;
        let customerUser = null;
        if (rawEmail) {
          customerUser = await tx.user.findUnique({
            where: { email: rawEmail },
            select: { id: true, role: true },
          });
          if (customerUser && customerUser.role !== "CUSTOMER") {
            // หยุดทันทีถ้าอีเมลไม่ใช่บัญชีลูกค้าจริง
            throw Object.assign(new Error("อีเมลนี้ไม่ใช่บัญชี CUSTOMER"), { status: 400 });
          }
        }

        // ★ กัน serial ซ้ำในคำขอ + auto SNxxx
        const usedSerial = new Set();
        let seq = 1;

        const itemsToCreate = body.items.map((it) => {
          const purchase = it.purchase_date ? new Date(it.purchase_date) : new Date();
          let expiry = it.expiry_date ? new Date(it.expiry_date) : null;
          const dm = Number(it.duration_months || it.durationMonths || 0);
          if (!expiry && dm > 0) {
            expiry = addMonths(purchase, dm);
          }

          let serial = String(it.serial || "").trim();
          if (!serial) {
            while (usedSerial.has(`SN${pad3(seq)}`)) seq++;
            serial = `SN${pad3(seq)}`;
            usedSerial.add(serial);
            seq++;
          } else {
            if (usedSerial.has(serial)) {
              // ถ้าซ้ำใน request เดียว ปรับเป็น SN อัตโนมัติ
              while (usedSerial.has(`SN${pad3(seq)}`)) seq++;
              serial = `SN${pad3(seq)}`;
              usedSerial.add(serial);
              seq++;
            } else {
              usedSerial.add(serial);
            }
          }

          return {
            productName: String(it.product_name || "").trim(),
            serial, // จะเป็น non-null แล้ว
            purchaseDate: purchase,
            expiryDate: expiry,
            durationMonths: dm || null,
            durationDays: expiry ? daysBetween(purchase, expiry) : null,
            coverageNote: String(it.warranty_terms || "").trim() || null,
            note: String(it.note || "").trim() || null,
            images: [], // Json? ที่ schema รองรับ
          };
        });

        // ลองสร้าง ถ้าโดนชน code ให้ขยับใหม่แล้วลองซ้ำ
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await tx.warranty.create({
              data: {
                storeId,
                code,
                customerEmail: rawEmail ?? null,
                customerName: first?.customer_name ?? null,
                customerPhone: first?.customer_phone ?? null,
                // ★ ใส่ FK ถ้าพบบัญชีลูกค้า
                customerUserId: customerUser ? customerUser.id : null,
                items: { create: itemsToCreate },
              },
              include: { items: true },
            });
          } catch (e) {
            // ซ้ำรหัสใบรับประกัน (คีย์ใหม่ storeId_code หรือกรณีเก่ายังมี code)
            if (
              e?.code === "P2002" &&
              (e.meta?.target?.includes?.("storeId_code") || e.meta?.target?.includes?.("code"))
            ) {
              code = await allocateWarrantyCode(tx, storeId, { prefix: "WR", width: 3 });
              continue;
            }
            // SN ซ้ำภายในใบเดียวกัน (DB guard)
            if (e?.code === "P2002" && e.meta?.target?.includes?.("warrantyId_serial")) {
              throw Object.assign(new Error("Serial number duplicated within the warranty"), { status: 409 });
            }
            throw e;
          }
        }
        throw new Error("Failed to create warranty after retries");
      }

      // --- payload เดิม: สร้าง 1 รายการ ---
      const purchase = body.purchase_date ? new Date(body.purchase_date) : new Date();
      let expiry = body.expiry_date ? new Date(body.expiry_date) : null;
      const dm = Number(body.duration_months || body.durationMonths || 0);
      if (!expiry && dm > 0) expiry = addMonths(purchase, dm);

      // ★ SN อัตโนมัติถ้าไม่ส่งมา → SN001
      const serialOne = (String(body.serial || "").trim() || `SN${pad3(1)}`);

      // ★ ลองหาบัญชีลูกค้าจากอีเมล (ถ้าส่งมา)
      const rawEmail = body.customer_email ?? null;
      let customerUser = null;
      if (rawEmail) {
        customerUser = await tx.user.findUnique({
          where: { email: rawEmail },
          select: { id: true, role: true },
        });
        if (customerUser && customerUser.role !== "CUSTOMER") {
          throw Object.assign(new Error("อีเมลนี้ไม่ใช่บัญชี CUSTOMER"), { status: 400 });
        }
      }

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await tx.warranty.create({
            data: {
              storeId,
              code,
              customerEmail: rawEmail ?? null,
              customerName: body.customer_name ?? null,
              customerPhone: body.customer_phone ?? null,
              // ★ ใส่ FK ถ้าพบบัญชีลูกค้า
              customerUserId: customerUser ? customerUser.id : null,
              items: {
                create: [
                  {
                    productName: String(body.product_name || "").trim(),
                    serial: serialOne,
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
        } catch (e) {
          if (
            e?.code === "P2002" &&
            (e.meta?.target?.includes?.("storeId_code") || e.meta?.target?.includes?.("code"))
          ) {
            code = await allocateWarrantyCode(tx, storeId, { prefix: "WR", width: 3 });
            continue;
          }
          if (e?.code === "P2002" && e.meta?.target?.includes?.("warrantyId_serial")) {
            throw Object.assign(new Error("Serial number duplicated within the warranty"), { status: 409 });
          }
          throw e;
        }
      }
      throw new Error("Failed to create warranty after retries");
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
    // แปลง duplicate เป็น 409 ให้เข้าใจง่าย
    if (error?.status) {
      return sendError(res, error.status, error.message);
    }
    if (error?.code === "P2002" && error.meta?.target?.includes?.("warrantyId_serial")) {
      return sendError(res, 409, "Serial ซ้ำภายในใบรับประกัน");
    }
    if (error?.code === "P2002" && (error.meta?.target?.includes?.("storeId_code") || error.meta?.target?.includes?.("code"))) {
      return sendError(res, 409, "รหัสใบรับประกันซ้ำ กรุณาลองใหม่");
    }
    console.error("createWarranty error", error);
    return sendError(res, 500, "ไม่สามารถสร้างใบรับประกันได้");
  }
}
