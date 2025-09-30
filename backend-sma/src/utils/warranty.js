const STATUS_METADATA = {
  active: {
    label: "ใช้งานได้",
    color: "bg-emerald-100 text-emerald-700",
  },
  nearing_expiration: {
    label: "ใกล้หมดอายุ",
    color: "bg-amber-100 text-amber-700",
  },
  expired: {
    label: "หมดอายุ",
    color: "bg-rose-100 text-rose-700",
  },
  unknown: {
    label: "ไม่ทราบสถานะ",
    color: "bg-gray-100 text-gray-600",
  },
};

const MS_IN_DAY = 1000 * 60 * 60 * 24;

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function computeExpiryDate(purchaseDate, durationMonths, explicitExpiry) {
  const expiry = parseDate(explicitExpiry);
  if (expiry) return expiry;
  const purchase = parseDate(purchaseDate);
  if (!purchase || durationMonths == null) return null;
  const result = new Date(purchase.getTime());
  result.setMonth(result.getMonth() + Number(durationMonths));
  return result;
}

function computeDurationDays(purchaseDate, expiryDate) {
  const purchase = parseDate(purchaseDate);
  const expiry = parseDate(expiryDate);
  if (!purchase || !expiry) return null;
  const diff = Math.ceil((expiry - purchase) / MS_IN_DAY);
  return diff > 0 ? diff : 0;
}

function toISODate(date) {
  const parsed = parseDate(date);
  if (!parsed) return null;
  return parsed.toISOString().slice(0, 10);
}

export function determineWarrantyStatus(expiryDate, notifyDays = 14) {
  const expiry = parseDate(expiryDate);
  if (!expiry) {
    return {
      code: "unknown",
      daysLeft: null,
      ...STATUS_METADATA.unknown,
    };
  }
  const today = new Date();
  const diffDays = Math.ceil((expiry - today) / MS_IN_DAY);

  if (diffDays < 0) {
    return {
      code: "expired",
      daysLeft: diffDays,
      ...STATUS_METADATA.expired,
    };
  }

  if (diffDays <= notifyDays) {
    return {
      code: "nearing_expiration",
      daysLeft: diffDays,
      ...STATUS_METADATA.nearing_expiration,
    };
  }

  return {
    code: "active",
    daysLeft: diffDays,
    ...STATUS_METADATA.active,
  };
}

export function buildWarrantyPersistenceData(payload) {
  const purchaseDate = parseDate(payload.purchase_date);
  if (!purchaseDate) throw new Error("Invalid purchase date");

  let durationMonths = payload.duration_months != null ? Number(payload.duration_months) : null;
  const expiryDate = computeExpiryDate(purchaseDate, durationMonths, payload.expiry_date);
  const durationDays = computeDurationDays(purchaseDate, expiryDate);

  if ((durationMonths == null || Number.isNaN(durationMonths)) && durationDays != null) {
    durationMonths = Math.max(1, Math.round(durationDays / 30));
  }

  const normalize = (value) => {
    if (value == null) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    return value;
  };

  return {
    customerEmail: payload.customer_email.trim().toLowerCase(),
    customerName: normalize(payload.customer_name),
    customerPhone: normalize(payload.customer_phone),
    productName: payload.product_name.trim(),
    serial: normalize(payload.serial),
    purchaseDate,
    expiryDate,
    durationMonths,
    durationDays,
    coverageNote: payload.warranty_terms.trim(),
    note: normalize(payload.note),
  };
}

export function mapWarrantyForResponse(warranty, { notifyDaysInAdvance = 14 } = {}) {
  if (!warranty) return null;
  const status = determineWarrantyStatus(warranty.expiryDate, notifyDaysInAdvance);
  
  // Parse images from JSON
  let images = [];
  try {
    if (warranty.images) {
      images = JSON.parse(warranty.images);
    }
  } catch (error) {
    console.error('Error parsing warranty images:', error);
    images = [];
  }
  
  return {
    id: warranty.id,
    storeId: warranty.storeId,
    productName: warranty.productName,
    serial: warranty.serial,
    customerName: warranty.customerName,
    customerEmail: warranty.customerEmail,
    customerPhone: warranty.customerPhone,
    purchaseDate: toISODate(warranty.purchaseDate),
    expiryDate: toISODate(warranty.expiryDate),
    durationMonths: warranty.durationMonths,
    durationDays: warranty.durationDays,
    coverageNote: warranty.coverageNote,
    note: warranty.note,
    documents: warranty.documents,
    images: images,
    statusCode: status.code,
    statusTag: status.label,
    statusColor: status.color,
    status: status.code,
    daysLeft: status.daysLeft,
    createdAt: warranty.createdAt?.toISOString?.() ?? null,
    updatedAt: warranty.updatedAt?.toISOString?.() ?? null,
    warrantyPdfUrl: `/warranties/${warranty.id}/pdf`,
  };
}

export function summarizeWarrantyStatuses(warranties, notifyDaysInAdvance = 14) {
  const summary = new Map();
  warranties.forEach((warranty) => {
    const meta = determineWarrantyStatus(warranty.expiryDate, notifyDaysInAdvance);
    const key = meta.code;
    const current = summary.get(key) || { code: key, label: meta.label, count: 0 };
    current.count += 1;
    summary.set(key, current);
  });
  return Array.from(summary.values());
}
