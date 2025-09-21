import { Link, NavLink } from 'react-router-dom'
import Button from './Button'

export default function Navbar(){
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-sky-500 text-white">🛡️</div>
          <span>Warranty</span>
        </Link>
        <nav className="hidden gap-6 md:flex">
          <NavLink to="/" className={({isActive})=>`text-sm ${isActive?'text-gray-900':'text-gray-600 hover:text-gray-900'}`}>หน้าหลัก</NavLink>
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">การรับประกัน</a>
          <a href="#why" className="text-sm text-gray-600 hover:text-gray-900">เกี่ยวกับเรา</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/signin" className="text-sm text-gray-700 hover:text-gray-900">เข้าสู่ระบบ</Link>
          <Button as={Link} to="/signup" className="text-sm text-white">สมัครสมาชิก</Button>
        </div>
      </div>
    </header>
  )
}
