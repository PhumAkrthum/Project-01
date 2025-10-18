// src/pages/VerifyEmail.jsx
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'fail'
  const [message, setMessage] = useState('กำลังยืนยันอีเมล...')
  const called = useRef(false) // กันเรียกซ้ำ (Strict Mode/รีเฟรชเร็ว)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const token = params.get('token')
    if (!token) {
      setStatus('fail')
      setMessage('กรุณายืนยันการเข้าสู่ระบบที่email')
      return
    }

    api
      .get('/auth/verify', { params: { token } })
      .then(() => {
        setStatus('ok')
        setMessage('ยืนยันอีเมลเรียบร้อยแล้ว')
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message || 'ยืนยันไม่สำเร็จ หรือลิงก์หมดอายุ'
        // ถ้าโทเคนถูกใช้ไปแล้ว ให้ถือว่า verified แล้ว (กรณีคลิกลิงก์ซ้ำ/Strict Mode)
        if (
          msg.includes('ถูกใช้แล้ว') ||
          msg.toLowerCase().includes('used')
        ) {
          setStatus('ok')
          setMessage('บัญชีของคุณได้รับการยืนยันแล้ว')
          return
        }
        setStatus('fail')
        setMessage(msg)
      })
  }, [params])

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-sky-50 py-10">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2">Verify Email</h1>
        <p className={status === 'fail' ? 'text-red-600' : 'text-gray-700'}>
          {message}
        </p>
        <div className="mt-4 flex gap-3 justify-center">
          <Link to="/signin">
            <Button>ไปหน้าเข้าสู่ระบบ</Button>
          </Link>
          <Link to="/">
            <Button variant="outline">กลับหน้าหลัก</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
