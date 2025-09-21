export default function Footer(){
  return (
    <footer className="mt-20 bg-gray-900 text-gray-300">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-white"><span className="grid h-8 w-8 place-items-center rounded-full bg-sky-500">🛡️</span>Warranty</div>
            <p className="text-sm">แพลตฟอร์มจัดการการรับประกัน.</p>
          </div>
          <div>
            <div className="mb-2 font-semibold text-white">บริการ</div>
            <ul className="space-y-1 text-sm">
              <li>จัดการใบรับประกัน</li>
              <li>รายงาน & สถิติ</li>
              <li>เชื่อมต่อสต๊อก</li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-semibold text-white">ช่วยเหลือ</div>
            <ul className="space-y-1 text-sm">
              <li>วิธีเริ่มต้น</li>
              <li>คำถามที่พบบ่อย</li>
              <li>ติดต่อเรา</li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-semibold text-white">สถิติ</div>
            <p className="text-sm">500+ ร้านค้าพาร์ทเนอร์ • 4k+ ลูกค้า • 98% พอใจ</p>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-gray-400">© 2024 Warranty Management Platform. สงวนลิขสิทธิ์.</div>
      </div>
    </footer>
  )
}
