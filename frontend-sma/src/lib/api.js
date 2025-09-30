// src/lib/api.js
import axios from 'axios'

export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const api = axios.create({
  baseURL: API_URL,
  // ถ้า backend ใช้ cookie ค่อยเปิดบรรทัดนี้
  // withCredentials: true,
})

/** ✅ ตั้ง Authorization ตั้งแต่เปิดแอป (กันรีเฟรชแล้ว header หาย) */
const bootToken = localStorage.getItem('token')
if (bootToken) {
  api.defaults.headers.common.Authorization = `Bearer ${bootToken}`
}

/** ✅ sync token ก่อนส่งทุก request (มี = ใส่, ไม่มี = ลบ) */
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  else delete cfg.headers.Authorization
  return cfg
})

/** (ตัวเลือก) จัดการ 401 รวม ๆ */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      if (typeof window !== 'undefined' && !location.pathname.startsWith('/signin')) {
        window.location.replace('/signin')
      }
    }
    return Promise.reject(err)
  }
)
