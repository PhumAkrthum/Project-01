// frontend-sma/src/pages/SignIn.jsx
import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

/* ===== ICONS (เทา) ===== */
const Icon = {
  mail: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16v12H4z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  ),
  lock: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  ),
  eye: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (cls = "w-5 h-5") => (
    <svg viewBox="0 0 24 24" className={`${cls} text-gray-400`} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.62 21.62 0 01-3.34 4.26M1 1l22 22" />
      <path d="M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88" />
    </svg>
  ),
};

function InputIcon({ left, right, className = "", ...props }) {
  return (
    <div className="relative">
      {left ? <span className="absolute left-3 top-1/2 -translate-y-1/2">{left}</span> : null}
      <input
        {...props}
        className={
          "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 " +
          (left ? "pl-10 " : "") +
          (right ? "pr-10 " : "") +
          className
        }
      />
      {right ? <span className="absolute right-3 top-1/2 -translate-y-1/2">{right}</span> : null}
    </div>
  );
}

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
      >
        <span className="text-gray-800">{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <div className="inline-flex items-center bg-gray-200 rounded-2xl border border-gray-300 p-1 shadow-inner">
      <Btn val="customer" label="ลูกค้า" icon={
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0116 0" />
        </svg>
      }/>
      <Btn val="store" label="ร้านค้า" icon={
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 10l9-7 9 7" /><path d="M9 22V12h6v10" />
        </svg>
      }/>
    </div>
  );
}

// helper: ถอด payload จาก JWT เพื่ออ่าน role
function decodeRoleFromToken(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json);
    return payload?.role || null;
  } catch {
    return null;
  }
}

export default function SignIn() {
  const [params] = useSearchParams();
  const initial = params.get("role") === "store" ? "store" : "customer";
  const [tab, setTab] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth?.() ?? { setToken: () => {} };
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    const q = params.get("role");
    if (q === "customer" || q === "store") setTab(q);
  }, [params]);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = { email: fd.get("email"), password: fd.get("password") };
    try {
      const { data } = await api.post("/auth/login", payload);
      const token = data?.token;
      if (!token) {
        setError("เข้าสู่ระบบไม่สำเร็จ: ไม่พบโทเคน");
        setSubmitting(false);
        return;
      }

      // เก็บ token และตั้ง header ให้ทุกคำขอถัดไป
      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      if (setToken) setToken(token);

      // ✅ บังคับแยกฝั่ง: role ที่ JWT vs แท็บที่ผู้ใช้เลือก
      const role = decodeRoleFromToken(token); // เช่น "STORE" หรือ "CUSTOMER"
      const expected = tab === "store" ? "STORE" : "CUSTOMER";
      if (role !== expected) {
        // เคลียร์ token และแจ้งว่าไม่พบบัญชีทางฝั่งนี้
        localStorage.removeItem("token");
        delete api.defaults.headers.common["Authorization"];
        setError("ไม่พบบัญชีทางฝั่งนี้ (บัญชีนี้เป็นของอีกฝั่ง)");
        setSubmitting(false);
        return;
      }

      // ถ้ามีเส้นทางจากหน้าเดิม ให้กลับไปที่นั่นก่อน
      let redirectTo = location.state?.from?.pathname || null;

      // ถ้าไม่มี ให้พาไปตาม role
      if (!redirectTo) {
        redirectTo = role === "STORE" ? "/dashboard/warranty" : "/";
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const body = err?.response?.data || {};

      // ถ้ายังไม่ verify -> ส่งไปหน้า verify email
      if (status === 403 && body?.needsVerify) {
        const verifyUrl = body?.verifyUrl; // dev mode อาจมี
        const q = new URLSearchParams();
        q.set("email", payload.email || "");
        if (verifyUrl) q.set("preview", verifyUrl);
        navigate(`/verify-email?${q.toString()}`, { replace: true });
        setSubmitting(false);
        return;
      }
      setError(body?.message || err?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#eaf3ff] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-2xl border border-black/5 p-8">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 shadow flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-600" fill="currentColor">
                <path d="M12 2l7 3v7c0 5-3.6 8.4-7 9-3.4-.6-7-4-7-9V5l7-3z" />
                <path fill="#fff" d="M10.3 12.7l-.99-.99-1.41 1.41 1.7 1.7a1 1 0 001.41 0l4.1-4.1-1.41-1.41-3.4 3.39z" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-gray-900">เข้าสู่ระบบ</h1>
            <p className="text-gray-600 text-sm">เลือกประเภทบัญชีของคุณ</p>
            <div className="mt-4"><Tabs value={tab} onChange={(v)=>{ setError(""); setTab(v); }} /></div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">อีเมล</span>
              <InputIcon
                name="email"
                type="email"
                placeholder={tab === "store" ? "กรอกอีเมลร้านค้า" : "กรอกอีเมลของคุณ"}
                required
                left={Icon.mail()}
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700">รหัสผ่าน</span>
              <InputIcon
                name="password"
                type={showPwd ? "text" : "password"}
                placeholder="กรอกรหัสผ่าน"
                required
                left={Icon.lock()}
                right={
                  <button type="button" onClick={() => setShowPwd(v => !v)} aria-label="toggle password">
                    {showPwd ? Icon.eyeOff() : Icon.eye()}
                  </button>
                }
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl border border-blue-600 text-blue-700 hover:bg-blue-50 disabled:opacity-70 py-2.5 font-medium"
            >
              {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

            <p className="text-center text-sm text-gray-600">
              ยังไม่มีบัญชีผู้ใช้?{" "}
              <Link to="/signup" className="text-blue-600 hover:underline">สมัครสมาชิก</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
