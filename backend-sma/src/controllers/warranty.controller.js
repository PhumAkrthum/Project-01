import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "../db/prisma.js";
import { updateWarrantySchema } from "../utils/validators.js";
import {
  buildWarrantyPersistenceData,
  mapWarrantyForResponse,
} from "../utils/warranty.js";
import { sendError, sendSuccess } from "../utils/http.js";

const DEFAULT_NOTIFY_DAYS = 14;

function currentStoreId(req) {
  const id = Number(req.user?.sub);
  return Number.isInteger(id) ? id : null;
}

export async function updateWarranty(req, res) {
  const storeId = currentStoreId(req);
  if (storeId == null) {
    return sendError(res, 401, "ต้องเข้าสู่ระบบร้านค้าก่อน");
  }

  try {
    const warrantyId = String(req.params.warrantyId);
    const warranty = await prisma.warranty.findUnique({ where: { id: warrantyId } });
    if (!warranty || warranty.storeId !== storeId) {
      return sendError(res, 404, "ไม่พบใบรับประกัน");
    }

    const payload = updateWarrantySchema.parse(req.body ?? {});

    const persistence = buildWarrantyPersistenceData({
      customer_email: payload.customer_email ?? warranty.customerEmail,
      customer_name: payload.customer_name ?? warranty.customerName,
      customer_phone: payload.customer_phone ?? warranty.customerPhone,
      product_name: payload.product_name ?? warranty.productName,
      serial: payload.serial ?? warranty.serial,
      purchase_date: payload.purchase_date ?? warranty.purchaseDate,
      expiry_date: payload.expiry_date ?? warranty.expiryDate,
      duration_months:
        payload.duration_months != null ? payload.duration_months : warranty.durationMonths,
      warranty_terms: payload.warranty_terms ?? warranty.coverageNote,
      note: payload.note ?? warranty.note,
    });

    const updated = await prisma.warranty.update({
      where: { id: warrantyId },
      data: persistence,
    });

    const storeProfile = await prisma.storeProfile.findUnique({ where: { userId: storeId } });
    const notifyDays = storeProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;

    return sendSuccess(res, {
      message: "อัปเดตใบรับประกันเรียบร้อย",
      warranty: mapWarrantyForResponse(updated, { notifyDaysInAdvance: notifyDays }),
    });
  } catch (error) {
    if (error?.name === "ZodError") {
      return sendError(res, 400, error.errors.map((e) => e.message).join(", "));
    }
    console.error("updateWarranty error", error);
    return sendError(res, 500, "ไม่สามารถอัปเดตใบรับประกันได้");
  }
}

