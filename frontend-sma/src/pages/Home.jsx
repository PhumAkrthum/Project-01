// src/pages/Home.jsx
import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="bg-white text-gray-800 overflow-hidden">
      {/* ===== HERO ===== */}
      <section className="relative bg-[#eaf3ff] overflow-hidden pb-24">
        {/* Animated wave background */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg
            className="wave-motion"
            viewBox="0 0 1440 320"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fill="#dbeafe"
              d="M0,160L48,154.7C96,149,192,139,288,133.3C384,128,480,128,576,144C672,160,768,192,864,208C960,224,1056,224,1152,202.7C1248,181,1344,139,1392,117.3L1440,96L1440,320L0,320Z"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-snug">
            แพลตฟอร์มบริหารจัดการ
            <br />
            การรับประกัน
          </h1>
          <p className="mt-4 text-gray-700 font-medium text-base sm:text-lg">
            ปลอดภัย ใช้งานง่าย เข้าถึงได้ทุกคน
          </p>

          {/* ===== STATS ===== */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
            {[
              { value: "500+", label: "ร้านค้าที่เชื่อถือ" },
              { value: "4000+", label: "ลูกค้าที่พึงพอใจ" },
              { value: "10000+", label: "ใบรับประกัน" },
              { value: "99%", label: "ความพึงพอใจ" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center group">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-100 rounded-full blur-lg opacity-50 group-hover:opacity-80 transition"></div>
                  <div className="w-16 h-16 rounded-full border-2 border-blue-600 flex items-center justify-center text-blue-600 font-semibold text-lg bg-white shadow-lg shadow-blue-100 transition transform group-hover:scale-105">
                    {item.value}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mt-2">{item.label}</p>
              </div>
            ))}
          </div>

          {/* ===== CLIENT / STORE CARDS ===== */}
          <div className="mt-16 grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                icon: "https://cdn-icons-png.flaticon.com/512/1077/1077114.png",
                title: "ลูกค้า",
                desc: "ระบบจัดเก็บข้อมูลการรับประกันสินค้า สำหรับลูกค้า เพื่อความสะดวกในการตรวจสอบสถานะเอกสารและป้องกันการสูญหายของหลักฐานการรับประกัน",
                btn: "เริ่มต้นสำหรับผู้ซื้อสินค้า",
                gradient: "from-blue-400/50 to-blue-100/10",
                to: "/signup?role=customer", // คงพฤติกรรมเดิม
              },
              {
                icon: "https://cdn-icons-png.flaticon.com/512/1170/1170678.png",
                title: "ร้านค้า",
                desc: "ระบบบริหารจัดการการรับประกันสำหรับร้านค้า เพื่อเพิ่มประสิทธิภาพการให้บริการหลังการขายและวิเคราะห์ข้อมูลลูกค้าได้ง่ายขึ้น",
                btn: "เริ่มต้นสำหรับร้านค้า",
                gradient: "from-orange-400/50 to-orange-100/10",
                to: "/signup?role=store", // คงพฤติกรรมเดิม
              },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-2xl transition duration-500 text-center hover:-translate-y-2 hover:bg-gradient-to-b hover:from-white hover:to-[#f3f7ff]"
              >
                <div className="flex justify-center mb-4">
                  <div className="relative animate-float">
                    <div
                      className={`absolute inset-0 bg-gradient-to-b ${card.gradient} rounded-full blur-lg opacity-80 w-20 h-20 mx-auto`}
                    />
                    <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-md shadow-md border border-white/30">
                      <img
                        src={card.icon}
                        alt={card.title}
                        className="w-12 h-12 object-contain z-10"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900">{card.title}</h3>
                <p className="mt-3 text-gray-600 text-sm leading-relaxed">{card.desc}</p>
                <Link
                  to={card.to}
                  className="inline-block mt-5 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {card.btn}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE ===== */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-14">
            ทำไมต้องเลือก Warranty
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "จัดการใบรับประกัน",
                icon: "/home-assets/icon-warranty.png",
                desc: "บันทึกและเก็บเอกสารรับประกันในระบบดิจิทัล ปลอดภัยและค้นหาได้สะดวก",
              },
              {
                title: "จัดการลูกค้า",
                icon: "/home-assets/icon-crm.png",
                desc: "ดูแลและบันทึกข้อมูลลูกค้าพร้อมประวัติการรับประกัน เพื่อบริการที่มีประสิทธิภาพ",
              },
              {
                title: "รายงานและสถิติ",
                icon: "/home-assets/icon-analytics.png",
                desc: "เข้าถึงข้อมูลการขายและการเคลม เพื่อปรับกลยุทธ์และเพิ่มประสิทธิภาพธุรกิจ",
              },
              {
                title: "แจ้งเตือนอัตโนมัติ",
                icon: "/home-assets/icon-reminder.png",
                desc: "ระบบแจ้งเตือนวันหมดอายุการรับประกันและสถานะเคลมให้ลูกค้าทราบแบบเรียลไทม์",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-[#f9fbff] rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-md opacity-70 w-20 h-20 mx-auto" />
                    <img
                      src={f.icon}
                      alt={f.title}
                      className="relative w-20 h-20 object-contain z-10"
                    />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-[#eaf3ff] py-20 text-center px-6 relative overflow-hidden">
        {/* ถ้ามีไฟล์ /public/wave.svg จะเห็นลายคลื่นเลื่อนเบา ๆ */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/wave.svg')] opacity-10 bg-repeat-x animate-waveSlide" />
        <h3 className="text-2xl font-bold text-gray-900 relative z-10">
          พร้อมเริ่มต้นแล้วหรือยัง?
        </h3>
        <p className="text-gray-600 mt-3 max-w-lg mx-auto text-sm relative z-10">
          เข้าร่วมร้านค้าและลูกค้าหลายพันรายที่เชื่อถือในระบบของเรา เริ่มต้นใช้งานได้ฟรีวันนี้
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center relative z-10">
          <Link
            to="/signin"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
          >
            เข้าสู่ระบบ
          </Link>
          <Link
            to="/signup"
            className="px-6 py-2.5 bg-white border border-blue-600 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
          >
            สมัครสมาชิก
          </Link>
        </div>
      </section>
    </div>
  );
}
