import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

function ShieldLogo({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path fill="url(#g2)"
        d="M12 2c.3 0 .6.06.88.18l6.62 2.65c.3.12.5.41.5.74V12c0 4.97-3.35 8.51-7.99 10-4.64-1.49-8-5.03-8-10V5.57c0-.33.2-.62.5-.74l6.62-2.65C11.4 2.06 11.7 2 12 2z" />
      <path fill="#fff"
        d="M10.3 12.7l-.99-.99a1 1 0 10-1.41 1.41l1.7 1.7a1 1 0 001.41 0l4.1-4.1a1 1 0 10-1.41-1.41l-3.4 3.39z" />
    </svg>
  );
}

export default function CustomerNavbar() {
  const { user, logout } = useAuth() || {};
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [tab, setTab] = useState("profile"); // profile | password
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // ฟอร์มโปรไฟล์
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: user?.email || "",
  });

  // ฟอร์มรหัสผ่าน
  const [pwd, setPwd] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  // เปิด/ปิด modal
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // โหลดข้อมูลโปรไฟล์ลูกค้าปัจจุบัน
  async function loadMe() {
    try {
      const r = await api.get("/customer/me");
      const me = r.data?.user || {};
      const cp = me.customerProfile || {};
      setProfile({
        firstName: cp.firstName || "",
        lastName: cp.lastName || "",
        phone: cp.phone || "",
        email: me.email || "",
      });
    } catch (e) {
      // เงียบไว้ก็ได้
    }
  }

  function initialFromEmail(email) {
    return (email?.[0] || "U").toUpperCase();
  }

  async function onSaveProfile() {
    setSaving(true);
    setMsg("");
    try {
      await api.patch("/customer/me/profile", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
      setMsg("บันทึกเรียบร้อย");
    } catch (e) {
      setMsg(e?.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword() {
    if (!pwd.new_password || pwd.new_password.length < 8) {
      setMsg("รหัสผ่านใหม่ควรมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (pwd.new_password !== pwd.confirm_password) {
      setMsg("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await api.patch("/customer/me/password", {
        old_password: pwd.old_password,
        new_password: pwd.new_password,
        confirm_password: pwd.confirm_password,
      });
      setMsg("เปลี่ยนรหัสผ่านสำเร็จ");
      setPwd({ old_password: "", new_password: "", confirm_password: "" });
    } catch (e) {
      setMsg(e?.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const displayEmail = user?.email || profile.email;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/10">
        <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/customer/warranties" className="flex items-center gap-2">
            <ShieldLogo className="w-7 h-7" />
            <span className="text-xl font-semibold text-gray-900">Warranty</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-sm border border-amber-200"
              disabled
              title="การแจ้งเตือน (เร็ว ๆ นี้)"
            >
              🔔 การแจ้งเตือน
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2 py-1 text-sm text-blue-700 border border-blue-200"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                  {initialFromEmail(displayEmail)}
                </span>
                <span className="hidden sm:inline">{displayEmail}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-black/10 bg-white shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/5">
                    <div className="text-sm text-gray-600">เข้าสู่ระบบเป็น</div>
                    <div className="font-medium text-gray-900 truncate">{displayEmail}</div>
                  </div>
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50"
                    onClick={async () => {
                      setTab("profile");
                      await loadMe();
                      setMsg("");
                      setOpenModal(true);
                      setMenuOpen(false);
                    }}
                  >
                    ตั้งค่าโปรไฟล์
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50"
                    onClick={() => {
                      setTab("password");
                      setMsg("");
                      setOpenModal(true);
                      setMenuOpen(false);
                    }}
                  >
                    เปลี่ยนรหัสผ่าน
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50"
                    onClick={async () => {
                      try { await logout?.(); } finally { navigate("/signin", { replace: true }); }
                    }}
                  >
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Modal โปรไฟล์/รหัสผ่าน */}
      {openModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="text-lg font-semibold">เปลี่ยนรูปโปรไฟล์</div>
              <button onClick={() => setOpenModal(false)}>✕</button>
            </div>

            <div className="mt-3">
              <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 p-1">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm ${tab === "profile" ? "bg-white border border-gray-300 shadow" : ""}`}
                  onClick={() => setTab("profile")}
                >
                  ข้อมูลส่วนตัว
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm ${tab === "password" ? "bg-white border border-gray-300 shadow" : ""}`}
                  onClick={() => setTab("password")}
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>

              {tab === "profile" ? (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <div className="text-gray-600">ชื่อ</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      />
                    </label>
                    <label className="text-sm">
                      <div className="text-gray-600">นามสกุล</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      />
                    </label>
                    <label className="col-span-2 text-sm">
                      <div className="text-gray-600">อีเมล</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-gray-100"
                        value={profile.email}
                        disabled
                      />
                    </label>
                    <label className="col-span-2 text-sm">
                      <div className="text-gray-600">เบอร์โทรศัพท์</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </label>
                  </div>

                  {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

                  <div className="flex justify-end">
                    <button
                      onClick={onSaveProfile}
                      disabled={saving}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-white"
                    >
                      {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <label className="text-sm">
                    <div className="text-gray-600">รหัสผ่านเก่า</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                      type="password"
                      value={pwd.old_password}
                      onChange={(e) => setPwd({ ...pwd, old_password: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    <div className="text-gray-600">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                      type="password"
                      value={pwd.new_password}
                      onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    <div className="text-gray-600">ยืนยันรหัสผ่าน</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                      type="password"
                      value={pwd.confirm_password}
                      onChange={(e) => setPwd({ ...pwd, confirm_password: e.target.value })}
                    />
                  </label>

                  {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">{msg}</div>}

                  <div className="flex justify-end">
                    <button
                      onClick={onChangePassword}
                      disabled={saving}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-white"
                    >
                      {saving ? "กำลังยืนยัน..." : "ยืนยัน"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
