// src/pages/SignUp.jsx
// เวอร์ชันเต็ม: ฟอร์มสมัครสมาชิก ลูกค้า/ร้านค้า + ตรวจสอบรหัสผ่าน + ส่ง API
// [อัปเดต] **ตัดโค้ดไอคอนตาออกทั้งหมด 100%** ตามคำขอ

import { useEffect, useRef, useState, forwardRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

/* ---------------------------------------------
 * ICONS (เส้นบาง โทนเทา)
 * -------------------------------------------*/
const Icon = {
  user: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0116 0" />
    </svg>
  ),
  mail: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 6h16v12H4z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  ),
  phone: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.18 2 2 0 014 2h3a2 2 0 012 1.72c.12.9.3 1.78.57 2.63a2 2 0 01-.45 2.11L8.1 9.9a16 16 0 006 6l1.44-1.02a2 2 0 012.11-.45 19 19 0 002.63.57A2 2 0 0122 16.92z" />
    </svg>
  ),
  lock: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  ),
  home: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 10l9-7 9 7" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  clock: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  ),
  // Icon.eye และ Icon.eyeOff ถูกลบออกทั้งหมด
};

/* ---------------------------------------------
 * INPUT (with left/right icon slots)
 * -------------------------------------------*/
const InputIcon = forwardRef(function InputIcon(
  // รับ type เข้ามา แต่เราจะใช้ type="password" ตรงๆ ใน JSX
  { left, right, onRightClick, className = "", invalid = false, ...props }, 
  ref
) {
  // กำหนด padding ด้านขวา (pr-10) เมื่อมีไอคอน right ถูกส่งเข้ามาเท่านั้น
  // เนื่องจาก right จะเป็น {null} ในช่องรหัสผ่าน จึงไม่มี pr-10
  const rightPadding = right ? "pr-10 " : "";

  return (
    <div className="relative">
      {/* ไอคอนซ้าย */}
      {left && <span className="absolute left-3 top-1/2 -translate-y-1/2">{left}</span>}

      {/* ช่องกรอก */}
      <input
        ref={ref}
        {...props}
        className={
          "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 transition " +
          (left ? "pl-10 " : "") +
          rightPadding + 
          (invalid ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-500") +
          " " +
          className
        }
      />

      {/* ปุ่มไอคอนขวา */}
      {right && (
        <button
          type="button"
          onClick={onRightClick}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 active:scale-95 transition"
          tabIndex={-1}
        >
          {right}
        </button>
      )}
    </div>
  );
});

const TextareaIcon = forwardRef(function TextareaIcon(
  { left, className = "", invalid = false, ...props },
  ref
) {
  return (
    <div className="relative">
      {left ? <span className="absolute left-3 top-3">{left}</span> : null}
      <textarea
        ref={ref}
        {...props}
        className={
          "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 " +
          (left ? "pl-10 " : "") +
          (invalid ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-blue-500") +
          " " +
          className
        }
      />
    </div>
  );
});

/* ---------------------------------------------
 * Tabs (ลูกค้า/ร้านค้า)
 * -------------------------------------------*/
function Tabs({ value, onChange }) {
  const Btn = ({ val, label, icon }) => {
    const selected = value === val;
    return (
      <button
        type="button"
        onClick={() => onChange(val)}
        className={
          "h-9 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-medium transition " +
          (selected ? "bg-white border border-gray-300 shadow text-gray-900" : "text-gray-800")
        }
        aria-pressed={selected}
      >
        <span className="text-gray-800">{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <div className="inline-flex items-center bg-gray-200 rounded-2xl border border-gray-300 p-1 shadow-inner">
      <Btn
        val="customer"
        label="ลูกค้า"
        icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0116 0" /></svg>}
      />
      <Btn
        val="store"
        label="ร้านค้า"
        icon={<svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10l9-7 9 7" /><path d="M9 22V12h6v10" /></svg>}
      />
    </div>
  );
}

/* ---------------------------------------------
 * MAIN: SignUp
 * -------------------------------------------*/
export default function Signup() {
  const [params] = useSearchParams();
  const initial = params.get("role") === "store" ? "store" : "customer";
  const [tab, setTab] = useState(initial);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // password states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // **State showPwd และ showPwd2 ถูกลบออกแล้ว**

  // other states
  const [consent, setConsent] = useState(false);
  const [pwError, setPwError] = useState("");
  const confirmRef = useRef(null);

  // reset เมื่อสลับ tab
  useEffect(() => {
    setPassword("");
    setConfirmPassword("");
    setPwError("");
    setConsent(false);
    // **ไม่มีการ reset showPwd/showPwd2 แล้ว**
  }, [tab]);

  // validate password/confirm
  useEffect(() => {
    let msg = "";
    if (password && password.length < 8) msg = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    else if (confirmPassword && password !== confirmPassword) msg = "รหัสผ่านไม่ตรงกัน";
    setPwError(msg);
    if (confirmRef.current) confirmRef.current.setCustomValidity(msg);
  }, [password, confirmPassword]);

  const canSubmit =
    !submitting &&
    consent &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  /* ----------------------
   * SUBMIT: CUSTOMER
   * --------------------*/
  async function onSubmitCustomer(e) {
    e.preventDefault();
    if (!canSubmit) {
      e.currentTarget.reportValidity();
      if (confirmRef.current) confirmRef.current.focus();
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      password,
      confirmPassword,
      isConsent: !!fd.get("consent"),
    };
    try {
      await api.post("/auth/register/customer", payload);
      navigate("/signin");
    } catch (err) {
      alert(err?.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  /* ----------------------
   * SUBMIT: STORE
   * --------------------*/
  async function onSubmitStore(e) {
    e.preventDefault();
    if (!canSubmit) {
      e.currentTarget.reportValidity();
      if (confirmRef.current) confirmRef.current.focus();
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      storeName: fd.get("storeName"),
      typeStore: fd.get("typeStore"),
      ownerStore: fd.get("ownerStore"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      address: fd.get("address"),
      timeAvailable: fd.get("timeAvailable"),
      password,
      confirmPassword,
      isConsent: !!fd.get("consent"),
    };
    try {
      await api.post("/auth/register/store", payload);
      navigate("/signin");
    } catch (err) {
      alert(err?.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#eaf3ff] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-2xl border border-black/5 p-8">
          {/* Header */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 shadow flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-600" fill="currentColor" aria-hidden="true">
                <path d="M12 2l7 3v7c0 5-3.6 8.4-7 9-3.4-.6-7-4-7-9V5l7-3z" />
                <path fill="#fff" d="M10.3 12.7l-.99-.99-1.41 1.41 1.7 1.7a1 1 0 001.41 0l4.1-4.1-1.41-1.41-3.4 3.39z" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-gray-900">สมัครสมาชิก</h1>
            <p className="text-gray-600 text-sm">เลือกประเภทบัญชีที่ต้องการสมัคร</p>
            <div className="mt-4">
              <Tabs value={tab} onChange={setTab} />
            </div>
          </div>

          {/* ===================== CUSTOMER FORM ===================== */}
          {tab === "customer" ? (
            <form onSubmit={onSubmitCustomer} className="mt-6 space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700">ชื่อ</span>
                  <InputIcon name="firstName" placeholder="ชื่อผู้ใช้" required left={Icon.user()} />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700">นามสกุล</span>
                  <InputIcon name="lastName" placeholder="นามสกุล" required left={Icon.user()} />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">อีเมล</span>
                <InputIcon name="email" type="email" placeholder="กรอกอีเมลของคุณ" required left={Icon.mail()} />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</span>
                <InputIcon name="phone" placeholder="กรอกเบอร์โทรศัพท์" required left={Icon.phone()} />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">รหัสผ่าน</span>
                <InputIcon
                  name="password"
                  type="password" // กำหนดเป็น password เสมอ
                  minLength={8}
                  placeholder="กรอกรหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  left={Icon.lock()}
                  right={null} // ตัดไอคอนตาออก
                  invalid={!!pwError && password.length < 8}
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">ยืนยันรหัสผ่าน</span>
                <InputIcon
                  ref={confirmRef}
                  name="confirmPassword"
                  type="password" // กำหนดเป็น password เสมอ
                  minLength={8}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  left={Icon.lock()}
                  right={null} // ตัดไอคอนตาออก
                  invalid={!!pwError && password !== confirmPassword}
                />
                {pwError ? <p className="mt-1 text-sm text-red-600">{pwError}</p> : null}
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                  required
                />
                ฉันยอมรับเงื่อนไขในการเข้าใช้งาน
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 font-medium shadow"
              >
                {submitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </button>

              <p className="text-center text-sm text-gray-600">
                มีบัญชีอยู่แล้ว?{" "}
                <Link to="/signin" className="text-blue-600 hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </form>
          ) : (
            /* ===================== STORE FORM ===================== */
            <form onSubmit={onSubmitStore} className="mt-6 space-y-4" noValidate>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">ชื่อร้านค้า</span>
                <InputIcon name="storeName" placeholder="ชื่อร้านค้า" required left={Icon.home()} />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">ประเภทร้านค้า</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">{Icon.home()}</span>
                  <select
                    name="typeStore"
                    className="mt-1 w-full h-10 rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>เลือกประเภทร้านค้า</option>
                      <option value="electronics">อิเล็กทรอนิกส์</option>
                      <option value="appliance">เครื่องใช้ไฟฟ้า</option>
                      <option value="furniture">เฟอร์นิเจอร์</option>
                      <option value="automotive">ยานยนต์</option>
                      <option value="machine">เครื่องจักร / เครื่องมือช่าง</option>
                      <option value="other">อื่น ๆ</option>
                  </select>
                </div>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">ชื่อเจ้าของร้าน</span>
                <InputIcon name="ownerStore" placeholder="ชื่อเจ้าของร้าน" required left={Icon.user()} />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">อีเมล</span>
                <InputIcon name="email" type="email" placeholder="กรอกอีเมลของคุณ" required left={Icon.mail()} />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</span>
                <InputIcon name="phone" placeholder="กรอกเบอร์โทรศัพท์" required left={Icon.phone()} />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">ที่อยู่ร้าน</span>
                <TextareaIcon name="address" placeholder="ที่อยู่ร้าน" required left={Icon.home()} />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">เวลาทำการ</span>
                <TextareaIcon name="timeAvailable" placeholder="เช่น 9:00-18:00" required left={Icon.clock()} />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">รหัสผ่าน</span>
                <InputIcon
                  name="password"
                  type="password" // กำหนดเป็น password เสมอ
                  minLength={8}
                  placeholder="กรอกรหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  left={Icon.lock()}
                  right={null} // ตัดไอคอนตาออก
                  invalid={!!pwError && password.length < 8}
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700">ยืนยันรหัสผ่าน</span>
                <InputIcon
                  ref={confirmRef}
                  name="confirmPassword"
                  type="password" // กำหนดเป็น password เสมอ
                  minLength={8}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  left={Icon.lock()}
                  right={null} // ตัดไอคอนตาออก
                  invalid={!!pwError && password !== confirmPassword}
                />
                {pwError ? <p id="pw-help-store" className="mt-1 text-sm text-red-600">{pwError}</p> : null}
              </label>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                  required
                />
                ฉันยอมรับเงื่อนไขในการเข้าใช้งาน
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 font-medium shadow"
              >
                {submitting ? "กำลังสมัคร..." : "สมัครสมาชิก ร้านค้า"}
              </button>

              <p className="text-center text-sm text-gray-600">
                มีบัญชีอยู่แล้ว?{" "}
                <Link to="/signin" className="text-blue-600 hover:underline">เข้าสู่ระบบ</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}