// backend-sma/src/controllers/warrantyItem.controller.js
import { prisma } from '../db/prisma.js';
import fs from 'fs';
import path from 'path';
import { uploadSubPath } from '../middleware/uploadImages.js';

const publicBase =
  (process.env.APP_URL && process.env.APP_URL.replace(/\/+$/, '')) ||
  `http://localhost:${process.env.PORT || 4000}`;

/* ---------- helpers ---------- */
function toDateOnly(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addMonths(date, m) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
}
function daysBetween(a, b) {
  return Math.ceil((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
}

/* ---------- เพิ่มรูปให้ WarrantyItem (many files) ---------- */
export async function addItemImages(req, res) {
  try {
    const { itemId } = req.params; // ❗️ id เป็น string

    const item = await prisma.warrantyItem.findUnique({
      where: { id: itemId },
      include: { warranty: true },
    });
    if (!item) return res.status(404).json({ message: 'ไม่พบรายการสินค้า' });

    // ตรวจสิทธิ์ร้าน
    const userId = Number(req.user?.sub);
    if (!item.warranty || item.warranty.storeId !== userId) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ในรายการนี้' });
    }

    const existed = Array.isArray(item.images) ? item.images : [];
    const files = (req.files || []).map(f => ({
      id: path.parse(f.filename).name,
      url: `${uploadSubPath}/${f.filename}`,
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
    }));

    const updated = await prisma.warrantyItem.update({
      where: { id: itemId }, // ❗️ อย่าแปลงเป็น Number
      data: { images: [...existed, ...files] },
    });

    return res.json({
      data: {
        item: {
          ...updated,
          images: (updated.images || []).map(im => ({
            ...im,
            absoluteUrl: `${publicBase}${im.url}`,
          })),
        },
      },
    });
  } catch (err) {
    console.error('addItemImages error', err);
    return res.status(500).json({ message: 'อัปโหลดรูปภาพไม่สำเร็จ' });
  }
}

/* ---------- ลบรูปจาก WarrantyItem ---------- */
export async function deleteItemImage(req, res) {
  try {
    const { itemId, imageId } = req.params; // ❗️ id เป็น string

    const item = await prisma.warrantyItem.findUnique({
      where: { id: itemId },
      include: { warranty: true },
    });
    if (!item) return res.status(404).json({ message: 'ไม่พบรายการสินค้า' });

    const userId = Number(req.user?.sub);
    if (!item.warranty || item.warranty.storeId !== userId) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ในรายการนี้' });
    }

    const current = Array.isArray(item.images) ? item.images : [];
    const target = current.find(im => im.id === imageId);
    if (!target) return res.status(404).json({ message: 'ไม่พบรูปภาพที่ต้องการลบ' });

    // ลบไฟล์จริง (ถ้ามี)
    try {
      const filePath = path.resolve(process.cwd(), `.${target.url}`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { /* ignore */ }

    const updated = await prisma.warrantyItem.update({
      where: { id: itemId },
      data: { images: current.filter(im => im.id !== imageId) },
    });

    return res.json({ data: { item: updated } });
  } catch (err) {
    console.error('deleteItemImage error', err);
    return res.status(500).json({ message: 'ลบรูปภาพไม่สำเร็จ' });
  }
}

/* ---------- แก้ไขข้อมูลหลักของรายการ (แนบรูปเพิ่มได้) ---------- */
export async function updateItem(req, res) {
  try {
    const { itemId } = req.params; // ❗️ id เป็น string

    // หา item + ตรวจสิทธิ์
    const item = await prisma.warrantyItem.findUnique({
      where: { id: itemId },
      include: { warranty: true },
    });
    if (!item) return res.status(404).json({ message: 'ไม่พบรายการสินค้า' });

    const userId = Number(req.user?.sub);
    if (!item.warranty || item.warranty.storeId !== userId) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ในรายการนี้' });
    }

    // map ชื่อจากฟอร์ม → คอลัมน์จริง (รองรับทั้งชื่อใหม่/เก่า)
    const b = req.body ?? {};

    const productName =
      b.productName !== undefined ? String(b.productName).trim() : item.productName;

    // ⭐ รองรับฟิลด์ "รุ่น" (model)
    //   - ฟอร์มใหม่จะส่ง b.model
    //   - เผื่ออนาคต/เดิมบางส่วนอาจส่ง productModel
    const model =
      b.model !== undefined
        ? (String(b.model).trim() || null)
        : (b.productModel !== undefined
            ? (String(b.productModel).trim() || null)
            : (item.model ?? null));

    const serial =
      b.serial !== undefined
        ? (String(b.serial).trim() || null)
        : (b.serialNo !== undefined
            ? (String(b.serialNo).trim() || null)
            : item.serial);

    const purchaseDate =
      toDateOnly(b.purchaseDate) ??
      toDateOnly(b.startDate) ??
      (item.purchaseDate ? new Date(item.purchaseDate) : null);

    let expiryDate =
      toDateOnly(b.expiryDate) ??
      toDateOnly(b.expireDate) ??
      (item.expiryDate ? new Date(item.expiryDate) : null);

    let durationMonths =
      b.durationMonths !== undefined
        ? Number(b.durationMonths)
        : (b.duration_months !== undefined
            ? Number(b.duration_months)
            : item.durationMonths);
    if (Number.isNaN(durationMonths)) durationMonths = item.durationMonths ?? null;

    // ถ้าไม่ได้ส่ง expiry แต่มี purchase + durationMonths → คำนวณให้
    if (!expiryDate && purchaseDate && Number(durationMonths) > 0) {
      expiryDate = addMonths(purchaseDate, Number(durationMonths));
    }

    const durationDays =
      purchaseDate && expiryDate ? daysBetween(purchaseDate, expiryDate) : item.durationDays ?? null;

    const coverageNote =
      b.coverageNote !== undefined
        ? String(b.coverageNote).trim()
        : (b.terms !== undefined ? String(b.terms).trim() : item.coverageNote);

    const note = b.note !== undefined ? String(b.note).trim() : item.note;

    // รูปภาพแนบเพิ่ม (ต่อท้าย images เดิม หากมีไฟล์)
    const existedImages = Array.isArray(item.images) ? item.images : [];
    const newImages = (req.files || []).map(f => ({
      id: path.parse(f.filename).name,
      url: `${uploadSubPath}/${f.filename}`,
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
    }));

    const data = {
      productName,
      model, // ⭐ บันทึกฟิลด์รุ่น
      serial,
      purchaseDate,
      expiryDate,
      durationMonths: durationMonths ?? null,
      durationDays,
      coverageNote,
      note,
    };
    if (newImages.length) data.images = [...existedImages, ...newImages];

    // ❗️ห้าม include: { images: true } เพราะ images เป็น JSON ไม่ใช่ relation
    const updated = await prisma.warrantyItem.update({
      where: { id: itemId },
      data,
    });

    return res.json({
      data: {
        item: {
          ...updated,
          images: (updated.images || []).map(im => ({
            ...im,
            absoluteUrl: `${publicBase}${im.url}`,
          })),
        },
      },
    });
  } catch (err) {
    console.error('updateItem error', err);
    return res.status(500).json({ message: 'ไม่สามารถบันทึกการแก้ไขรายการสินค้าได้' });
  }
}
