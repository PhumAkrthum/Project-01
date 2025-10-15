import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

/**
 * CustomerProfileModal
 * - แท็บ: ข้อมูลส่วนตัว | เปลี่ยนรหัสผ่าน
 * - Prefill อัตโนมัติจาก /auth/me (user.customerProfile)
 * - PATCH /customer/profile  (หรือ /customer/:id/profile ถ้าแบ็กเอนด์คุณใช้ :id)
 * - POST  /customer/change-password (หรือ /customer/:id/change-password)
 *
 * ใช้:
 * <CustomerProfileModal open={open} onClose={()=>setOpen(false)} />
 */
export default function CustomerProfileModal({ open, onClose }) {
  const { user } = useAuth(); // เก็บ token/role จาก Context
  const [tab, setTab] = useState("info"); // 'info' | 'password'
  const [loading, setLoading] = useState(false);

  // ---- ฟอร์ม ข้อมูลส่วนตัว ----
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");

  // ---- ฟอร์ม เปลี่ยนรหัสผ่าน ----
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew,  setConfirmNew]  = useState("");

  const canSaveInfo = useMemo(() => {
    return (firstName?.trim() || lastName?.trim() || email?.trim() || phone?.trim());
  }, [firstName, lastName, email, phone]);

  const canChangePw = useMemo(() => {
    return oldPassword && newPassword?.length >= 8 && newPassword === confirmNew;
  }, [oldPassword, newPassword, confirmNew]);

  useEffect(() => {
    if (!open) return;
    // ดึงข้อมูล user + customerProfile เพื่อ prefill
    (async () => {
      try {
        const { data } = await api.get("/auth/me"); // สมมติ backend คืน { user: {..., customerProfile:{...}} }
        const u = data?.user || {};
        const cp = u?.customerProfile || {};
        setFirstName(cp.firstName || "");
        setLastName(cp.lastName || "");
        setEmail(u.email || "");
        setPhone(cp.phone || "");
      } catch (err) {
        console.error("fetch /auth/me error", err);
        alert("ดึงข้อมูลโปรไฟล์ไม่สำเร็จ");
      }
    })();
  }, [open]);

  if (!open) return null;

  // helper: เลือก endpoint ให้เข้ากับแบ็กเอนด์ของคุณ
  const endpoints = {
    profile: "/customer/profile",               // ถ้าแบ็กเอนด์คุณใช้ /customer/:id/profile ให้เปลี่ยนตรงนี้
    changePassword: "/customer/change-password" // ถ้าแบ็กเอนด์คุณใช้ /customer/:id/change-password ให้เปลี่ยนตรงนี้
  };

  const onSaveInfo = async () => {
    if (!canSaveInfo) return;
    setLoading(true);
    try {
      await api.patch(endpoints.profile, {
        firstName: firstName?.trim(),
        lastName : lastName?.trim(),
        email    : email?.trim(),   // ถ้าแบ็กเอนด์ไม่อนุญาตแก้ email ให้เอาออก
        phone    : phone?.trim(),
      });
      alert("บันทึกข้อมูลส่วนตัวสำเร็จ");
      onClose?.();
    } catch (err) {
      console.error("PATCH profile error", err);
      const msg = err?.response?.data?.message || "บันทึกข้อมูลไม่สำเร็จ";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const onChangePassword = async () => {
    if (!canChangePw) return;
    setLoading(true);
    try {
      await api.post(endpoints.changePassword, {
        oldPassword,
        newPassword,
      });
      alert("เปลี่ยนรหัสผ่านสำเร็จ");
      onClose?.();
    } catch (err) {
      console.error("change password error", err);
      const msg = err?.response?.data?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="text-lg font-semibold">เปลี่ยนรูปโปรไฟล์</div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="close">
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
                  <input className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                         value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="ชื่อ" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">นามสกุล</label>
                  <input className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                         value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="นามสกุล" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">อีเมล</label>
                <input className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                       value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">เบอร์โทรศัพท์</label>
                <input className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                       value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xxxxxxxx" />
              </div>
            </div>
          )}

          {tab === "password" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600">รหัสผ่านเก่า</label>
                <input type="password" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                       value={oldPassword} onChange={e=>setOldPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
                <input type="password" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                       value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">ยืนยันรหัสผ่านใหม่</label>
                <input type="password" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                       value={confirmNew} onChange={e=>setConfirmNew(e.target.value)} placeholder="••••••••" />
                {newPassword && confirmNew && newPassword !== confirmNew && (
                  <p className="pt-1 text-sm text-rose-600">รหัสผ่านใหม่และยืนยันไม่ตรงกัน</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b-2xl bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 hover:bg-gray-200">ยกเลิก</button>
          {tab === "info" ? (
            <button
              disabled={!canSaveInfo || loading}
              onClick={onSaveInfo}
              className={`rounded-xl px-4 py-2 text-white ${(!canSaveInfo || loading) ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          ) : (
            <button
              disabled={!canChangePw || loading}
              onClick={onChangePassword}
              className={`rounded-xl px-4 py-2 text-white ${(!canChangePw || loading) ? "bg-emerald-300" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {loading ? "กำลังยืนยัน..." : "ยืนยัน"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
