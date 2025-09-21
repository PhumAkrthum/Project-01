import React from "react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">สมัครสมาชิก</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-gray-700">ชื่อ</label>
            <input type="text" className="mt-1 w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="ชื่อของคุณ" />
          </div>
          <div>
            <label className="block text-gray-700">อีเมล</label>
            <input type="email" className="mt-1 w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-gray-700">รหัสผ่าน</label>
            <input type="password" className="mt-1 w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-gray-700">ยืนยันรหัสผ่าน</label>
            <input type="password" className="mt-1 w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-gray-700">บทบาท</label>
            <select className="mt-1 w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="USER">ผู้ใช้งานทั่วไป</option>
              <option value="STORE">เจ้าของร้านค้า</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">สมัครสมาชิก</button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-500">
          มีบัญชีอยู่แล้ว? <a href="/signin" className="text-blue-600 hover:underline">เข้าสู่ระบบ</a>
        </div>
      </div>
    </div>
  );
} 