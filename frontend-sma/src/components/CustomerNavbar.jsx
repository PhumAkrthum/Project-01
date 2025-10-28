// frontend-sma/src/components/CustomerNavbar.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import AppLogo from "../components/AppLogo"; // ✅ ใช้โลโก้จริง

export default function CustomerNavbar() {
  const { user, logout, loadMe } = useAuth();
  const navigate = useNavigate();

  // dropdown โปรไฟล์ & แจ้งเตือน
  const [openMenu, setOpenMenu] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  // 🔔 การแจ้งเตือน
  const [notifications, setNotifications] = useState([
    { id: 1, message: "ใบรับประกัน WR002 ใกล้หมดอายุ", type: "warning", read: false },
    { id: 2, message: "ใบรับประกัน WR001 หมดอายุแล้ว", type: "expired", read: false },
  ]);

  // 🟦 นับเฉพาะที่ยังไม่อ่าน
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ✅ ทำเครื่องหมายว่าอ่านแล้ว
  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setOpenNotif(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // modal โปรไฟล์
  const [openModal, setOpenModal] = useState(false);
  const [tab, setTab] = useState("info");
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
    } catch {}
  }

  useEffect(() => {
    if (!openModal) return;
    setMsg("");
    setTab("info");
    loadProfile();
  }, [openModal]);

  function initialFromEmail(email) {
    return (email?.[0] || "U").toUpperCase();
  }

  async function onSaveProfile() {
    setSaving(true);
    setMsg("");
    try {
      await api.patch("/customer/profile", {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
      });
      setMsg("บันทึกข้อมูลส่วนตัวสำเร็จ");
      await loadMe();
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
      <header className="sticky top-0 z-30 border-b border-sky-200 bg-sky-50/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* --- โลโก้ฝั่งซ้าย --- */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-sky-100">
              <AppLogo className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold text-sky-900">Warranty</div>
              <div className="text-xs text-slate-500">
                จัดการการรับประกันของคุณได้ในที่เดียว
              </div>
            </div>
          </Link>

          {/* --- ขวา: แจ้งเตือน + โปรไฟล์ --- */}
          <div className="flex items-center gap-3">
            {/* 🔔 ปุ่มแจ้งเตือน */}
            <div className="relative" ref={notifRef}>
              <button
                title="การแจ้งเตือน"
                onClick={() => {
                  setOpenNotif((v) => !v);
                  if (!openNotif) markAllAsRead();
                }}
                className="grid h-9 w-9 place-items-center rounded-full bg-white shadow ring-1 ring-sky-100 text-sky-600 hover:bg-sky-50 transition"
              >
                <span className="text-lg">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown แจ้งเตือน */}
              {openNotif && (
                <div className="absolute right-0 top-12 w-72 rounded-2xl border border-sky-100 bg-white shadow-xl overflow-hidden z-[1200]">
                  <div className="flex items-center justify-between border-b border-sky-50 bg-sky-50/60 px-4 py-2 text-sm font-semibold text-sky-800">
                    <span>การแจ้งเตือน</span>
                    <button
                      onClick={markAllAsRead}
                      className="text-sky-600 hover:underline text-xs font-normal"
                    >
                      ทำเครื่องหมายว่าอ่านแล้ว
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500 text-center">
                        ไม่มีการแจ้งเตือน
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 text-sm border-b last:border-0 transition ${
                            n.type === "warning"
                              ? "bg-amber-50 text-amber-800"
                              : n.type === "expired"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-white text-slate-700"
                          } ${n.read ? "opacity-70" : "font-semibold"}`}
                        >
                          {n.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 🧍 กล่องโปรไฟล์ */}
            <div
              ref={menuRef}
              onClick={() => setOpenMenu((v) => !v)}
              className="flex cursor-pointer items-center gap-3 rounded-full bg-sky-100 px-3 py-1.5 shadow ring-1 ring-slate-100 hover:bg-sky-200 transition"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-sky-500 text-white text-lg font-semibold shadow">
                {initialFromEmail(displayEmail)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-slate-800">
                  {user?.firstName
                    ? `${user.firstName} ${user.lastName || ""}`
                    : "บัญชีของฉัน"}
                </div>
                <div className="text-xs text-slate-500">{displayEmail}</div>
              </div>
              <svg
                className="h-4 w-4 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Dropdown โปรไฟล์ */}
            {openMenu && (
              <div className="absolute right-4 top-14 w-64 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xl">
                <div className="border-b border-sky-50 bg-sky-50/40 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-800">
                    {displayEmail}
                  </div>
                  <div className="text-xs text-slate-500">ลูกค้า</div>
                </div>
                <button
                  onClick={() => {
                    setOpenMenu(false);
                    setOpenModal(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 hover:bg-sky-50"
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

      {/* Modal โปรไฟล์ */}
      {openModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpenModal(false)}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-4 text-white">
              <div className="text-base font-semibold">แก้ไขข้อมูลโปรไฟล์</div>
              <button
                onClick={() => setOpenModal(false)}
                className="rounded-full p-2 text-white/80 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTab("info")}
                  className={`rounded-xl px-4 py-2 text-sm ${
                    tab === "info"
                      ? "bg-sky-100 text-sky-800 font-semibold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ข้อมูลส่วนตัว
                </button>
                <button
                  onClick={() => setTab("password")}
                  className={`rounded-xl px-4 py-2 text-sm ${
                    tab === "password"
                      ? "bg-emerald-100 text-emerald-800 font-semibold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
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
                      <label className="mb-1 block text-sm text-slate-600">
                        ชื่อ
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        value={profile.firstName}
                        onChange={(e) =>
                          setProfile((s) => ({
                            ...s,
                            firstName: e.target.value,
                          }))
                        }
                        placeholder="ชื่อ"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-600">
                        นามสกุล
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        value={profile.lastName}
                        onChange={(e) =>
                          setProfile((s) => ({
                            ...s,
                            lastName: e.target.value,
                          }))
                        }
                        placeholder="นามสกุล"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      อีเมล
                    </label>
                    <input
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500"
                      value={profile.email}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile((s) => ({ ...s, phone: e.target.value }))
                      }
                      placeholder="08xxxxxxxx"
                    />
                  </div>
                </div>
              )}

              {tab === "password" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      รหัสผ่านเก่า
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      value={pwd.old_password}
                      onChange={(e) =>
                        setPwd((s) => ({ ...s, old_password: e.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      value={pwd.new_password}
                      onChange={(e) =>
                        setPwd((s) => ({ ...s, new_password: e.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-600">
                      ยืนยันรหัสผ่านใหม่
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      value={pwd.confirm_password}
                      onChange={(e) =>
                        setPwd((s) => ({
                          ...s,
                          confirm_password: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                    />
                    {pwd.new_password &&
                      pwd.confirm_password &&
                      pwd.new_password !== pwd.confirm_password && (
                        <p className="pt-1 text-sm text-rose-600">
                          รหัสผ่านใหม่และยืนยันไม่ตรงกัน
                        </p>
                      )}
                  </div>
                </div>
              )}

              {msg && (
                <div className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  {msg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setOpenModal(false)}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-600 shadow ring-1 ring-black/10 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              {tab === "info" ? (
                <button
                  disabled={saving}
                  onClick={onSaveProfile}
                  className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow ${
                    saving
                      ? "bg-sky-300"
                      : "bg-sky-600 hover:bg-sky-500 hover:-translate-y-0.5"
                  } transition`}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              ) : (
                <button
                  disabled={saving}
                  onClick={onChangePassword}
                  className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow ${
                    saving
                      ? "bg-emerald-300"
                      : "bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-0.5"
                  } transition`}
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