export async function downloadWarrantyPdf(req, res) {
  const storeId = currentStoreId(req);
  if (storeId == null) {
    return sendError(res, 401, "ต้องเข้าสู่ระบบร้านค้าก่อน");
  }

  try {
    const warrantyId = String(req.params.warrantyId);
    const warranty = await prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: {
        store: {
          include: {
            storeProfile: true,
          },
        },
      },
    });

    if (!warranty || warranty.storeId !== storeId) {
      return sendError(res, 404, "ไม่พบใบรับประกัน");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="warranty-${warranty.id}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    const profile = warranty.store.storeProfile;
    const formatted = mapWarrantyForResponse(warranty, {
      notifyDaysInAdvance: profile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS,
    });

    doc
      .fontSize(20)
      .text("SMEC Warranty Certificate", { align: "center" })
      .moveDown();

    doc
      .fontSize(12)
      .text(`รหัสใบรับประกัน: ${formatted.id}`)
      .text(`ร้านค้า: ${profile?.storeName ?? ""}`)
      .text(`อีเมลร้านค้า: ${profile?.email ?? warranty.store.email}`)
      .text(`ลูกค้า: ${formatted.customerName ?? "-"}`)
      .text(`อีเมลลูกค้า: ${formatted.customerEmail ?? "-"}`)
      .moveDown();

    doc
      .fontSize(14)
      .text("รายละเอียดสินค้า", { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .text(`สินค้า: ${formatted.productName}`)
      .text(`Serial No.: ${formatted.serial ?? "-"}`)
      .text(`วันที่ซื้อ: ${formatted.purchaseDate ?? "-"}`)
      .text(`วันหมดอายุ: ${formatted.expiryDate ?? "-"}`)
      .text(`สถานะ: ${formatted.statusTag}`)
      .text(`คงเหลือ: ${formatted.daysLeft ?? 0} วัน`)
      .moveDown();

    if (formatted.coverageNote) {
      doc.fontSize(14).text("เงื่อนไขการรับประกัน", { underline: true }).moveDown(0.5);
      doc.fontSize(12).text(formatted.coverageNote, { align: "left" }).moveDown();
    }

    if (formatted.note) {
      doc.fontSize(14).text("หมายเหตุ", { underline: true }).moveDown(0.5);
      doc.fontSize(12).text(formatted.note, { align: "left" }).moveDown();
    }

    doc.fontSize(10).fillColor("#666").text("ออกเมื่อ: " + new Date().toLocaleString(), {
      align: "right",
    });

    doc.end();
  } catch (error) {
    console.error("downloadWarrantyPdf error", error);
    return sendError(res, 500, "ไม่สามารถสร้างไฟล์ PDF ได้");
  }
}

export async function uploadWarrantyImage(req, res) {
  const storeId = currentStoreId(req);
  if (storeId == null) {
    return sendError(res, 401, "ต้องเข้าสู่ระบบร้านค้าก่อน");
  }

  try {
    const warrantyId = String(req.params.warrantyId);
    const warranty = await prisma.warranty.findUnique({ where: { id: warrantyId } });
    
    if (!warranty || warranty.storeId !== storeId) {
      return sendError(res, 404, "ไม่พบใบรับประกัน");
    }

    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, "ไม่พบไฟล์รูปภาพ");
    }

    // สร้าง URLs สำหรับรูปภาพที่อัปโหลด
    const imageUrls = req.files.map(file => ({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      url: `/uploads/warranty-images/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));

    // รวมรูปภาพใหม่กับรูปภาพเดิม
    const existingImages = warranty.images ? JSON.parse(warranty.images) : [];
    const updatedImages = [...existingImages, ...imageUrls];

    // อัปเดตฐานข้อมูล
    const updated = await prisma.warranty.update({
      where: { id: warrantyId },
      data: { images: JSON.stringify(updatedImages) }
    });

    const storeProfile = await prisma.storeProfile.findUnique({ where: { userId: storeId } });
    const notifyDays = storeProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;

    return sendSuccess(res, {
      message: "อัปโหลดรูปภาพเรียบร้อย",
      warranty: mapWarrantyForResponse(updated, { notifyDaysInAdvance: notifyDays }),
      uploadedImages: imageUrls
    });
  } catch (error) {
    console.error("uploadWarrantyImage error", error);
    return sendError(res, 500, "ไม่สามารถอัปโหลดรูปภาพได้");
  }
}

export async function deleteWarrantyImage(req, res) {
  const storeId = currentStoreId(req);
  if (storeId == null) {
    return sendError(res, 401, "ต้องเข้าสู่ระบบร้านค้าก่อน");
  }

  try {
    const warrantyId = String(req.params.warrantyId);
    const imageId = String(req.params.imageId);
    
    const warranty = await prisma.warranty.findUnique({ where: { id: warrantyId } });
    
    if (!warranty || warranty.storeId !== storeId) {
      return sendError(res, 404, "ไม่พบใบรับประกัน");
    }

    const existingImages = warranty.images ? JSON.parse(warranty.images) : [];
    const imageToDelete = existingImages.find(img => img.id === imageId);
    
    if (!imageToDelete) {
      return sendError(res, 404, "ไม่พบรูปภาพที่ต้องการลบ");
    }

    // ลบไฟล์จากระบบ
    const filePath = path.join(process.cwd(), 'uploads', 'warranty-images', imageToDelete.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // อัปเดตฐานข้อมูล
    const updatedImages = existingImages.filter(img => img.id !== imageId);
    const updated = await prisma.warranty.update({
      where: { id: warrantyId },
      data: { images: JSON.stringify(updatedImages) }
    });

    const storeProfile = await prisma.storeProfile.findUnique({ where: { userId: storeId } });
    const notifyDays = storeProfile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;

    return sendSuccess(res, {
      message: "ลบรูปภาพเรียบร้อย",
      warranty: mapWarrantyForResponse(updated, { notifyDaysInAdvance: notifyDays })
    });
  } catch (error) {
    console.error("deleteWarrantyImage error", error);
    return sendError(res, 500, "ไม่สามารถลบรูปภาพได้");
  }
}
