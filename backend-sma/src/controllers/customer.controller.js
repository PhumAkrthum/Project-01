// src/controllers/customer.controller.js
import { prisma } from '../db/prisma.js';
import * as warrantyCtrl from './warranty.controller.js';

// ใช้ JS ล้วน ๆ ไม่พึ่ง date-fns
function statusFromDate(expiryDate, notifyDays = 30) {
  if (!expiryDate) return { status: 'active', daysLeft: null };
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const daysLeft = Math.floor((new Date(expiryDate) - Date.now()) / ONE_DAY);
  if (daysLeft < 0) return { status: 'expired', daysLeft };
  if (daysLeft <= notifyDays) return { status: 'nearing_expiration', daysLeft };
  return { status: 'active', daysLeft };
}

// GET /customer/warranties
export async function getMyWarranties(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    const status = (req.query.status || 'all');

    const customerCond = {
      OR: [
        { customerUserId: req.user.id },
        { customerEmail: req.user.email },
      ],
    };

    const where = q
      ? {
          AND: [
            customerCond,
            {
              OR: [
                { code: { contains: q, mode: 'insensitive' } },
                { items: { some: { productName: { contains: q, mode: 'insensitive' } } } },
                { store: { storeProfile: { storeName: { contains: q, mode: 'insensitive' } } } },
              ],
            },
          ],
        }
      : customerCond;

    const list = await prisma.warranty.findMany({
      where,
      include: {
        store: { include: { storeProfile: true } },
        items: true, // images เป็น Json ใน item อยู่แล้ว
      },
      orderBy: { createdAt: 'desc' },
    });

    // enrich per item + filter by status
    const totalsCounter = { all: 0, active: 0, nearing_expiration: 0, expired: 0 };
    const filtered = list
      .map((w) => {
        const notifyDays = w.store?.storeProfile?.notifyDaysInAdvance ?? 30;
        const items = (w.items || []).map((it) => {
          const s = statusFromDate(it.expiryDate, notifyDays);
          totalsCounter.all += 1;
          totalsCounter[s.status] += 1;
          return { ...it, _status: s.status, _daysLeft: s.daysLeft };
        });

        const itemsAfterFilter = status === 'all' ? items : items.filter((i) => i._status === status);
        return { ...w, items: itemsAfterFilter };
      })
      .filter((w) => w.items.length > 0 || status === 'all');

    res.json({
      totals: totalsCounter,
      data: filtered,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /customer/warranty-items/:itemId/note
export async function updateMyNote(req, res, next) {
  try {
    const { itemId } = req.params; // cuid string
    const { note = '' } = req.body;

    const item = await prisma.warrantyItem.findUnique({
      where: { id: itemId },
      include: { warranty: true },
    });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const isOwner =
      item.warranty.customerUserId === req.user.id ||
      (item.warranty.customerEmail && item.warranty.customerEmail === req.user.email);

    if (!isOwner) return res.status(403).json({ message: 'Forbidden' });

    const updated = await prisma.warrantyItem.update({
      where: { id: itemId },
      data: { customerNote: note },
    });

    res.json({ message: 'Saved', item: updated });
  } catch (err) {
    next(err);
  }
}

// GET /customer/warranties/:warrantyId/pdf
export async function getMyWarrantyPdf(req, res, next) {
  try {
    const { warrantyId } = req.params;

    const w = await prisma.warranty.findUnique({ where: { id: warrantyId } });
    if (!w) return res.status(404).json({ message: 'Not found' });

    const isOwner =
      w.customerUserId === req.user.id ||
      (w.customerEmail && w.customerEmail === req.user.email);

    if (!isOwner) return res.status(403).json({ message: 'Forbidden' });

    // เรียกตัวสร้าง PDF เดิม (ปรับชื่อเมธอดให้ตรงโปรเจกต์จริง)
    req.params.warrantyId = warrantyId;
    return warrantyCtrl.getPdf(req, res, next);
  } catch (err) {
    next(err);
  }
}
