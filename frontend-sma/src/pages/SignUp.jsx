import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import TextInput from '../components/TextInput'
import Button from '../components/Button'
import Card from '../components/Card'
import { api } from '../lib/api'

export default function SignUp(){
  const [sp] = useSearchParams()
  const initialTab = sp.get('role') === 'store' ? 'store' : 'customer'
  const [tab, setTab] = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // customer fields
  const [c, setC] = useState({ firstName:'', lastName:'', email:'', phone:'', password:'', isConsent:false })
  // store fields
  const [s, setS] = useState({ storeName:'', typeStore:'', ownerStore:'', email:'', phone:'', address:'', timeAvailable:'', password:'', isConsent:false })

  useEffect(()=>{ setTab(initialTab) },[initialTab])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setMsg(''); setErr('')
    try {
      if (tab==='customer') {
        await api.post('/auth/register/customer', c)
      } else {
        await api.post('/auth/register/store', s)
      }
      setMsg('ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี')
    } catch (e) {
      setErr(e?.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[80vh] bg-sky-50 py-10">
      <Card className="mx-auto w-full max-w-md">
        <div className="mb-4 text-center text-lg font-semibold">สมัครสมาชิก</div>
        {/* Tabs */}
        <div className="mb-4 grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm">
          <button onClick={()=>setTab('customer')} className={`rounded-md py-2 ${tab==='customer'?'bg-white shadow':''}`}>ลูกค้า</button>
          <button onClick={()=>setTab('store')} className={`rounded-md py-2 ${tab==='store'?'bg-white shadow':''}`}>ร้านค้า</button>
        </div>

        {msg && <div className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700">{msg}</div>}
        {err && <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</div>}

        <form onSubmit={submit} className="space-y-3">
          {tab==='customer' ? (
            <>
              <TextInput label="ชื่อ" value={c.firstName} onChange={e=>setC(v=>({...v, firstName:e.target.value}))} required />
              <TextInput label="นามสกุล" value={c.lastName} onChange={e=>setC(v=>({...v, lastName:e.target.value}))} required />
              <TextInput label="อีเมล" type="email" value={c.email} onChange={e=>setC(v=>({...v, email:e.target.value}))} required />
              <TextInput label="เบอร์โทร" value={c.phone} onChange={e=>setC(v=>({...v, phone:e.target.value}))} required />
              <TextInput label="รหัสผ่าน" type="password" value={c.password} onChange={e=>setC(v=>({...v, password:e.target.value}))} required />
              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={c.isConsent} onChange={e=>setC(v=>({...v, isConsent:e.target.checked}))} />
                <span>ฉันยินยอมตามนโยบายความเป็นส่วนตัว</span>
              </label>
            </>
          ) : (
            <>
              <TextInput label="ชื่อร้าน" value={s.storeName} onChange={e=>setS(v=>({...v, storeName:e.target.value}))} required />
              <TextInput label="ประเภทร้าน" value={s.typeStore} onChange={e=>setS(v=>({...v, typeStore:e.target.value}))} required />
              <TextInput label="เจ้าของร้าน" value={s.ownerStore} onChange={e=>setS(v=>({...v, ownerStore:e.target.value}))} required />
              <TextInput label="อีเมล" type="email" value={s.email} onChange={e=>setS(v=>({...v, email:e.target.value}))} required />
              <TextInput label="เบอร์โทร" value={s.phone} onChange={e=>setS(v=>({...v, phone:e.target.value}))} required />
              <TextInput label="ที่อยู่" value={s.address} onChange={e=>setS(v=>({...v, address:e.target.value}))} required />
              <TextInput label="เวลาทำการ" placeholder="Mon-Sun 09:00-20:00" value={s.timeAvailable} onChange={e=>setS(v=>({...v, timeAvailable:e.target.value}))} required />
              <TextInput label="รหัสผ่าน" type="password" value={s.password} onChange={e=>setS(v=>({...v, password:e.target.value}))} required />
              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={s.isConsent} onChange={e=>setS(v=>({...v, isConsent:e.target.checked}))} />
                <span>ฉันยินยอมตามนโยบายความเป็นส่วนตัว</span>
              </label>
            </>
          )}
          <Button disabled={loading} className="w-full">{loading?'กำลังสมัครสมาชิก...':'สมัครสมาชิก'}</Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">มีบัญชีแล้ว? <Link to="/signin" className="text-[color:var(--brand)] hover:underline">เข้าสู่ระบบ</Link></div>
      </Card>
    </div>
  )
}
