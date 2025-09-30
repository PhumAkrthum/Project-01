import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'
import ImageUpload from '../components/ImageUpload'
import ImagePreview from '../components/ImagePreview'

const defaultFilters = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'active', label: 'ใช้งานได้' },
  { value: 'nearing_expiration', label: 'ใกล้หมดอายุ' },
  { value: 'expired', label: 'หมดอายุ' },
]

const initialStoreProfile = {
  storeName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  businessHours: '',
  avatarUrl: '',
  storeType: '',
  notifyDaysInAdvance: 14,
}

const STATUS_CODE_BY_LABEL = {
  'ใช้งานได้': 'active',
  'ใกล้หมดอายุ': 'nearing_expiration',
  'หมดอายุ': 'expired',
}

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
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const storeId = useMemo(() => {
    if (!user) return null
    if (user.id) return user.id
    return null
  }, [user])

  const [warranties, setWarranties] = useState([])
  const [filters, setFilters] = useState(defaultFilters)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')

  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false)
  const [isProfileModalOpen, setProfileModalOpen] = useState(false)
  const [profileTab, setProfileTab] = useState('info')
  const profileMenuRef = useRef(null)
  const profileImageInputRef = useRef(null)

  const [storeProfile, setStoreProfile] = useState(initialStoreProfile)
  const [profileImage, setProfileImage] = useState({ file: null, preview: '' })
  const [profilePasswords, setProfilePasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [modalError, setModalError] = useState('')
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)

  const [isWarrantyModalOpen, setWarrantyModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedWarranty, setSelectedWarranty] = useState(null)
  const [showWarrantyDetails, setShowWarrantyDetails] = useState(false)
  const [warrantySubmitting, setWarrantySubmitting] = useState(false)
  const [warrantyModalError, setWarrantyModalError] = useState('')
  const [downloadingPdfId, setDownloadingPdfId] = useState(null)
  const [warrantyImages, setWarrantyImages] = useState([])
  const [imagePreview, setImagePreview] = useState({ open: false, images: [], index: 0 })

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
      const statusCode = item.statusCode
        || STATUS_CODE_BY_LABEL[item.statusTag]
        || STATUS_CODE_BY_LABEL[item.status]
        || 'unknown'
      const matchFilter = activeFilter === 'all' ? true : statusCode === activeFilter
      const normalizedTerm = searchTerm.trim().toLowerCase()
      const matchSearch = normalizedTerm
        ? [item.productName, item.serial, item.id, item.customerName, item.customerEmail]
            .map((text) => String(text || '').toLowerCase())
            .some((text) => text.includes(normalizedTerm))
        : true
      return matchFilter && matchSearch
    })
  }, [activeFilter, searchTerm, warranties])

  const openProfileModal = () => {
    setProfileModalOpen(true)
    setProfileTab('info')
    setProfileMenuOpen(false)
    setModalError('')
    setProfileSubmitting(false)
    setPasswordSubmitting(false)
    setProfilePasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
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

  const fetchDashboard = useCallback(async () => {
    if (!storeId) {
      setDashboardLoading(false)
      return
    }
    setDashboardError('')
    setDashboardLoading(true)
    try {
      const response = await api.get(`/store/${storeId}/dashboard`)
      const payload = response.data?.data ?? {}

      if (payload.storeProfile) {
        setStoreProfile({ ...initialStoreProfile, ...payload.storeProfile })
        setProfileImage({ file: null, preview: '' })
      }

      if (Array.isArray(payload.warranties)) {
        setWarranties(payload.warranties)
      } else {
        setWarranties([])
      }

      const fetchedStatuses = Array.isArray(payload.filters?.statuses)
        ? payload.filters.statuses
        : []

      const normalizedStatusOptions = fetchedStatuses
        .map((option) => ({
          value: option?.code || STATUS_CODE_BY_LABEL[option?.label] || option?.label,
          label: option?.label || option?.code || '',
        }))
        .filter((option) => option.value && option.label)

      const seen = new Set()
      const merged = [{ value: 'all', label: 'ทั้งหมด' }]
      for (const option of normalizedStatusOptions) {
        if (seen.has(option.value)) continue
        seen.add(option.value)
        merged.push(option)
      }
      if (merged.length === 1) {
        merged.push(...defaultFilters.slice(1))
      }
      setFilters(merged)
      setActiveFilter((current) => (merged.some((option) => option.value === current) ? current : 'all'))
      setDashboardError('')
    } catch (error) {
      setDashboardError(error?.response?.data?.error?.message || 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้')
    } finally {
      setDashboardLoading(false)
    }
  }, [storeId])

  const openWarrantyModal = (mode, warranty) => {
    setModalMode(mode)
    setSelectedWarranty(warranty ?? null)
    setWarrantyModalError('')
    setWarrantySubmitting(false)
    setWarrantyImages(warranty?.images || [])
    setWarrantyModalOpen(true)
  }

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    if (!storeId) return
    setProfileSubmitting(true)
    setModalError('')
    try {
      const payload = {
        storeName: storeProfile.storeName,
        contactName: storeProfile.contactName,
        email: storeProfile.email,
        phone: storeProfile.phone,
        address: storeProfile.address,
        businessHours: storeProfile.businessHours,
        avatarUrl: storeProfile.avatarUrl,
      }
      const response = await api.patch(`/store/${storeId}/profile`, payload)
      const updatedProfile = response.data?.data?.storeProfile ?? payload
      setStoreProfile((prev) => ({ ...prev, ...updatedProfile }))
      setProfileImage({ file: null, preview: '' })
      setModalError('')
      setProfileModalOpen(false)
    } catch (error) {
      setModalError(error?.response?.data?.error?.message || 'บันทึกข้อมูลร้านไม่สำเร็จ')
    } finally {
      setProfileSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    if (!storeId) return
    if (profilePasswords.newPassword !== profilePasswords.confirmPassword) {
      setModalError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน')
      return
    }
    setPasswordSubmitting(true)
    setModalError('')
    try {
      await api.post(`/store/${storeId}/change-password`, {
        old_password: profilePasswords.currentPassword,
        new_password: profilePasswords.newPassword,
      })
      setProfilePasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setModalError('')
      setProfileModalOpen(false)
    } catch (error) {
      setModalError(error?.response?.data?.error?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const handleLogout = () => {
    logout?.()
    setProfileMenuOpen(false)
    navigate('/signin', { replace: true })
  }

  const handleWarrantySubmit = async (event) => {
    event.preventDefault()
    if (!storeId) return
    setWarrantySubmitting(true)
    setWarrantyModalError('')

    const formData = new FormData(event.currentTarget)
    const durationMonthsRaw = Number(formData.get('duration_months') || formData.get('durationMonths') || 0)
    const payload = {
      customer_email: String(formData.get('customer_email') || '').trim(),
      product_name: String(formData.get('product_name') || '').trim(),
      purchase_date: String(formData.get('purchase_date') || '').trim(),
      serial: String(formData.get('serial') || '').trim(),
      warranty_terms: String(formData.get('warranty_terms') || '').trim(),
      note: String(formData.get('note') || '').trim(),
    }
    if (durationMonthsRaw > 0) {
      payload.duration_months = durationMonthsRaw
      payload.durationMonths = durationMonthsRaw
    }
    const expiryDate = String(formData.get('expiry_date') || '').trim()
    if (expiryDate) {
      payload.expiry_date = expiryDate
      payload.expiryDate = expiryDate
    }

    try {
      if (modalMode === 'create') {
        const response = await api.post(`/store/${storeId}/warranties`, payload)
        const created = response.data?.data?.warranty
        if (created) {
          setWarranties((prev) => [created, ...prev])
        }
      } else if (selectedWarranty) {
        const response = await api.patch(`/warranties/${selectedWarranty.id}`, payload)
        const updated = response.data?.data?.warranty
        if (updated) {
          setWarranties((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        }
      }
      setWarrantyModalOpen(false)
    } catch (error) {
      setWarrantyModalError(error?.response?.data?.error?.message || 'ไม่สามารถบันทึกใบรับประกันได้')
    } finally {
      setWarrantySubmitting(false)
    }
  }

  const handleDownloadPdf = async (warrantyId) => {
    if (!warrantyId) return
    try {
      setDownloadingPdfId(warrantyId)
      const response = await api.get(`/warranties/${warrantyId}/pdf`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (error) {
      setDashboardError(error?.response?.data?.error?.message || 'ไม่สามารถดาวน์โหลดใบรับประกันได้')
    } finally {
      setDownloadingPdfId(null)
    }
  }

  const handleImageUpload = async (files) => {
    if (!selectedWarranty?.id) return

    const formData = new FormData()
    files.forEach(file => {
      formData.append('images', file)
    })

    try {
      const response = await api.post(`/warranties/${selectedWarranty.id}/images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const updatedWarranty = response.data?.data?.warranty
      if (updatedWarranty) {
        setWarrantyImages(updatedWarranty.images || [])
        // อัปเดต warranties list
        setWarranties(prev => prev.map(w => w.id === updatedWarranty.id ? updatedWarranty : w))
      }
    } catch (error) {
      throw new Error(error?.response?.data?.error?.message || 'ไม่สามารถอัปโหลดรูปภาพได้')
    }
  }

  const handleImageDelete = async (imageId) => {
    if (!selectedWarranty?.id) return

    try {
      const response = await api.delete(`/warranties/${selectedWarranty.id}/images/${imageId}`)
      
      const updatedWarranty = response.data?.data?.warranty
      if (updatedWarranty) {
        setWarrantyImages(updatedWarranty.images || [])
        // อัปเดต warranties list
        setWarranties(prev => prev.map(w => w.id === updatedWarranty.id ? updatedWarranty : w))
      }
    } catch (error) {
      throw new Error(error?.response?.data?.error?.message || 'ไม่สามารถลบรูปภาพได้')
    }
  }

  const primaryWarranty = filteredWarranties[0] || warranties[0] || null
  const storeDisplayName = storeProfile.storeName || user?.store?.name || user?.storeName || user?.name || 'ร้านของฉัน'
  const storeEmail = storeProfile.email || user?.store?.email || user?.email || ''

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
                <div className="font-medium text-gray-900">{storeDisplayName}</div>
                <div className="text-xs text-gray-500">{storeEmail}</div>
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
                    <div className="font-medium text-gray-900">{storeDisplayName}</div>
                    <div className="text-xs text-gray-500">{storeEmail}</div>
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
        {dashboardError && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <span>{dashboardError}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDashboardError('')}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-600 shadow hover:bg-amber-100"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={fetchDashboard}
                className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-amber-400"
              >
                ลองอีกครั้ง
              </button>
            </div>
          </div>
        )}
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-b from-white to-sky-50 p-6 shadow-xl">
          {dashboardLoading ? (
            <div className="grid min-h-[320px] place-items-center text-sm text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : !storeId ? (
            <div className="grid min-h-[320px] place-items-center text-center text-sm text-gray-500">
              <div>
                <div className="text-base font-medium text-gray-700">หน้านี้สำหรับบัญชีร้านค้าเท่านั้น</div>
                <p className="mt-1 text-xs text-gray-500">กรุณาเข้าสู่ระบบด้วยบัญชีร้านค้าเพื่อเข้าถึงแดชบอร์ด</p>
              </div>
            </div>
          ) : (
            <>
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
                  {filters.map((filter) => {
                    const isActiveFilter = activeFilter === filter.value
                    const activeClass = isActiveFilter
                      ? filter.value === 'active'
                        ? 'bg-emerald-500 text-white'
                        : filter.value === 'nearing_expiration'
                        ? 'bg-amber-500 text-white'
                        : filter.value === 'expired'
                        ? 'bg-rose-500 text-white'
                        : 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setActiveFilter(filter.value)}
                        className={`rounded-full px-3 py-2 text-xs font-medium shadow-sm transition ${activeClass}`}
                      >
                        {filter.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-8 grid gap-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900">Warranty Card</div>
                      <div className="mt-2 grid gap-1 text-sm text-gray-700 md:grid-cols-2">
                        <div>รหัสรับประกัน: <span className="font-medium text-gray-900">{primaryWarranty?.id || '-'}</span></div>
                        <div>ลูกค้า: <span className="font-medium text-gray-900">{primaryWarranty?.customerName || '-'}</span></div>
                        <div>เบอร์โทรศัพท์: <span className="font-medium text-gray-900">{primaryWarranty?.customerPhone || '-'}</span></div>
                        <div>อีเมลลูกค้า: <span className="font-medium text-gray-900">{primaryWarranty?.customerEmail || '-'}</span></div>
                      </div>
                      
                      {/* แสดงรูปภาพใน Warranty Card */}
                      {primaryWarranty?.images && primaryWarranty.images.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-600 mb-2">รูปภาพประกอบ</div>
                          <div className="flex gap-2">
                            {primaryWarranty.images.slice(0, 3).map((image, index) => (
                              <div 
                                key={image.id} 
                                className="group relative h-12 w-12 cursor-pointer overflow-hidden rounded-lg"
                                onClick={() => setImagePreview({ 
                                  open: true, 
                                  images: primaryWarranty.images, 
                                  index 
                                })}
                              >
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${image.url}`}
                                  alt={`Preview ${index + 1}`}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                              </div>
                            ))}
                            {primaryWarranty.images.length > 3 && (
                              <div 
                                className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-600 hover:bg-gray-300"
                                onClick={() => setImagePreview({ 
                                  open: true, 
                                  images: primaryWarranty.images, 
                                  index: 3 
                                })}
                              >
                                +{primaryWarranty.images.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => primaryWarranty && handleDownloadPdf(primaryWarranty.id)}
                        disabled={!primaryWarranty || downloadingPdfId === primaryWarranty?.id}
                        className={`h-10 min-w-[96px] rounded-full bg-sky-500 px-5 text-sm font-medium text-white shadow transition ${
                          !primaryWarranty || downloadingPdfId === primaryWarranty?.id
                            ? 'cursor-not-allowed opacity-70'
                            : 'hover:bg-sky-400'
                        }`}
                      >
                        {downloadingPdfId === primaryWarranty?.id ? 'กำลังดาวน์โหลด…' : 'PDF'}
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
                            <div>Serial No.: <span className="font-medium text-gray-900">{warranty.serial || '-'}</span></div>
                            <div>ลูกค้า: <span className="font-medium text-gray-900">{warranty.customerName || '-'}</span></div>
                            <div>วันที่ซื้อ: <span className="font-medium text-gray-900">{warranty.purchaseDate || '-'}</span></div>
                            <div>วันหมดอายุ: <span className="font-medium text-gray-900">{warranty.expiryDate || '-'}</span></div>
                            <div>อีเมลลูกค้า: <span className="font-medium text-gray-900">{warranty.customerEmail || '-'}</span></div>
                            <div>จำนวนวันคงเหลือ: <span className="font-medium text-gray-900">{warranty.daysLeft ?? 0} วัน</span></div>
                          </div>
                          <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{warranty.coverageNote || '-'}</p>
                          
                          {/* แสดงรูปภาพ */}
                          {warranty.images && warranty.images.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-700">รูปภาพประกอบ</div>
                              <div className="flex gap-2 overflow-x-auto">
                                {warranty.images.map((image, index) => (
                                  <div key={image.id} className="group relative flex-shrink-0 cursor-pointer">
                                    <img
                                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${image.url}`}
                                      alt={image.originalName || 'Warranty image'}
                                      className="h-20 w-20 rounded-lg object-cover transition-transform group-hover:scale-105"
                                      onClick={() => setImagePreview({ 
                                        open: true, 
                                        images: warranty.images, 
                                        index 
                                      })}
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                    {/* Preview Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                      <span className="text-xs text-white">👁️</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid place-items-center gap-4">
                          {/* Image Preview Box */}
                          <div className="relative h-32 w-40 overflow-hidden rounded-2xl border border-gray-300 bg-gray-50">
                            {warranty.images && warranty.images.length > 0 ? (
                              <div 
                                className="group relative h-full w-full cursor-pointer"
                                onClick={() => setImagePreview({ 
                                  open: true, 
                                  images: warranty.images, 
                                  index: 0 
                                })}
                              >
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${warranty.images[0].url}`}
                                  alt="Warranty preview"
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                                {/* Image Count Badge */}
                                {warranty.images.length > 1 && (
                                  <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                                    +{warranty.images.length - 1}
                                  </div>
                                )}
                                {/* Preview Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                  <span className="text-white">👁️ ดูรูป</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                                <div className="text-center">
                                  <div className="mb-1 text-2xl">📷</div>
                                  <div>ไม่มีรูปภาพ</div>
                                </div>
                              </div>
                            )}
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
            </>
          )}
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
                onClick={() => {
                  setProfileModalOpen(false)
                  setModalError('')
                  setProfileSubmitting(false)
                  setPasswordSubmitting(false)
                }}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="px-6 pt-4">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileTab('info')
                    setModalError('')
                  }}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-medium ${
                    profileTab === 'info' ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-gray-500'
                  }`}
                >
                  ข้อมูลร้านค้า
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileTab('password')
                    setModalError('')
                  }}
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
                {modalError && profileTab === 'info' && (
                  <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{modalError}</div>
                )}
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
                    disabled={profileSubmitting}
                    className={`rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow transition ${
                      profileSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-sky-500'
                    }`}
                  >
                    {profileSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="px-6 pb-6">
                {modalError && profileTab === 'password' && (
                  <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{modalError}</div>
                )}
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
                    disabled={passwordSubmitting}
                    className={`rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow transition ${
                      passwordSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-emerald-400'
                    }`}
                  >
                    {passwordSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน'}
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
                onClick={() => {
                  setWarrantyModalOpen(false)
                  setWarrantyModalError('')
                  setWarrantySubmitting(false)
                }}
                className="text-2xl text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
            <form className="grid gap-3 px-6 pb-6 pt-5" onSubmit={handleWarrantySubmit}>
              {warrantyModalError && (
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{warrantyModalError}</div>
              )}
              <label className="text-sm text-gray-600">
                อีเมลลูกค้า
                <input
                  name="customer_email"
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
                  name="product_name"
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
                    name="duration_months"
                    defaultValue={
                      modalMode === 'edit'
                        ? selectedWarranty?.durationMonths || Math.max(1, Math.round((selectedWarranty?.durationDays || 30) / 30))
                        : 12
                    }
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
                    name="serial"
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
                    name="purchase_date"
                    defaultValue={modalMode === 'edit' ? selectedWarranty?.purchaseDate : ''}
                    className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                    type="date"
                    required
                  />
                </label>
                <label className="text-sm text-gray-600">
                  วันหมดอายุ
                  <input
                    name="expiry_date"
                    defaultValue={modalMode === 'edit' ? selectedWarranty?.expiryDate : ''}
                    className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                    type="date"
                  />
                </label>
              </div>
              <label className="text-sm text-gray-600">
                เงื่อนไขการรับประกัน
                <textarea
                  name="warranty_terms"
                  defaultValue={modalMode === 'edit' ? selectedWarranty?.coverageNote : ''}
                  className="mt-1 min-h-[96px] w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                  placeholder="กรอกเงื่อนไขการรับประกัน"
                  required
                />
              </label>
              
              {/* Image Upload Section - แสดงเฉพาะเมื่อแก้ไข */}
              {modalMode === 'edit' && selectedWarranty && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">รูปภาพประกอบ</label>
                  <ImageUpload
                    images={warrantyImages}
                    onUpload={handleImageUpload}
                    onDelete={handleImageDelete}
                    maxImages={5}
                    disabled={warrantySubmitting}
                  />
                </div>
              )}
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
                  disabled={warrantySubmitting}
                  className={`rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white shadow transition ${
                    warrantySubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-sky-500'
                  }`}
                >
                  {warrantySubmitting ? 'กำลังบันทึก...' : modalMode === 'create' ? 'บันทึก' : 'ยืนยัน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview.open && (
        <ImagePreview
          images={imagePreview.images}
          initialIndex={imagePreview.index}
          onClose={() => setImagePreview({ open: false, images: [], index: 0 })}
        />
      )}
    </div>
  )
}