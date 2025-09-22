import { useEffect, useMemo, useRef, useState } from 'react'

const mockWarranties = [
  {
    id: 'WR001',
    productName: 'iPhone 16 Pro',
    status: 'ใช้งานได้',
    statusTag: 'ใช้งานได้',
    statusColor: 'bg-emerald-100 text-emerald-700',
    serial: 'SN-0000001',
    customerName: 'คุณญญ่า สรรพสินค้า',
    customerEmail: 'natthanan@gmail.com',
    purchaseDate: '3/8/2568',
    expiryDate: '3/9/2569',
    coverageNote: 'รับประกันร้านอีกรอบ 1 ปี รวมหน้าจอ',
    daysLeft: 30,
    matchedCard: 'WR001',
  },
  {
    id: 'WR002',
    productName: 'iPhone 15 Pro',
    status: 'ใกล้หมดอายุ',
    statusTag: 'ใกล้หมดอายุ',
    statusColor: 'bg-amber-100 text-amber-700',
    serial: 'SN-0000002',
    customerName: 'คุณปอนด์ สมาร์ทโฟน',
    customerEmail: 'natthanan@gmail.com',
    purchaseDate: '3/8/2568',
    expiryDate: '3/9/2569',
    coverageNote: 'รับประกันร้านอีก 1 ปี รวมหน้าจอ',
    daysLeft: 7,
    matchedCard: 'WR001',
  },
  {
    id: 'WR003',
    productName: 'iPhone 14 Pro',
    status: 'หมดอายุ',
    statusTag: 'หมดอายุ',
    statusColor: 'bg-rose-100 text-rose-700',
    serial: 'SN-0000003',
    customerName: 'คุณณัฐวุฒิ คอมพิวเตอร์',
    customerEmail: 'natthanan@gmail.com',
    purchaseDate: '3/5/2567',
    expiryDate: '3/6/2568',
    coverageNote: 'หมดอายุแล้ว ไม่ครอบคลุมความเสียหาย',
    daysLeft: 0,
    matchedCard: 'WR002',
  },
]

function StatusBadge({ label, className }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  )
}

function IconButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow ring-1 ring-black/5 hover:bg-gray-50"
      aria-label={label}
    >
      <span className="text-xl">{icon}</span>
    </button>
  )
}

function SectionTitle({ children }) {
  return <h2 className="text-lg font-semibold text-gray-900">{children}</h2>
}

