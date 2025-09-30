// src/controllers/warrantyItem.controller.js
import { prisma } from '../db/prisma.js';
import fs from 'fs';
import path from 'path';
import { uploadSubPath } from '../middleware/uploadImages.js';

const publicBase =
  (process.env.APP_URL && process.env.APP_URL.replace(/\/+$/, '')) ||
  `http://localhost:${process.env.PORT || 4000}`;

// เพิ่มรูปให้ WarrantyItem (many files)
export async function addItemImages(req, res) {
  try {
    const { itemId } = req.params;

    const item = await prisma.warrantyItem.findUnique({
      where: { id: itemId },
      include: { warranty: true },
    });
    if (!item) return res.status(404).json({ message: 'ไม่พบรายการสินค้า' });

    // ตรวจสอบสิทธิ์ร้าน (ต้องเป็นเจ้าของ)
    const userId = Number(req.user?.sub);
    if (!item.warranty || item.warranty.storeId !== userId) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ในรายการนี้' });
    }

    const existed = Array.isArray(item.images) ? item.images : [];
    const files = (req.files || []).map(f => ({
      id: path.parse(f.filename).name,           // ใช้ชื่อไฟล์เป็น id
      url: `${uploadSubPath}/${f.filename}`,     // เส้นทางสาธารณะ (server.js เสิร์ฟที่ /uploads)
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
    }));

    const nextImages = [...existed, ...files];

    const updated = await prisma.warrantyItem.update({
      where: { id: itemId },
      data: { images: nextImages },
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

// ลบรูปจาก WarrantyItem
export async function deleteItemImage(req, res) {
  try {
    const { itemId, imageId } = req.params;

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
    } catch {
      // ignore
    }

    const nextImages = current.filter(im => im.id !== imageId);
    const updated = await prisma.warrantyItem.update({
      where: { id: itemId },
      data: { images: nextImages },
    });

    return res.json({ data: { item: updated } });
  } catch (err) {
    console.error('deleteItemImage error', err);
    return res.status(500).json({ message: 'ลบรูปภาพไม่สำเร็จ' });
  }
}

// ⬇️ ใหม่: แก้ไขข้อมูลหลักของรายการ + แนบรูปเพิ่มได้ใน PATCH เดียว
export async function updateItem(req, res) {
  try {
    const { itemId } = req.params;

    // หา item พร้อมตรวจสิทธิ์เจ้าของ
    const item = await prisma.warrantyItem.findUnique({
      where: { id: itemId },
      include: { warranty: true },
    });
    if (!item) return res.status(404).json({ message: 'ไม่พบรายการสินค้า' });

    const userId = Number(req.user?.sub);
    if (!item.warranty || item.warranty.storeId !== userId) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ในรายการนี้' });
    }

    // รับค่าจาก form-data
    const {
      productName,
      durationMonths,
      serialNo,
      startDate,   // yyyy-mm-dd
      expireDate,  // yyyy-mm-dd
      terms,
    } = req.body;

    const data = {
      ...(productName !== undefined ? { productName } : {}),
      ...(durationMonths !== undefined ? { durationMonths: Number(durationMonths) || 0 } : {}),
      ...(serialNo !== undefined ? { serialNo } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(expireDate ? { expireDate: new Date(expireDate) } : {}),
      ...(terms !== undefined ? { terms } : {}),
    };

    // ถ้ามีไฟล์ที่แนบมากับ PATCH → ต่อท้ายเข้า images เดิม
    const existedImages = Array.isArray(item.images) ? item.images : [];
    const newImages = (req.files || []).map(f => ({
      id: path.parse(f.filename).name,
      url: `${uploadSubPath}/${f.filename}`,
      originalName: f.originalname,
      mime: f.mimetype,
      size: f.size,
    }));
    if (newImages.length) {
      data.images = [...existedImages, ...newImages];
    }

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
    return res.status(500).json({ message: 'อัปเดตรายการไม่สำเร็จ' });
  }
}
