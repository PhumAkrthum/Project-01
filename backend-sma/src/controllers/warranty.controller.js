// backend-sma/src/controllers/warranty.controller.js
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
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
 * ใช้ร่วมกันได้ทั้งร้าน (STORE) และลูกค้า (CUSTOMER)
 * GET /warranties/:warrantyId/pdf
 * GET /customer/warranties/:warrantyId/pdf  (จะถูกเรียกมาที่ฟังก์ชันเดียวกัน)
 */
export async function downloadWarrantyPdf(req, res) {
  try {
    const role = req.user?.role;
    if (!role) {
      return sendError(res, 401, "ต้องเข้าสู่ระบบก่อน");
    }

    const warrantyId = String(req.params.warrantyId);

    const header = await prisma.warranty.findUnique({
      where: { id: warrantyId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        store: { include: { storeProfile: true } },
      },
    });

    if (!header) {
      return sendError(res, 404, "ไม่พบใบรับประกัน");
    }

    // ตรวจสิทธิ์ตามบทบาท
    if (role === "STORE") {
      const storeId = currentStoreId(req);
      if (storeId == null || header.storeId !== storeId) {
        return sendError(res, 404, "ไม่พบใบรับประกัน");
      }
    } else if (role === "CUSTOMER") {
      // ป้องกันกรณีเรียกตรง ๆ โดยไม่ผ่าน controller ลูกค้า
      const isOwner =
        header.customerUserId === req.user.id ||
        (header.customerEmail && header.customerEmail === req.user.email);
      if (!isOwner) {
        return sendError(res, 403, "Forbidden");
      }
    } else {
      return sendError(res, 403, "Forbidden");
    }

    const profile = header.store?.storeProfile;
    const notifyDays = profile?.notifyDaysInAdvance ?? DEFAULT_NOTIFY_DAYS;

    // === headers HTTP ===
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="warranty-${header.code || header.id}.pdf"`
    );

    // =================== ส่วน "สร้าง PDF" ===================
    // helper
    const mm = (v) => v * 2.83464567;
    const T = (v, f = "-") =>
      v === undefined || v === null || String(v).trim() === "" ? f : String(v);

    const fontCandidatesRegular = [
      process.env.THAI_FONT_REGULAR, // optional ENV override
      path.resolve(process.cwd(), "src/assets/fonts/Sarabun-Regular.ttf"),
      path.resolve(process.cwd(), "src/assets/fonts/NotoSansThai-Regular.ttf"),
    ].filter(Boolean);

    const fontCandidatesBold = [
      process.env.THAI_FONT_BOLD,
      path.resolve(process.cwd(), "src/assets/fonts/Sarabun-Bold.ttf"),
      path.resolve(process.cwd(), "src/assets/fonts/NotoSansThai-Bold.ttf"),
    ].filter(Boolean);

    function firstExistingFile(paths) {
      for (const p of paths) {
        try {
          if (p && fs.existsSync(p)) return p;
        } catch {}
      }
      return null;
    }

    const doc = new PDFDocument({ autoFirstPage: false });

    // --- โหลดฟอนต์ไทย ---
    const regPath = firstExistingFile(fontCandidatesRegular);
    const boldPath = firstExistingFile(fontCandidatesBold);

    if (!regPath || !/\.ttf$/i.test(regPath)) {
      return sendError(
        res,
        500,
        "THAI_FONT_NOT_FOUND: กรุณาวาง Sarabun-Regular.ttf (หรือ NotoSansThai-Regular.ttf) ไว้ที่ src/assets/fonts/"
      );
    }

    try {
      // ใช้ buffer เพื่อหลีกเลี่ยงปัญหา path/encoding
      doc.registerFont("THAI", fs.readFileSync(regPath));
      if (boldPath && /\.ttf$/i.test(boldPath)) {
        doc.registerFont("THAI_BOLD", fs.readFileSync(boldPath));
      }
      doc.font("THAI"); // default
    } catch (e) {
      console.error("Font load error:", e);
      return sendError(
        res,
        500,
        "Unknown font format: โปรดใช้ไฟล์ TTF แบบ static (เช่น Sarabun-Regular.ttf) ไม่ใช่ไฟล์ Variable/WOFF"
      );
    }

    // เริ่มส่งสตรีม PDF ออกไป
    doc.pipe(res);

    // helpers วาดหัว + ช่อง
    function headerTitle(left, top, width) {
      doc
        .font(boldPath ? "THAI_BOLD" : "THAI")
        .fontSize(18)
        .fillColor("#000")
        .text("ใบรับประกัน", left, top, { width: width / 2, align: "left" });

      doc.font("THAI").fontSize(14).text("WARRANTY", left, top + mm(8), {
        width: width / 2,
        align: "left",
      });

      doc.font("THAI").fontSize(12).text("สำหรับผู้ซื้อ", left + width / 2, top, {
        width: width / 2,
        align: "right",
      });
    }

    function cell(x, y, w, h, th, en, value, pad = mm(3.5)) {
      doc.rect(x, y, w, h).stroke();
      doc
        .font("THAI")
        .fontSize(10)
        .fillColor("#000")
        .text(th, x + pad, y + pad, { width: w - pad * 2 });
      doc
        .font("THAI")
        .fontSize(9)
        .fillColor("#555")
        .text(en, x + pad, y + pad + mm(5), { width: w - pad * 2 });
      doc
        .font("THAI")
        .fontSize(11)
        .fillColor("#000")
        .text(T(value), x + pad, y + pad + mm(11), {
          width: w - pad * 2,
          height: h - pad * 2 - mm(11),
        });
    }

    function drawWarrantyPage(base, item) {
      doc.addPage({
        size: [mm(210), mm(297)],
        margins: { top: mm(12), left: mm(12), right: mm(12), bottom: mm(12) },
      });

      const pageW = mm(210);
      const left = mm(12);
      const top = mm(12);
      const width = pageW - mm(12) * 2;

      headerTitle(left, top, width);

      const tableTop = top + mm(22);
      const tableW = width;
      const colL = Math.round(tableW * 0.55);
      const colR = tableW - colL;

      const rowH1 = mm(22);
      const rowH2 = mm(22);
      const rowH3 = mm(28);
      const rowH4 = mm(30);
      const rowH5 = mm(22);
      const totalH = rowH1 + rowH2 + rowH3 + rowH4 + rowH5;

      doc.rect(left, tableTop, tableW, totalH).stroke();

      let y = tableTop;

      // แถว 1
      cell(left, y, colL, rowH1, "เลขที่", "Card No.", base.cardNo);
      cell(left + colL, y, colR, rowH1, "สินค้า", "Product", item.productName);
      y += rowH1;

      // แถว 2
      cell(left, y, colL, rowH2, "รุ่น", "Model", item.model || "-");
      cell(left + colL, y, colR, rowH2, "หมายเลขเครื่อง", "Serial No.", item.serialNumber);
      y += rowH2;

      // แถว 3
      cell(left, y, colL, rowH3, "ชื่อ-นามสกุล", "Customer's Name", base.customerName);
      cell(left + colL, y, colR, rowH3, "โทรศัพท์", "Tel.", base.customerTel);
      y += rowH3;

      // แถว 4: Address เต็มแถว
      doc.rect(left, y, tableW, rowH4).stroke();
      doc.font("THAI").fontSize(10).fillColor("#000").text("ที่อยู่", left + mm(3.5), y + mm(3.5));
      doc.font("THAI").fontSize(9).fillColor("#555").text("Address", left + mm(3.5), y + mm(8.5));
      doc
        .font("THAI")
        .fontSize(11)
        .fillColor("#000")
        .text(T(base.customerAddress), left + mm(3.5), y + mm(14), {
          width: tableW - mm(7),
        });
      y += rowH4;

      // แถว 5
      const purchaseDate = item.purchaseDate || base.purchaseDate;
      const purchaseTxt = purchaseDate
        ? new Date(purchaseDate).toLocaleDateString("th-TH")
        : "-";
      cell(
        left,
        y,
        colL,
        rowH5,
        "ชื่อจากบริษัทฯ/ตัวแทนจำหน่าย",
        "Dealer' Name",
        base.dealerName
      );
      cell(left + colL, y, colR, rowH5, "วันที่ซื้อ", "Purchase Date", purchaseTxt);
      y += rowH5;

      // หมายเหตุบรรทัดล่าง
      doc
        .font("THAI")
        .fontSize(11)
        .fillColor("#000")
        .text(
          T(base.footerNote, "โปรดนำใบรับประกันฉบับนี้มาแสดงเป็นหลักฐานทุกครั้งเมื่อใช้บริการ"),
          left,
          y + mm(8),
          { width, align: "left" }
        );

      // ข้อมูลบริษัท (ล่างซ้าย)
      const companyLines = [
        T(base.company?.name, ""),
        T(base.company?.address, ""),
        ["โทร.", T(base.company?.tel, ""), base.company?.fax ? `แฟกซ์ ${base.company.fax}` : ""]
          .filter(Boolean)
          .join(" "),
      ].filter(Boolean);

      if (companyLines.length) {
        doc
          .font("THAI")
          .fontSize(10)
          .fillColor("#000")
          .text(companyLines.join("\n"), left + mm(22), mm(297) - mm(44), {
            width: width - mm(22),
          });
      }
    }

    // map ข้อมูล header → base & items
    const base = {
      cardNo: header.code || header.id,
      customerName: header.customerName || "-",
      customerTel: header.customerPhone || "-",
      customerAddress: "-", // ถ้ามี address ลูกค้า ค่อย map มาแทน
      dealerName: profile?.storeName || "-",
      purchaseDate: header.createdAt,
      footerNote: "โปรดนำใบรับประกันฉบับนี้มาแสดงเป็นหลักฐานทุกครั้งเมื่อใช้บริการ",
      company: {
        name: profile?.storeName || "",
        address: profile?.address || "",
        tel: profile?.phone || "",
        fax: "",
      },
    };

    const items = (header.items || []).length
      ? header.items.map((it) => ({
          productName: it.productName || "-",
          model: "-", // ถ้ามี field รุ่นจริง ค่อยเปลี่ยนมาใช้
          serialNumber: it.serial || "-",
          purchaseDate: it.purchaseDate || header.createdAt,
        }))
      : [{ productName: "-", model: "-", serialNumber: "-", purchaseDate: header.createdAt }];

    // วาดหน้า (รายการละ 1 หน้า)
    for (const it of items) {
      // const { statusTag, daysLeft } = statusForItem(it, notifyDays); // ถ้าจะใช้ต่อ
      drawWarrantyPage(base, it);
    }

    doc.end();
    // =================== จบส่วนสร้าง PDF ===================
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
