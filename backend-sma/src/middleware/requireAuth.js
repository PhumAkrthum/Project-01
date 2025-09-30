// src/middleware/requireAuth.js
import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  try {
    // รองรับหลายแหล่ง: Authorization header / cookie / query
    const authHeader =
      req.headers.authorization || req.get('Authorization') || ''
    const m = authHeader.match(/^Bearer\s+(.+)$/i)
    const token =
      (m && m[1]) ||
      req.cookies?.token ||           // เผื่อเก็บใน cookie ชื่อ token
      req.cookies?.auth_token ||      // หรือชื่ออื่น
      req.query?.token ||             // เผื่อ verify ลิงก์ที่ส่ง token มาเป็น query
      null

    if (!token) {
      return res.status(401).json({ message: 'Missing token' })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET)

    // ทำให้รูปแบบ user ใน req ชัดเจนและสม่ำเสมอ
    req.user = {
      id: payload.sub || payload.id || payload.userId || null,
      email: payload.email || null,
      role: payload.role || null,
      verified: !!payload.verified,
      // เก็บ payload เต็ม ๆ เผื่อใช้ต่อ
      _raw: payload,
    }

    if (!req.user.id) {
      // กันเคส verify ผ่านแต่ไม่มี id ใน payload
      return res.status(401).json({ message: 'Invalid token' })
    }

    next()
  } catch (err) {
    const isExpired = err?.name === 'TokenExpiredError'
    return res
      .status(401)
      .json({ message: isExpired ? 'Token expired' : 'Invalid token' })
  }
}
