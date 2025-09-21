// src/components/Footer.jsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#0b1220] text-[#c7d2fe]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <path fill="url(#fg)"
                  d="M12 2c.3 0 .6.06.88.18l6.62 2.65c.3.12.5.41.5.74V12c0 4.97-3.35 8.51-7.99 10-4.64-1.49-8-5.03-8-10V5.57c0-.33.2-.62.5-.74l6.62-2.65C11.4 2.06 11.7 2 12 2z" />
                <path fill="#fff"
                  d="M10.3 12.7l-.99-.99a1 1 0 10-1.41 1.41l1.7 1.7a1 1 0 001.41 0l4.1-4.1a1 1 0 10-1.41-1.41l-3.4 3.39z" />
              </svg>
              <span className="text-lg font-semibold text-white">Warranty</span>
            </div>
            <p className="text-sm text-blue-100/80 leading-6">
              แพลตฟอร์มบริหารจัดการการรับประกันสินค้า
              ครบวงจรสำหรับลูกค้าและร้านค้า
            </p>
            <div className="mt-4 text-sm text-blue-100/60">
              © 2024 Warranty Management Platform, สงวนลิขสิทธิ์.
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">บริการ</h3>
            <ul className="space-y-2 text-sm text-blue-100/80">
              <li>ลงทะเบียนสินค้า</li>
              <li>ติดตามการรับประกัน</li>
              <li>ระบบแจ้งเตือน</li>
              <li>รายงาน &amp; สถิติ</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">ช่วยเหลือ</h3>
            <ul className="space-y-2 text-sm text-blue-100/80">
              <li>คู่มือการใช้งาน</li>
              <li>คำถามที่พบบ่อย</li>
              <li>นโยบายความเป็นส่วนตัว</li>
              <li>ติดต่อเรา</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">ลิงก์ด่วน</h3>
            <ul className="space-y-2 text-sm text-blue-100/80">
              <li><Link to="/signin" className="hover:text-white">เข้าสู่ระบบ</Link></li>
              <li><Link to="/signup" className="hover:text-white">สมัครสมาชิก</Link></li>
              <li><Link to="/" className="hover:text-white">หน้าแรก</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
