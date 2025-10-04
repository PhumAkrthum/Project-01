// src/components/Navbar.jsx
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'

function ShieldLogo({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path fill="url(#g)"
        d="M12 2c.3 0 .6.06.88.18l6.62 2.65c.3.12.5.41.5.74V12c0 4.97-3.35 8.51-7.99 10-4.64-1.49-8-5.03-8-10V5.57c0-.33.2-.62.5-.74l6.62-2.65C11.4 2.06 11.7 2 12 2z" />
      <path fill="#fff"
        d="M10.3 12.7l-.99-.99a1 1 0 10-1.41 1.41l1.7 1.7a1 1 0 001.41 0l4.1-4.1a1 1 0 10-1.41-1.41l-3.4 3.39z" />
    </svg>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth() || {};
  const isAuthenticated = !!user;
  const role = (user?.role || '').toUpperCase();

  // ปลายทางแดชบอร์ดแยกตาม role
  const dashHref =
    role === 'STORE'
      ? '/dashboard/warranty'
      : role === 'CUSTOMER'
      ? '/customer/warranties'
      : '/signin?next=/customer/warranties';

  const displayName =
    user?.store?.name || user?.storeName || user?.name || user?.email || 'บัญชีของฉัน';

  const onSignin = pathname !== "/signin";
  const onSignup = pathname !== "/signup";

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      navigate('/signin', { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/10">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <ShieldLogo className="w-7 h-7" />
          <span className="text-xl font-semibold text-gray-900">Warranty</span>
        </Link>

        {/* เมนูกลาง */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink
            end
            to="/"
            className={({ isActive }) =>
              `text-sm ${isActive ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}`
            }
          >
            หน้าหลัก
          </NavLink>
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">การรับประกัน</a>
          <a href="#why" className="text-sm text-gray-600 hover:text-gray-900">เกี่ยวกับเรา</a>

          {isAuthenticated && (
            <NavLink
              to={dashHref} // ← เปลี่ยนเป็นปลายทางตาม role
              className={({ isActive }) =>
                `text-sm ${isActive ? 'text-[color:var(--brand)]' : 'text-gray-600 hover:text-gray-900'}`
              }
            >
              แดชบอร์ด
            </NavLink>
          )}
        </div>

        {/* ปุ่มขวา */}
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <Link
              to={dashHref} // ← เปลี่ยนปลายทางตาม role
              className="hidden md:inline text-sm font-medium text-[color:var(--brand)] hover:text-[color:var(--brand-600)]"
            >
              ไปที่แดชบอร์ด
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{displayName}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-800 transition"
            >
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {onSignin && (
              <Link
                to="/signin"
                className="inline-flex items-center justify-center rounded-xl border border-blue-600 text-blue-700 px-4 py-2 text-sm font-medium hover:bg-blue-50 transition"
              >
                เข้าสู่ระบบ
              </Link>
            )}
            {onSignup && (
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition shadow-sm"
              >
                สมัครสมาชิก
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
