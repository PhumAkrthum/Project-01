import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

/* โลโก้เล็ก ๆ */
function ShieldLogo({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path
        fill="url(#g2)"
        d="M12 2c.3 0 .6.06.88.18l6.62 2.65c.3.12.5.41.5.74V12c0 4.52-2.88 8.77-7.39 10.24a1.1 1.1 0 0 1-.7 0C6.5 20.77 3.6 16.52 3.6 12V5.57c0-.33.2-.62.5-.74l6.62-2.65C11.4 2.06 11.7 2 12 2z"
      />
    </svg>
  );
}

export default function CustomerNavbar() {
  const { user, logout, loadMe } = useAuth();
  const navigate = useNavigate();

  // dropdown
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // modal
  const [openModal, setOpenModal] = useState(false);
  const [tab, setTab] = useState("info"); // info | password
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

  // โหลดข้อมูลโปรไฟล์ลูกค้าปัจจุบัน → ใช้ /auth/me
  async function loadProfile() {
    try {
      const r = await api.get("/auth/me");
      const me = r.data?.user || r.data || {};
      const cp = me.customerProfile || {};
      setProfile({
        firstName: cp.firstName || "",
        lastName: cp.lastName || "",
        phone: cp.phone || "",
        email: me.email || "",
      });
    } catch {
      // เงียบไว้ก็ได้
    }
  }

  // เปิดโมดัลแล้ว prefill
  useEffect(() => {
    if (!openModal) return;
    setMsg("");
    setTab("info");
    loadProfile();
  }, [openModal]);

  function initialFromEmail(email) {
    return (email?.[0] || "U").toUpperCase();
  }

  /* ========= Actions ========= */

  async function onSaveProfile() {
    setSaving(true);
    setMsg("");
    try {
      // ✅ ใช้ endpoint ที่ backend มีอยู่
      await api.patch("/customer/profile", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        // ถ้า backend อนุญาตแก้ email ค่อยส่ง, ไม่งั้นตัดออก
        // email: profile.email,
      });
      setMsg("บันทึกข้อมูลส่วนตัวสำเร็จ");
      await loadMe();         // sync user ใน global state
      setOpenModal(false);
    } catch (e) {
      setMsg(e?.response?.data?.message || "บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword() {
    if (!pwd.old_password || !pwd.new_password) {
      setMsg("กรอกข้อมูลให้ครบ");
      return;
    }
    if (pwd.new_password.length < 8) {
      setMsg("รหัสผ่านใหม่ต้องอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (pwd.new_password !== pwd.confirm_password) {
      setMsg("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      // ✅ ใช้ endpoint ที่ backend มีอยู่
      await api.patch("/customer/change-password", {
        old_password: pwd.old_password,
        new_password: pwd.new_password,
      });
      setMsg("เปลี่ยนรหัสผ่านสำเร็จ");
      setOpenModal(false);
      setPwd({ old_password: "", new_password: "", confirm_password: "" });
    } catch (e) {
      setMsg(e?.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function onLogout() {
    logout();
    navigate("/signin");
  }

  const displayEmail = user?.email || profile.email;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/10">
        <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/customer/warranties" className="flex items-center gap-2">
            <ShieldLogo className="w-7 h-7" />
            <span className="text-xl font-semibold">Warranty</span>
          </Link>

          <div className="flex items-center gap-3" ref={menuRef}>
            <div className="text-sm text-gray-600 hidden sm:block">{displayEmail}</div>
            <button
              onClick={() => setOpenMenu((v) => !v)}
              className="relative w-9 h-9 grid place-items-center rounded-full bg-sky-600 text-white shadow"
              title="บัญชีของฉัน"
            >
              <span className="font-semibold">{initialFromEmail(displayEmail)}</span>
            </button>

            {openMenu && (
              <div className="absolute right-4 top-14 w-64 rounded-2xl border border-black/10 bg-white shadow-xl">
                <div className="px-4 py-3 border-b border-black/5">
                  <div className="text-sm font-semibold">{displayEmail}</div>
                  <div className="text-xs text-gray-500">ลูกค้า</div>
                </div>
                <button
                  onClick={() => { setOpenMenu(false); setOpenModal(true); }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
                >
                  ✏️ แก้ไขโปรไฟล์
                </button>
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"
                >
                  ↩️ ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenModal(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5">
              <div className="text-lg font-semibold">แก้ไขข้อมูลโปรไฟล์</div>
              <button onClick={() => setOpenModal(false)} className="rounded-full p-2 hover:bg-gray-100" aria-label="close">
                <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setTab("info")}
                  className={`rounded-xl px-4 py-2 text-sm ${tab === "info" ? "bg-gray-200 font-semibold" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  ข้อมูลส่วนตัว
                </button>
                <button
                  onClick={() => setTab("password")}
                  className={`rounded-xl px-4 py-2 text-sm ${tab === "password" ? "bg-green-100 font-semibold" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {tab === "info" && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">ชื่อ</label>
                      <input
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                        value={profile.firstName}
                        onChange={(e) => setProfile((s) => ({ ...s, firstName: e.target.value }))}
                        placeholder="ชื่อ"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">นามสกุล</label>
                      <input
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                        value={profile.lastName}
                        onChange={(e) => setProfile((s) => ({ ...s, lastName: e.target.value }))}
                        placeholder="นามสกุล"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">อีเมล</label>
                    <input
                      disabled
                      className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
                      value={profile.email}
                      onChange={(e) => setProfile((s) => ({ ...s, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">อีเมลแก้ไขได้ในภายหลังถ้าระบบอนุญาต</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">เบอร์โทรศัพท์</label>
                    <input
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      value={profile.phone}
                      onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="08xxxxxxxx"
                    />
                  </div>
                </div>
              )}

              {tab === "password" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">รหัสผ่านเก่า</label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      value={pwd.old_password}
                      onChange={(e) => setPwd((s) => ({ ...s, old_password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      value={pwd.new_password}
                      onChange={(e) => setPwd((s) => ({ ...s, new_password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">ยืนยันรหัสผ่านใหม่</label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      value={pwd.confirm_password}
                      onChange={(e) => setPwd((s) => ({ ...s, confirm_password: e.target.value }))}
                      placeholder="••••••••"
                    />
                    {pwd.new_password && pwd.confirm_password && pwd.new_password !== pwd.confirm_password && (
                      <p className="pt-1 text-sm text-rose-600">รหัสผ่านใหม่และยืนยันไม่ตรงกัน</p>
                    )}
                  </div>
                </div>
              )}

              {msg && <div className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">{msg}</div>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 rounded-b-2xl bg-gray-50 px-6 py-4">
              <button onClick={() => setOpenModal(false)} className="rounded-xl px-4 py-2 hover:bg-gray-200">ยกเลิก</button>
              {tab === "info" ? (
                <button
                  disabled={saving}
                  onClick={onSaveProfile}
                  className={`rounded-xl px-4 py-2 text-white ${saving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              ) : (
                <button
                  disabled={saving}
                  onClick={onChangePassword}
                  className={`rounded-xl px-4 py-2 text-white ${saving ? "bg-emerald-300" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  {saving ? "กำลังยืนยัน..." : "ยืนยัน"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
