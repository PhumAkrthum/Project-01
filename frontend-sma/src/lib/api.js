// src/lib/api.js
import axios from 'axios'

export const API_URL =
  (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.replace(/\/+$/, '')) ||
  'http://localhost:4000'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

// --- helpers
export function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || ''
}
export function setAuthHeader(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete api.defaults.headers.common.Authorization
}

// ตั้งค่า header ตั้งแต่แอปบูต (กันเคสรีเฟรชหน้าแล้ว request แรกไม่มี header)
setAuthHeader(getToken())

// ใส่ Authorization ทุกครั้งก่อนยิง request
api.interceptors.request.use((cfg) => {
  const token = getToken()
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// (ออปชัน) ดัก 401/403 เพื่อเคลียร์ token หรือพาไปหน้า login ได้ตามต้องการ
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      // localStorage.removeItem('token')
      // window.location.assign('/signin')
    }
    return Promise.reject(err)
  }
)
