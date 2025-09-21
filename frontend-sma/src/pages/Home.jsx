// src/pages/Home.jsx
import { Link } from "react-router-dom";

/* คลื่นพื้นหลัง */
function HeroWaves() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#eaf3ff]" />
      <svg
        className="absolute -top-10 left-1/2 -translate-x-1/2 w-[160%] max-w-none rotate-180 opacity-90"
        viewBox="0 0 1440 320"
        aria-hidden="true"
      >
        <path
          fill="#e5f0ff"
          d="M0,64L48,69.3C96,75,192,85,288,117.3C384,149,480,203,576,229.3C672,256,768,256,864,240C960,224,1056,192,1152,165.3C1248,139,1344,117,1392,106.7L1440,96L1440,0L0,0Z"
        />
      </svg>
      <svg
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[160%] max-w-none opacity-80"
        viewBox="0 0 1440 320"
        aria-hidden="true"
      >
        <path
          fill="#dbeafe"
          d="M0,224L48,197.3C96,171,192,117,288,96C384,75,480,85,576,112C672,139,768,181,864,176C960,171,1056,117,1152,96C1248,75,1344,85,1392,90.7L1440,96L1440,320L0,320Z"
        />
        <path
          fill="#bfdbfe"
          d="M0,256L60,234.7C120,213,240,171,360,154.7C480,139,600,149,720,154.7C840,160,960,160,1080,149.3C1200,139,1320,117,1380,106.7L1440,96L1440,320L0,320Z"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

/* ไอคอนต่าง ๆ สำหรับสถิติ */
function SmallIcon({ name, className = "w-5 h-5 text-blue-600" }) {
  const common = { className, fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  switch (name) {
    case "users":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M16 14a4 4 0 10-8 0" />
          <circle cx="12" cy="7" r="3" />
          <path d="M5 20a7 7 0 0114 0" />
        </svg>
      );
    case "shop":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 7h18l-2 12H5L3 7z" />
          <path d="M16 7V4H8v3" />
        </svg>
      );
    case "doc":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M14 2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2V8z" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    default:
      return null;
  }
}

/* กล่องสถิติ */
function Stat({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-full bg-white shadow border border-black/5 flex items-center justify-center">
        {icon}
      </div>
      <div className="mt-2 text-xl font-semibold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative">
      {/* ===== HERO (พื้นหลังฟ้าอ่อนทั้งบล็อก) ===== */}
      <section className="relative overflow-hidden bg-[#eaf3ff]">
        <HeroWaves />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-16 text-center">
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900">
            แพลตฟอร์มบริหารจัดการ
            <br className="hidden sm:block" />
            การรับประกัน
          </h1>
          <p className="mt-3 text-gray-600">
            สะดวกทั้งผู้ขายและผู้ซื้อ ช่วยให้จัดเก็บ ปรับปรุง และติดตามได้อย่างมีระบบ
          </p>

          {/* สถิติ */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <Stat icon={<SmallIcon name="shop" />} value="500+" label="ร้านค้าที่ใช้งาน" />
            <Stat icon={<SmallIcon name="users" />} value="4000+" label="ลูกค้าที่ลงทะเบียน" />
            <Stat icon={<SmallIcon name="doc" />} value="10000+" label="ใบรับประกัน" />
            <Stat icon={<SmallIcon name="check" />} value="99%" label="ความพึงพอใจ" />
          </div>

          {/* การ์ดสองฝั่ง */}
          <div className="mt-10 grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900">ลูกค้า</h3>
              <p className="mt-2 text-gray-600 text-sm">
                เก็บเอกสารการรับประกันไว้ที่เดียว ค้นหาเร็ว แจ้งเตือนก่อนหมดอายุ
              </p>
              <Link
                to="/signup?role=customer"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
              >
                เริ่มต้นสำหรับผู้ซื้อสินค้า
              </Link>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900">ร้านค้า</h3>
              <p className="mt-2 text-gray-600 text-sm">
                ลงทะเบียนรับประกันให้ลูกค้า ออกเอกสารอัตโนมัติ วิเคราะห์สถิติการเคลม
              </p>
              <Link
                to="/signup?role=store"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
              >
                เริ่มต้นสำหรับร้านค้า
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE (พื้นหลังขาว) ===== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8">
            ทำไมต้องเลือก Warranty
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "จัดเก็บประวัติสินค้า", desc: "เก็บเอกสารและหลักฐานการซื้อแบบดิจิทัล", icon: "doc" },
              { title: "จัดการลูกค้า", desc: "ข้อมูลลูกค้าและประวัติการรับประกันครบถ้วน", icon: "users" },
              { title: "รายงาน & สถิติ", desc: "ดูภาพรวมการขายและการเคลมอย่างง่ายดาย", icon: "check" },
              { title: "แจ้งเตือนอัตโนมัติ", desc: "เตือนหมดอายุและสถานะเคลมแบบเรียลไทม์", icon: "shop" },
            ].map((it) => (
              <div key={it.title} className="bg-white rounded-2xl shadow-xl border border-black/5 p-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <SmallIcon name={it.icon} className="w-6 h-6 text-blue-700" />
                </div>
                <div className="mt-4 font-semibold text-gray-900">{it.title}</div>
                <p className="mt-1 text-sm text-gray-600">{it.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-8 text-center shadow">
            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900">พร้อมเริ่มต้นแล้วหรือยัง?</h3>
            <p className="mt-2 text-gray-600">
              เริ่มต้นใช้งานฟรีสำหรับลูกค้า และทดลองระบบสำหรับร้านค้าได้ทันที
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/signin"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-xl border border-blue-600 text-blue-700 hover:bg-blue-50 px-5 py-2.5 text-sm font-medium"
              >
                สมัครสมาชิก
              </Link>
            </div>
          </div>
        </div>
        {/* ไม่มี Footer ที่นี่ เพื่อตัดความซ้ำ */}
      </section>
    </div>
  );
}
