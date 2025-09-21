import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

export default function Home(){
  return (
    <div className="bg-sky-50">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pb-12 pt-16 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-5xl">แพลตฟอร์มบริหารจัดการการรับประกัน</h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-600">ระบบช่วยจัดเก็บใบรับประกัน รายงานสถิติ และเชื่อมต่อข้อมูลร้านค้าอย่างปลอดภัย</p>
        <Button as={Link} to="/signup" className="mt-6 text-white">เริ่มฟรี ใช้งานง่าย ปลอดภัย</Button>

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
          {[
            ['ร้านค้า', '500+'],
            ['ลูกค้า', '4000+'],
            ['ใบเคลม', '10000+'],
            ['ความพึงพอใจ', '98%']
          ].map(([label, value], i) => (
            <div key={i} className="rounded-2xl bg-white p-4 text-center shadow ring-1 ring-black/5">
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Cards */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 pb-16 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-semibold">ลูกค้า</h3>
          <p className="mt-2 text-sm text-gray-600">เก็บหลักฐานการรับประกัน ค้นหาใบเสร็จ และแจ้งเคลมได้รวดเร็ว</p>
          <Button as={Link} to="/signup?role=customer" className="mt-4 text-white">เริ่มการใช้งานฝั่งลูกค้า</Button>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">ร้านค้า</h3>
          <p className="mt-2 text-sm text-gray-600">จัดการใบรับประกัน ลูกค้า และสต๊อก พร้อมรายงานสถิติครบ</p>
          <Button as={Link} to="/signup?role=store" className="mt-4 text-white">เริ่มการใช้งานฝั่งร้านค้า</Button>
        </Card>
      </section>

      {/* Features */}
      <section id="why" className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">ทำไมต้องเลือก Warranty</h2>
        <div id="features" className="grid gap-6 md:grid-cols-4">
          {['จัดการใบรับประกัน','จัดการลูกค้า','รายงานและสถิติ','เชื่อมโยงสต๊อก'].map((t,i)=> (
            <Card key={i}><div className="text-lg font-semibold">{t}</div><p className="mt-2 text-sm text-gray-600">ออกแบบให้ใช้งานง่ายและปลอดภัย</p></Card>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-sky-100 py-12 text-center">
        <h3 className="text-xl font-bold text-gray-900">พร้อมเริ่มต้นแล้วหรือยัง?</h3>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button as={Link} to="/signin" className="bg-white text-gray-900 hover:bg-gray-50">เข้าสู่ระบบ</Button>
          <Button as={Link} to="/signup" className='text-white'>สมัครสมาชิกฟรี</Button>
        </div>
      </section>
    </div>
  )
}
