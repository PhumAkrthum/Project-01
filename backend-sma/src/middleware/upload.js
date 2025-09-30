import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

// โฟลเดอร์อัปโหลดให้สอดคล้องกับ server.js ที่เสิร์ฟ /uploads
// server.js ใช้: app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
const uploadRoot = path.resolve(process.cwd(), 'uploads');
const targetDir = path.join(uploadRoot, 'warranty-images');

// สร้างโฟลเดอร์ถ้ายังไม่มี (ทั้ง /uploads และ /uploads/warranty-images)
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, targetDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${nanoid()}-${Date.now()}${ext}`;
    cb(null, name);
  }
});

// ตรวจสอบประเภทไฟล์ (รองรับ jpg/jpeg/png/gif/webp)
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
]);
function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, JPG, PNG, GIF, WebP)'));
}

// จำกัดขนาดไฟล์/จำนวนไฟล์
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB ต่อไฟล์
    files: 5                     // สูงสุด 5 ไฟล์
  }
});

// FRONTEND ส่งฟิลด์ชื่อ "images"
export const uploadWarrantyImages = upload.array('images', 5);
