// backend-sma/src/middleware/requireVerified.js
import { prisma } from '../db/prisma.js'

export async function requireVerified(req, res, next) {
  try {
    // สมมติว่า requireAuth ใส่ req.userId หรือ req.user เอาไว้แล้ว
    const userId = req.user?.id || req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } })
    if (!user?.emailVerifiedAt) {
      return res.status(403).json({ message: 'ต้องยืนยันอีเมลก่อนใช้งาน' })
    }
    next()
  } catch (e) {
    next(e)
  }
}