export default function WarrantyDashboard() {
  // TODO: Replace mock data with GET /warranties response.
  const [warranties] = useState(() => mockWarranties)
  const [activeFilter, setActiveFilter] = useState('ทั้งหมด')
  const [searchTerm, setSearchTerm] = useState('')

  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false)
  const [isProfileModalOpen, setProfileModalOpen] = useState(false)
  const [profileTab, setProfileTab] = useState('info')
  const profileMenuRef = useRef(null)
  const profileImageInputRef = useRef(null)

  // TODO: Replace with GET /profile.
  const [storeProfile, setStoreProfile] = useState({
    storeName: 'ร้านบัดดี้ดี',
    contactName: 'ธนนท์ ไชย',
    email: 'customer@example.com',
    phone: '02-123-4567',
    address: '123 ถนนสุขุมวิทย์ กรุงเทพฯ',
    businessHours: '9:00-18:00 จันทร์ - ศุกร์',
    avatarUrl: '',
  })
  const [profileImage, setProfileImage] = useState({ file: null, preview: '' })
  const [profilePasswords, setProfilePasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [isWarrantyModalOpen, setWarrantyModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedWarranty, setSelectedWarranty] = useState(null)
  const [showWarrantyDetails, setShowWarrantyDetails] = useState(false)

  const profileAvatarSrc = profileImage.preview || storeProfile.avatarUrl || ''

  useEffect(() => {
    if (!isProfileMenuOpen) return
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileMenuOpen])

  const filteredWarranties = useMemo(() => {
    return warranties.filter((item) => {
      const matchFilter = activeFilter === 'ทั้งหมด' ? true : item.status === activeFilter
      const normalizedTerm = searchTerm.trim().toLowerCase()
      const matchSearch = normalizedTerm
        ? [item.productName, item.serial, item.id].some((text) => text.toLowerCase().includes(normalizedTerm))
        : true
      return matchFilter && matchSearch
    })
  }, [activeFilter, searchTerm, warranties])

  const openProfileModal = () => {
    setProfileModalOpen(true)
    setProfileTab('info')
    setProfileMenuOpen(false)
  }

  const handleProfileAvatarSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setProfileImage({ file, preview: reader.result })
        setStoreProfile((prev) => ({ ...prev, avatarUrl: reader.result }))
      }
    }
    reader.readAsDataURL(file)
  }

  const openWarrantyModal = (mode, warranty) => {
    setModalMode(mode)
    setSelectedWarranty(warranty ?? null)
    setWarrantyModalOpen(true)
  }

  const handleProfileSubmit = (event) => {
    event.preventDefault()
    // TODO: POST /profile with storeProfile payload.
    console.info('mock submit profile', {
      ...storeProfile,
      avatarFileName: profileImage.file?.name ?? null,
    })
    setProfileModalOpen(false)
  }

  const handlePasswordSubmit = (event) => {
    event.preventDefault()
    // TODO: PATCH /profile/password with profilePasswords data.
    console.info('mock submit passwords', profilePasswords)
    setProfilePasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setProfileModalOpen(false)
  }

  const handleLogout = () => {
    // TODO: Connect to sign-out flow when auth store is ready.
    console.info('mock logout')
    setProfileMenuOpen(false)
  }

  const filters = ['ทั้งหมด', 'ใช้งานได้', 'ใกล้หมดอายุ', 'หมดอายุ']

  return (
    <div className="min-h-screen bg-sky-50/80 pb-12">
      <header className="border-b border-sky-100 bg-white/90 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/90 text-2xl text-white shadow-lg">🛡️</div>
            <div>
              <div className="text-lg font-semibold text-gray-900">Warranty</div>
              <div className="text-sm text-gray-500">จัดการการรับประกันของคุณได้ในที่เดียว</div>
            </div>
          </div>
          <div className="flex items-center gap-3" ref={profileMenuRef}>
            <IconButton icon="🔔" label="การแจ้งเตือน" />
            <IconButton icon="📅" label="กิจกรรม" />
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow ring-1 ring-black/10 hover:bg-gray-50"
            >
              {profileAvatarSrc ? (
                <img
                  src={profileAvatarSrc}
                  alt="Store profile"
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-300 text-xl">🏪</div>
              )}
              <div className="hidden text-left text-sm md:block">
                <div className="font-medium text-gray-900">{storeProfile.storeName}</div>
                <div className="text-xs text-gray-500">{storeProfile.email}</div>
              </div>
              <span className="hidden text-gray-400 md:inline">▾</span>
            </button>
            {isProfileMenuOpen && (
              <div className="absolute right-4 top-16 w-60 rounded-2xl bg-white p-4 text-sm shadow-xl ring-1 ring-black/5">
                <div className="mb-4 flex items-center gap-3">
                  {profileAvatarSrc ? (
                    <img
                      src={profileAvatarSrc}
                      alt="Store profile"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-200 text-2xl">🏪</div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{storeProfile.storeName}</div>
                    <div className="text-xs text-gray-500">{storeProfile.email}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="flex w-full items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-gray-700 hover:bg-amber-100"
                >
                  <span>แก้ไขโปรไฟล์</span>
                  <span aria-hidden>✏️</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-gray-500 hover:bg-gray-50"
                >
                  <span>ออกจากระบบ</span>
                  <span aria-hidden>↪️</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-6xl px-4">
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-b from-white to-sky-50 p-6 shadow-xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <SectionTitle>จัดการการรับประกัน</SectionTitle>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 rounded-full bg-white p-1">
                <button className="rounded-full px-4 py-1 text-sm font-medium text-gray-400 shadow-sm">ภาพรวม</button>
                <button className="rounded-full bg-sky-100 px-4 py-1 text-sm font-medium text-sky-700 shadow">การรับประกัน</button>
              </div>
              <button
                type="button"
                onClick={() => openWarrantyModal('create')}
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-sky-500"
              >
                สร้างใบรับประกัน
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center rounded-2xl bg-white px-4 py-2 shadow ring-1 ring-black/5">
              <span className="text-gray-400">🔍</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                placeholder="ค้นหาด้วยชื่อสินค้า, ร้านค้า, รหัสรับประกัน"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-3 py-2 text-xs font-medium shadow-sm transition ${
                    activeFilter === filter
                      ? filter === 'ใช้งานได้'
                        ? 'bg-emerald-500 text-white'
                        : filter === 'ใกล้หมดอายุ'
                        ? 'bg-amber-500 text-white'
                        : filter === 'หมดอายุ'
                        ? 'bg-rose-500 text-white'
                        : 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8 grid gap-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Warranty Card</div>
                  <div className="mt-2 grid gap-1 text-sm text-gray-700 md:grid-cols-2">
                    <div>รหัสรับประกัน: <span className="font-medium text-gray-900">WR001</span></div>
                    <div>ลูกค้า: <span className="font-medium text-gray-900">ญาณิดา สรรพสินค้า</span></div>
                    <div>เบอร์โทรศัพท์: <span className="font-medium text-gray-900">065-292-3242</span></div>
                    <div>อีเมลลูกค้า: <span className="font-medium text-gray-900">natthanan@gmail.com</span></div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    className="h-10 min-w-[96px] rounded-full bg-sky-500 px-5 text-sm font-medium text-white shadow hover:bg-sky-400"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWarrantyDetails((prev) => !prev)}
                    className="rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-100"
                  >
                    {showWarrantyDetails ? 'ซ่อนรายละเอียด' : 'รายละเอียดเพิ่มเติม'}
                  </button>
                </div>
              </div>
              <p className="mt-4 rounded-xl bg-white/60 p-4 text-xs text-amber-600">
                หากไม่กรอกข้อมูลจะทำให้การแสดงผลการ์ดนี้ไม่ครบถ้วน
              </p>
            </div>

            <div className="border-l-4 border-sky-400 pl-4 text-xs text-sky-600">
              หอดูดาว: แสดงรายการสินค้าที่จะรวมภายใต้ใบรับประกันนี้ในอนาคต
            </div>
          </div>

          <div className="grid gap-4">
            {showWarrantyDetails &&
              (filteredWarranties.length > 0 ? (
                filteredWarranties.map((warranty) => (
                  <div
                    key={warranty.id}
                    className="flex flex-col justify-between gap-6 rounded-3xl bg-white p-6 shadow ring-1 ring-black/5 md:flex-row"
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-lg font-semibold text-gray-900">{warranty.productName}</div>
                        <StatusBadge label={warranty.statusTag} className={warranty.statusColor} />
                        <span className="text-xs text-gray-400">#{warranty.id}</span>
                      </div>
                      <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                        <div>Serial No.: <span className="font-medium text-gray-900">{warranty.serial}</span></div>
                        <div>ลูกค้า: <span className="font-medium text-gray-900">{warranty.customerName}</span></div>
                        <div>วันที่ซื้อ: <span className="font-medium text-gray-900">{warranty.purchaseDate}</span></div>
                        <div>วันหมดอายุ: <span className="font-medium text-gray-900">{warranty.expiryDate}</span></div>
                        <div>อีเมลลูกค้า: <span className="font-medium text-gray-900">{warranty.customerEmail}</span></div>
                        <div>จำนวนวันคงเหลือ: <span className="font-medium text-gray-900">{warranty.daysLeft} วัน</span></div>
                      </div>
                      <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{warranty.coverageNote}</p>
                    </div>

                    <div className="grid place-items-center gap-4">
                      <div className="grid h-32 w-40 place-items-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
                        เพิ่มรูปภาพ
                      </div>
                      <button
                        type="button"
                        onClick={() => openWarrantyModal('edit', warranty)}
                        className="flex items-center gap-2 rounded-full border border-sky-500 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50"
                      >
                        <span>แก้ไข</span>
                        <span aria-hidden>✏️</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                  ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                </div>
              ))}
          </div>
        </div>
      </main>

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-100 px-6 py-4">
            <div className="flex items-center gap-3">
                {profileAvatarSrc ? (
                  <img
                    src={profileAvatarSrc}
                    alt="Store profile"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-200 text-2xl">🏪</div>
                )}
                <div>
                  <div className="text-base font-semibold text-gray-900">แก้ไขข้อมูลโปรไฟล์</div>
                  <div className="text-xs text-amber-600">ข้อมูลจะใช้โชว์ในหัวหน้า dashboard</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="px-6 pt-4">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setProfileTab('info')}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-medium ${
                    profileTab === 'info' ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-gray-500'
                  }`}
                >
                  ข้อมูลร้านค้า
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab('password')}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-medium ${
                    profileTab === 'password' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-gray-500'
                  }`}
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>
            {profileTab === 'info' ? (
              <form onSubmit={handleProfileSubmit} className="px-6 pb-6">
                <input
                  ref={profileImageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileAvatarSelect}
                  type="file"
                />
                <div className="mb-4 flex items-center gap-4">
                  {profileAvatarSrc ? (
                    <img
                      src={profileAvatarSrc}
                      alt="Store profile"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-200 text-3xl">🏪</div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-400"
                    >
                      อัปโหลดรูปใหม่
                    </button>
                    <div className="mt-1 text-xs text-gray-400">รองรับไฟล์ .jpg, .png ขนาดไม่เกิน 2 MB</div>
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    ['storeName', 'ชื่อร้าน'],
                    ['contactName', 'ชื่อผู้ติดต่อ'],
                    ['email', 'อีเมล'],
                    ['phone', 'เบอร์ติดต่อ'],
                    ['address', 'ที่อยู่'],
                    ['businessHours', 'เวลาทำการ'],
                  ].map(([key, label]) => (
                    <label key={key} className="text-sm text-gray-600">
                      {label}
                      <input
                        required
                        value={storeProfile[key]}
                        onChange={(event) => setStoreProfile((prev) => ({ ...prev, [key]: event.target.value }))}
                        className="mt-1 w-full rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-2 text-sm text-gray-900 focus:border-amber-300 focus:outline-none"
                        type="text"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-sky-500"
                  >
                    บันทึก
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="px-6 pb-6">
                <div className="grid gap-3">
                  {[
                    ['currentPassword', 'รหัสผ่านเก่า'],
                    ['newPassword', 'รหัสผ่านใหม่'],
                    ['confirmPassword', 'ยืนยันรหัสผ่านใหม่'],
                  ].map(([key, label]) => (
                    <label key={key} className="text-sm text-gray-600">
                      {label}
                      <input
                        required
                        value={profilePasswords[key]}
                        onChange={(event) => setProfilePasswords((prev) => ({ ...prev, [key]: event.target.value }))}
                        className="mt-1 w-full rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-2 text-sm text-gray-900 focus:border-emerald-300 focus:outline-none"
                        type="password"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-400"
                  >
                    ยืนยัน
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {isWarrantyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-3xl bg-sky-600 px-6 py-4 text-white">
              <div>
                <div className="text-base font-semibold">{modalMode === 'create' ? 'สร้างใบรับประกันใหม่' : 'แก้ไขการรับประกัน'}</div>
                <div className="text-xs text-sky-100">ใบรับประกัน 1 ใบ สามารถเพิ่มสินค้าหลายรายการได้</div>
              </div>
              <button
                type="button"
                onClick={() => setWarrantyModalOpen(false)}
                className="text-2xl text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
            <form
              className="grid gap-3 px-6 pb-6 pt-5"
              onSubmit={(event) => {
                event.preventDefault()
                // TODO: Connect to create/update warranty endpoint.
                console.info(`mock ${modalMode} warranty`, selectedWarranty)
                setWarrantyModalOpen(false)
              }}
            >
              <label className="text-sm text-gray-600">
                อีเมลลูกค้า
                <input
                  defaultValue={modalMode === 'edit' ? selectedWarranty?.customerEmail : ''}
                  className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                  placeholder="กรอกอีเมลลูกค้า"
                  type="email"
                  required
                />
              </label>
              <label className="text-sm text-gray-600">
                ชื่อสินค้า
                <input
                  defaultValue={modalMode === 'edit' ? selectedWarranty?.productName : ''}
                  className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                  placeholder="กรอกชื่อสินค้า"
                  type="text"
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-gray-600">
                  ระยะเวลา (เดือน)
                  <select
                    defaultValue={modalMode === 'edit' ? 12 : 12}
                    className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                  >
                    {[6, 12, 18, 24].map((month) => (
                      <option key={month} value={month}>
                        {month} เดือน
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-600">
                  Serial No.
                  <input
                    defaultValue={modalMode === 'edit' ? selectedWarranty?.serial : ''}
                    className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                    placeholder="กรอก Serial No."
                    type="text"
                    required
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-gray-600">
                  วันเริ่ม
                  <input
                    defaultValue={modalMode === 'edit' ? selectedWarranty?.purchaseDate : ''}
                    className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                    type="text"
                    placeholder="3/9/2568"
                    required
                  />
                </label>
                <label className="text-sm text-gray-600">
                  วันหมดอายุ
                  <input
                    defaultValue={modalMode === 'edit' ? selectedWarranty?.expiryDate : ''}
                    className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                    type="text"
                    placeholder="3/9/2569"
                    required
                  />
                </label>
              </div>
              <label className="text-sm text-gray-600">
                เงื่อนไขการรับประกัน
                <textarea
                  defaultValue={modalMode === 'edit' ? selectedWarranty?.coverageNote : ''}
                  className="mt-1 min-h-[96px] w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                  placeholder="กรอกเงื่อนไขการรับประกัน"
                  required
                />
              </label>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  + เพิ่มสินค้า
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  ค้นหาสินค้า
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-sky-500"
                >
                  {modalMode === 'create' ? 'บันทึก' : 'ยืนยัน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}