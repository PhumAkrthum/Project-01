// src/pages/SignIn.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TextInput from '../components/TextInput'
import Button from '../components/Button'
import Card from '../components/Card'
import { useAuth } from '../store/auth'

export default function SignIn(){
  const { login, logout } = useAuth()
  const nav = useNavigate()

  const [tab, setTab] = useState('customer') // 'customer' | 'store'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')

    try {
      const user = await login(email, password)
      const want = tab === 'customer' ? 'CUSTOMER' : 'STORE'
      if (user?.role !== want) {
        logout() // ไม่ถือ token ผิดบทบาทค้าง
        throw new Error('ประเภทบัญชีไม่ตรงกับที่เลือก')
      }
      nav('/')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] bg-sky-50 py-10">
      <Card className="mx-auto w-full max-w-md">
        <div className="mb-4 text-center text-lg font-semibold">เข้าสู่ระบบ</div>

        {/* แท็บเลือกประเภทบัญชี */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={()=>setTab('customer')}
            className={`rounded-lg border p-2 ${tab==='customer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            ลูกค้า
          </button>
          <button
            type="button"
            onClick={()=>setTab('store')}
            className={`rounded-lg border p-2 ${tab==='store' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            ร้านค้า
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <TextInput label="อีเมล" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <TextInput label="รหัสผ่าน" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Button disabled={loading} className="w-full">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          ยังไม่มีบัญชี? <Link to="/signup" className="text-[color:var(--brand)] hover:underline">สมัครสมาชิก</Link>
        </div>
      </Card>
    </div>
  )
}
