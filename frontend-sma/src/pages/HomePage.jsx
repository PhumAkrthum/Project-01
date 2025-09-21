import React from "react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4 text-blue-700">SMEC Platform</h1>
        <p className="mb-6 text-gray-600">ระบบ Authentication & Authorization สำหรับธุรกิจ SME<br/>รองรับบทบาท ADMIN, STORE, USER</p>
        <div className="flex justify-center gap-4">
          <a href="/signin" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">เข้าสู่ระบบ</a>
          <a href="/signup" className="px-4 py-2 bg-gray-200 text-blue-700 rounded hover:bg-gray-300 transition">สมัครสมาชิก</a>
        </div>
      </div>
    </div>
  );
} 