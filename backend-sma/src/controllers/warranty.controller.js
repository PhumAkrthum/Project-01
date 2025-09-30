// src/controllers/warranty.controller.js
import PDFDocument from "pdfkit";
import { prisma } from "../db/prisma.js";
import { sendError, sendSuccess } from "../utils/http.js";

const DEFAULT_NOTIFY_DAYS = 14;

function currentStoreId(req) {
  const id = Number(req.user?.sub);
  return Number.isInteger(id) ? id : null;
}

function daysBetween(a, b) {
  return Math.ceil((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
}

function statusForItem(item, notifyDays) {
  const today = new Date();
  const exp = item.expiryDate ? new Date(item.expiryDate) : null;

  let statusCode = "active";
  let statusTag = "ใช้งานได้";
  if (exp) {
    const remain = daysBetween(today, exp);
    if (remain < 0) {
      statusCode = "expired";
      statusTag = "หมดอายุ";
    } else if (remain <= (notifyDays ?? DEFAULT_NOTIFY_DAYS)) {
      statusCode = "nearing_expiration";
      statusTag = "ใกล้หมดอายุ";
    }
  }
  return { statusCode, statusTag, daysLeft: exp ? daysBetween(today, exp) : null };
}

/**
 * สร้าง PDF ระดับ "ใบ" (Header) โดยพิมพ์ทุกรายการสินค้าในใบ
 * GET /warranties/:warrantyId/pdf
 */
export async function downloadWarrantyPdf(req, res) {
  const storeId = currentStoreId(req);
  if (storeId == null) {
    return sendError(res, 401, "ต้องเข้าสู่ระบบร้านค้าก่อน");
  }

  try {
    const warrantyId = String(req.params.warrantyId);

    const header = await prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        store: { include: { storeProfile: true } },
      },
    });

    if (!header || header.storeId !== storeId) {
      return sendError(res, 404, "ไม่พบใบรับประกัน");
    }

    const profile = header.store.storeProfile;
    const notifyDays = profile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;

    // headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="warranty-${header.code || header.id}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Title
    doc.fontSize(20).text("SMEC Warranty Certificate", { align: "center" }).moveDown();

    // Header info
    doc.fontSize(12)
      .text(`โค้ดใบรับประกัน: ${header.code || header.id}`)
      .text(`ร้านค้า: ${profile?.storeName ?? "-"}`)
      .text(`อีเมลร้านค้า: ${profile?.email ?? header.store.email}`)
      .text(`ลูกค้า: ${header.customerName ?? "-"}`)
      .text(`อีเมลลูกค้า: ${header.customerEmail ?? "-"}`)
      .text(`เบอร์โทรลูกค้า: ${header.customerPhone ?? "-"}`)
      .moveDown(1);

    // Items section
    doc.fontSize(14).text("รายละเอียดสินค้าในใบนี้", { underline: true }).moveDown(0.5);

    if (!header.items || header.items.length === 0) {
      doc.fontSize(12).text("ไม่มีรายการสินค้าในใบนี้").moveDown();
    } else {
      header.items.forEach((it, idx) => {
        const { statusTag, daysLeft } = statusForItem(it, notifyDays);
        doc
          .fontSize(12)
          .text(`รายการที่ ${idx + 1}`, { continued: false })
          .text(`- ชื่อสินค้า: ${it.productName}`)
          .text(`- Serial No.: ${it.serial || "-"}`)
          .text(`- วันที่ซื้อ: ${it.purchaseDate ? new Date(it.purchaseDate).toISOString().slice(0,10) : "-"}`)
          .text(`- วันหมดอายุ: ${it.expiryDate ? new Date(it.expiryDate).toISOString().slice(0,10) : "-"}`)
          .text(`- สถานะ: ${statusTag}`)
          .text(`- คงเหลือ: ${daysLeft ?? 0} วัน`)
          .text(`- เงื่อนไข: ${it.coverageNote || "-"}`)
          .text(`- หมายเหตุ: ${it.note || "-"}`)
          .moveDown(0.8);
      });
    }

    doc.fontSize(10).fillColor("#666")
      .text("ออกเมื่อ: " + new Date().toLocaleString(), { align: "right" });

    doc.end();
  } catch (error) {
    console.error("downloadWarrantyPdf error", error);
    return sendError(res, 500, "ไม่สามารถสร้างไฟล์ PDF ได้");
  }
}

/**
 * (ตัวอย่าง) ถ้าจะคง endpoint ดูรายละเอียดใบแบบ JSON
 */
export async function getWarrantyHeader(req, res) {
  const storeId = currentStoreId(req);
  if (storeId == null) {
    return sendError(res, 401, "ต้องเข้าสู่ระบบร้านค้าก่อน");
  }

  try {
    const warrantyId = String(req.params.warrantyId);
    const header = await prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: { items: true },
    });
    if (!header || header.storeId !== storeId) {
      return sendError(res, 404, "ไม่พบใบรับประกัน");
    }
    return sendSuccess(res, { warranty: header });
  } catch (e) {
    console.error("getWarrantyHeader error", e);
    return sendError(res, 500, "โหลดข้อมูลใบรับประกันไม่สำเร็จ");
  }
}
