// frontend-sma/src/pages/WarrantyDashboard.jsx
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

/* ===== helpers ===== */
function pad3(n) {
  const s = String(n)
  return s.length >= 3 ? s : '0'.repeat(3 - s.length) + s
}
function nextSerialFromList(list) {
  let max = 0
  for (const w of list || []) {
    const m = String(w?.serial || '').match(/^SN(\d+)$/i)
    if (m) max = Math.max(max, Number(m[1] || 0))
  }
  return `SN${pad3(max + 1 || 1)}`
}
function toISODate(d) {
  if (!d || isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}
function addMonthsKeepDay(startISO, months) {
  if (!startISO) return ''
  const [y, m, d] = startISO.split('-').map(Number)
  if (!y || !m || !d) return ''
  const base = new Date(Date.UTC(y, m - 1, d))
  const targetMonth = base.getUTCMonth() + months
  const targetYear = base.getUTCFullYear() + Math.floor(targetMonth / 12)
  const targetMonNorm = ((targetMonth % 12) + 12) % 12
  let result = new Date(Date.UTC(targetYear, targetMonNorm, d))
  while (result.getUTCMonth() !== targetMonNorm) {
    result = new Date(Date.UTC(targetYear, targetMonNorm + 1, 0))
  }
  return toISODate(result)
}
function deriveItemStatusCode(item, notifyDays = 14) {
  if (!item?.expiryDate) return 'active'
  const today = new Date()
  const exp = new Date(item.expiryDate)
  const days = Math.ceil((exp - today) / (24 * 3600 * 1000))
  if (days < 0) return 'expired'
  if (days <= notifyDays) return 'nearing_expiration'
  return 'active'
}

export default function WarrantyDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const storeIdResolved = useMemo(() => {
    if (!user) return null
    return Number(user.sub ?? user.id ?? null)
  }, [user])

  // NOTE: warranties = “ใบรับประกัน (Header)” แต่ละใบมี items อยู่ใน field .items
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

  // แก้ไขระดับ “รายการสินค้า”
  const [selectedItem, setSelectedItem] = useState(null)

  // แสดง/ซ่อนรายละเอียดต่อ “ใบ”
  const [expandedByHeader, setExpandedByHeader] = useState({})

  const [warrantySubmitting, setWarrantySubmitting] = useState(false)
  const [warrantyModalError, setWarrantyModalError] = useState('')
  const [downloadingPdfId, setDownloadingPdfId] = useState(null)

  // รูปใน modal edit
  const [warrantyImages, setWarrantyImages] = useState([])

  const [imagePreview, setImagePreview] = useState({ open: false, images: [], index: 0 })

  const profileAvatarSrc = profileImage.preview || storeProfile.avatarUrl || ''

  /* ---------- สร้างหลายสินค้าในใบเดียว + auto expiry ---------- */
  const makeItem = (seedSN = null) => ({
    customer_email: '',
    product_name: '',
    duration_months: 12,
    serial: seedSN || nextSerialFromList(warranties),
    purchase_date: '',
    expiry_date: '',
    warranty_terms: '',
    note: '',
    images: [],
  })
  const [createItems, setCreateItems] = useState([makeItem()])

  const addItem = () => setCreateItems(prev => [...prev, makeItem()])
  const removeItem = (idx) => setCreateItems(prev => prev.filter((_, i) => i !== idx))
  const patchItem = (idx, patch) => {
    setCreateItems(prev => {
      const next = prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
      const t = next[idx]
      if (('purchase_date' in patch && t.purchase_date) || ('duration_months' in patch && t.purchase_date)) {
        const m = Number(t.duration_months || 0) || 0
        next[idx] = { ...t, expiry_date: m > 0 ? addMonthsKeepDay(t.purchase_date, m) : '' }
      }
      return next
    })
  }
  const onPickImages = (idx, files) => {
    const arr = Array.from(files || []).slice(0, 5)
    patchItem(idx, { images: arr })
  }

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

  // ====== กรองระดับ "รายการ" แล้วจัดกลุ่มกลับเป็นใบ ======
  const filteredHeaders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return (warranties || [])
      .map(header => {
        // คำค้นระดับ "ใบ"
        const headerHay = [
          header.code, header.customerName, header.customerEmail, header.customerPhone,
        ].map(x => String(x || '').toLowerCase())
        const headerMatch = term ? headerHay.some(s => s.includes(term)) : false

        const items = (header.items || []).filter(it => {
          const code =
            it.statusCode ||
            STATUS_CODE_BY_LABEL[it.statusTag] ||
            deriveItemStatusCode(it, storeProfile.notifyDaysInAdvance)

          const passStatus = activeFilter === 'all' ? true : code === activeFilter
          if (!passStatus) return false

          // “ทั้งหมด” + คำค้นตรงกับตัวใบ → แสดงสินค้าทั้งใบ
          if (headerMatch && activeFilter === 'all') return true

          // ตรวจคำค้นระดับ "สินค้า"
          const itemHay = [
            it.productName, it.serial, it.coverageNote, it.note
          ].map(x => String(x || '').toLowerCase())

          const passSearch = term ? itemHay.some(s => s.includes(term)) : true

          // <<< จุดแก้ >>> ให้แท็บอื่นๆ โชว์รายการในใบนั้นที่ผ่านสถานะ แม้คำค้นจะตรงแค่ตัวใบ
          return passSearch || headerMatch
        })

        return { ...header, _filteredItems: items, _headerMatch: headerMatch }
      })
      .filter(h => h._filteredItems.length > 0)
  }, [warranties, activeFilter, searchTerm, storeProfile.notifyDaysInAdvance])

  const openProfileModal = () => {
    setProfileModalOpen(true)
    setProfileTab('info')
    setProfileMenuOpen(false)
    setModalError('')
    setProfileSubmitting(false)
    setPasswordSubmitting(false)
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
    if (!storeIdResolved) {
      setDashboardLoading(false)
      return
    }
    setDashboardError('')
    setDashboardLoading(true)
    try {
      const response = await api.get(`/store/${storeIdResolved}/dashboard`)
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
      if (merged.length === 1) merged.push(...defaultFilters.slice(1))
      setFilters(merged)
      setActiveFilter((current) => (merged.some((option) => option.value === current) ? current : 'all'))
      setDashboardError('')
    } catch (error) {
      setDashboardError(error?.response?.data?.error?.message || 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้')
    } finally {
      setDashboardLoading(false)
    }
  }, [storeIdResolved])

  /* ========== โหมดแก้ไข: state + auto-expiry ========== */
  const [editForm, setEditForm] = useState(null)
  const [manualExpiry, setManualExpiry] = useState(false)
  const computeExpiry = useCallback((purchaseISO, months) => {
    const m = Number(months || 0)
    if (!purchaseISO || !m) return ''
    return addMonthsKeepDay(purchaseISO, m)
  }, [])

  const openWarrantyModal = (mode, item = null) => {
    setModalMode(mode)
    setSelectedItem(item)
    setWarrantyModalError('')
    setWarrantySubmitting(false)
    setWarrantyImages(item?.images || [])

    if (mode === 'create') {
      setCreateItems([makeItem()])
      setEditForm(null)
      setManualExpiry(false)
    } else if (mode === 'edit' && item) {
      setEditForm({
        product_name: item.productName || '',
        duration_months: item.durationMonths ??
          Math.max(1, Math.round((item.durationDays || 30) / 30)),
        serial: item.serial || '',
        purchase_date: item.purchaseDate || '',
        expiry_date: item.expiryDate || '',
        warranty_terms: item.coverageNote || '',
        note: item.note || '',
      })
      setManualExpiry(false)
    }

    setWarrantyModalOpen(true)
  }

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    if (!storeIdResolved) return
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
      const response = await api.patch(`/store/${storeIdResolved}/profile`, payload)
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
    if (!storeIdResolved) return
    if (profilePasswords.newPassword !== profilePasswords.confirmPassword) {
      setModalError('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน')
      return
    }
    setPasswordSubmitting(true)
    setModalError('')
    try {
      await api.post(`/store/${storeIdResolved}/change-password`, {
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

  /* ========== บันทึกใบรับประกัน ========== */
  const handleWarrantySubmit = async (event) => {
    event.preventDefault()
    if (!storeIdResolved) return
    setWarrantySubmitting(true)
    setWarrantyModalError('')

    try {
      if (modalMode === 'edit' && selectedItem) {
        const months = Number(editForm?.duration_months || 0) || undefined
        const purchase = String(editForm?.purchase_date || '').trim()
        const expiryManual = String(editForm?.expiry_date || '').trim()
        const autoExpiry = months && purchase ? addMonthsKeepDay(purchase, months) : ''

        const fd = new FormData()
        fd.append('productName', String(editForm?.product_name || '').trim())
        fd.append('serial', String(editForm?.serial || '').trim())
        fd.append('purchaseDate', purchase)
        if (months !== undefined) fd.append('durationMonths', String(months))
        if (expiryManual || autoExpiry) {
          fd.append('expiryDate', manualExpiry ? expiryManual : (expiryManual || autoExpiry))
        }
        fd.append('coverageNote', String(editForm?.warranty_terms || '').trim())
        fd.append('note', String(editForm?.note || '').trim())

        await api.patch(`/warranty-items/${selectedItem.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        await fetchDashboard()
        setWarrantyModalOpen(false)
        setWarrantySubmitting(false)
        return
      }

      // โหมดสร้างหลายรายการในใบเดียว
      const payload = {
        items: createItems.map((it) => {
          const months = Number(it.duration_months || 0) || 12
          const autoExpiry = it.purchase_date ? addMonthsKeepDay(it.purchase_date, months) : ''
          return {
            customer_email: (it.customer_email || '').trim(),
            product_name: (it.product_name || '').trim(),
            purchase_date: (it.purchase_date || '').trim(),
            serial: (it.serial || '').trim(),
            warranty_terms: (it.warranty_terms || '').trim(),
            note: (it.note || '').trim(),
            duration_months: months,
            expiry_date: (it.expiry_date || autoExpiry || ''),
          }
        }),
      }

      const res = await api.post(`/store/${storeIdResolved}/warranties`, payload)
      const createdHeader = res.data?.data?.warranty

      // อัปโหลดรูปให้แต่ละ “รายการ” ที่สร้าง
      if (createdHeader?.items?.length) {
        for (let i = 0; i < createdHeader.items.length; i++) {
          const files = createItems[i]?.images || []
          if (files.length) {
            const fd = new FormData()
            files.forEach(f => fd.append('images', f))
            await api.post(`/warranty-items/${createdHeader.items[i].id}/images`, fd, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          }
        }
      }

      await fetchDashboard()
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
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (error) {
      setDashboardError(error?.response?.data?.error?.message || 'ไม่สามารถดาวน์โหลดใบรับประกันได้')
    } finally {
      setDownloadingPdfId(null)
    }
  }

  // อัปโหลด/ลบรูปที่ “รายการ”
  const handleImageUpload = async (files) => {
    if (!selectedItem?.id) return
    const formData = new FormData()
    files.forEach(file => formData.append('images', file))
    try {
      const response = await api.post(`/warranty-items/${selectedItem.id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const updatedItem = response.data?.data?.item
      if (updatedItem) {
        setWarrantyImages(updatedItem.images || [])
        await fetchDashboard()
      }
    } catch (error) {
      throw new Error(error?.response?.data?.error?.message || 'ไม่สามารถอัปโหลดรูปภาพได้')
    }
  }

  const handleImageDelete = async (imageId) => {
    if (!selectedItem?.id) return
    try {
      const response = await api.delete(`/warranty-items/${selectedItem.id}/images/${imageId}`)
      const updatedItem = response.data?.data?.item
      if (updatedItem) {
        setWarrantyImages(updatedItem.images || [])
        await fetchDashboard()
      }
    } catch (error) {
      throw new Error(error?.response?.data?.error?.message || 'ไม่สามารถลบรูปภาพได้')
    }
  }

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
                <img src={profileAvatarSrc} alt="Store profile" className="h-10 w-10 rounded-full object-cover" />
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
                    <img src={profileAvatarSrc} alt="Store profile" className="h-12 w-12 rounded-full object-cover" />
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
          ) : !storeIdResolved ? (
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
                  <div className="flex gap-2 rounded-full bg-white p-1"></div>
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
                    placeholder="ค้นหาด้วยรหัสใบรับประกัน, ชื่อลูกค้า, อีเมลลูกค้า, ชื่อสินค้า"
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

              {/* การ์ดสีส้ม: แสดงใบที่มีรายการผ่านเงื่อนไข */}
              <div className="mb-8 grid gap-4">
                {filteredHeaders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                    ยังไม่มีใบรับประกัน
                  </div>
                ) : (
                  filteredHeaders.map(header => {
                    const expanded = !!expandedByHeader[header.id]
                    return (
                      <div key={header.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-lg font-semibold text-gray-900">Warranty Card</div>
                            <div className="mt-2 grid gap-1 text-sm text-gray-700 md:grid-cols-2">
                              <div>รหัสใบรับประกัน: <span className="font-medium text-gray-900">{header.code || '-'}</span></div>
                              <div>ลูกค้า: <span className="font-medium text-gray-900">{header.customerName || '-'}</span></div>
                              <div>เบอร์โทรศัพท์: <span className="font-medium text-gray-900">{header.customerPhone || '-'}</span></div>
                              <div>อีเมลลูกค้า: <span className="font-medium text-gray-900">{header.customerEmail || '-'}</span></div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => header && handleDownloadPdf(header.id)}
                              disabled={!header || downloadingPdfId === header.id}
                              className={`h-10 min-w-[96px] rounded-full bg-sky-500 px-5 text-sm font-medium text-white shadow transition ${!header || downloadingPdfId === header.id ? 'cursor-not-allowed opacity-70' : 'hover:bg-sky-400'}`}
                            >
                              {downloadingPdfId === header.id ? 'กำลังดาวน์โหลด…' : 'PDF'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedByHeader(prev => ({ ...prev, [header.id]: !prev[header.id] }))}
                              className="rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-100"
                            >
                              {expanded ? 'ซ่อนรายละเอียด' : 'รายละเอียดเพิ่มเติม'}
                            </button>
                          </div>
                        </div>

                        {/* สรุปรายการในใบ */}
                        <p className="mt-4 rounded-xl bg-white/60 p-3 text-xs text-amber-700">
                          ใบนี้มีทั้งหมด {header._filteredItems?.length ?? header.items?.length ?? 0} รายการ
                        </p>

                        {/* รายการในใบ */}
                        {expanded && (
                          <div className="mt-4 grid gap-4">
                            {(header._filteredItems || []).map((it) => (
                              <div key={it.id} className="flex flex-col justify-between gap-6 rounded-2xl bg-white p-4 shadow ring-1 ring-black/5 md:flex-row">
                                <div className="flex-1 space-y-3">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-base font-semibold text-gray-900">{it.productName}</div>
                                    <StatusBadge label={it.statusTag} className={it.statusColor} />
                                    <span className="text-xs text-gray-400">#{it.id}</span>
                                  </div>
                                  <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                                    <div>Serial No.: <span className="font-medium text-gray-900">{it.serial || '-'}</span></div>
                                    <div>วันที่ซื้อ: <span className="font-medium text-gray-900">{it.purchaseDate || '-'}</span></div>
                                    <div>วันหมดอายุ: <span className="font-medium text-gray-900">{it.expiryDate || '-'}</span></div>
                                    <div>จำนวนวันคงเหลือ: <span className="font-medium text-gray-900">{it.daysLeft ?? 0} วัน</span></div>
                                  </div>
                                  <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-800">{it.coverageNote || '-'}</p>

                                  {it.images && it.images.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-sm font-medium text-gray-700">รูปภาพประกอบ</div>
                                      <div className="flex gap-2 overflow-x-auto">
                                        {it.images.map((image, index) => (
                                          <div key={image.id || index} className="group relative flex-shrink-0 cursor-pointer">
                                            <img
                                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${image.url}`}
                                              alt={image.originalName || 'Warranty image'}
                                              className="h-20 w-20 rounded-lg object-cover transition-transform group-hover:scale-105"
                                              onClick={() => setImagePreview({ open: true, images: it.images, index })}
                                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                                            />
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
                                  <div className="relative h-32 w-40 overflow-hidden rounded-2xl border border-gray-300 bg-gray-50">
                                    {it.images && it.images.length > 0 ? (
                                      <div
                                        className="group relative h-full w-full cursor-pointer"
                                        onClick={() => setImagePreview({ open: true, images: it.images, index: 0 })}
                                      >
                                        <img
                                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${it.images[0].url}`}
                                          alt="Warranty preview"
                                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        {it.images.length > 1 && (
                                          <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                                            +{it.images.length - 1}
                                          </div>
                                        )}
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
                                    onClick={() => openWarrantyModal('edit', it)}
                                    className="flex items-center gap-2 rounded-full border border-sky-500 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50"
                                  >
                                    <span>แก้ไข</span>
                                    <span aria-hidden>✏️</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
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
                  <img src={profileAvatarSrc} alt="Store profile" className="h-12 w-12 rounded-full object-cover" />
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
                  onClick={() => { setProfileTab('info'); setModalError('') }}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-medium ${profileTab === 'info' ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-gray-500'}`}
                >
                  ข้อมูลร้านค้า
                </button>
                <button
                  type="button"
                  onClick={() => { setProfileTab('password'); setModalError('') }}
                  className={`flex-1 rounded-2xl px-4 py-2 text-sm font-medium ${profileTab === 'password' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-gray-500'}`}
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>

            {profileTab === 'info' ? (
              <form onSubmit={handleProfileSubmit} className="px-6 pb-6">
                <input ref={profileImageInputRef} accept="image/*" className="hidden" onChange={handleProfileAvatarSelect} type="file" />
                <div className="mb-4 flex items-center gap-4">
                  {profileAvatarSrc ? (
                    <img src={profileAvatarSrc} alt="Store profile" className="h-16 w-16 rounded-full object-cover" />
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
                        value={storeProfile[key] ?? ''}
                        onChange={(e) => setStoreProfile((prev) => ({ ...prev, [key]: e.target.value }))}
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
                    className={`rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow transition ${profileSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-sky-500'}`}
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
                        onChange={(e) => setProfilePasswords((prev) => ({ ...prev, [key]: e.target.value }))}
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
                    className={`rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow transition ${passwordSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-emerald-400'}`}
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
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            {/* header */}
            <div className="flex items-center justify-between rounded-t-3xl bg-sky-600 px-6 py-4 text-white">
              <div>
                <div className="text-base font-semibold">{modalMode === 'create' ? 'สร้างใบรับประกันใหม่' : 'แก้ไขรายการสินค้า'}</div>
                {modalMode === 'create' && <div className="text-xs text-sky-100">ใบรับประกัน 1 ใบ สามารถเพิ่มสินค้าหลายรายการได้</div>}
              </div>
              <button
                type="button"
                onClick={() => { setWarrantyModalOpen(false); setWarrantyModalError(''); setWarrantySubmitting(false) }}
                className="text-2xl text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>

            <form className="grid" onSubmit={handleWarrantySubmit}>
              <div className="max-h-[85vh] overflow-y-auto px-6 pt-5 pb-3">
                {warrantyModalError && (
                  <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{warrantyModalError}</div>
                )}

                {modalMode === 'edit' ? (
                  <>
                    {/* ฟอร์มแก้ไขแบบ controlled + auto-expiry */}
                    <label className="text-sm text-gray-600">
                      ชื่อสินค้า
                      <input
                        name="product_name"
                        value={editForm?.product_name ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, product_name: e.target.value }))}
                        className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                        placeholder="กรอกชื่อสินค้า"
                        type="text"
                        required
                      />
                    </label>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-gray-600">
                        ระยะเวลา (เดือน)
                        <select
                          name="duration_months"
                          value={editForm?.duration_months ?? 12}
                          onChange={e => {
                            const v = Number(e.target.value || 12)
                            setEditForm(f => {
                              const next = { ...f, duration_months: v }
                              if (!manualExpiry) next.expiry_date = computeExpiry(next.purchase_date, v)
                              return next
                            })
                          }}
                          className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                        >
                          {[6, 12, 18, 24].map(month => (
                            <option key={month} value={month}>{month} เดือน</option>
                          ))}
                        </select>
                      </label>

                      <label className="text-sm text-gray-600">
                        Serial No.
                        <input
                          name="serial"
                          value={editForm?.serial ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, serial: e.target.value }))}
                          className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                          placeholder="กรอก Serial No."
                          type="text"
                          required
                        />
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-gray-600">
                        วันเริ่ม
                        <input
                          name="purchase_date"
                          value={editForm?.purchase_date ?? ''}
                          onChange={e => {
                            const v = e.target.value
                            setEditForm(f => {
                              const next = { ...f, purchase_date: v }
                              if (!manualExpiry) next.expiry_date = computeExpiry(v, next.duration_months)
                              return next
                            })
                          }}
                          className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                          type="date"
                          required
                        />
                      </label>
                      <label className="text-sm text-gray-600">
                        วันหมดอายุ (คำนวณอัตโนมัติหากไม่ได้แก้ไข)
                        <input
                          name="expiry_date"
                          value={editForm?.expiry_date ?? ''}
                          onChange={e => {
                            setManualExpiry(true)
                            setEditForm(f => ({ ...f, expiry_date: e.target.value }))
                          }}
                          onBlur={() => {
                            setManualExpiry(prev => (editForm?.expiry_date ? prev : false))
                          }}
                          className="mt-1 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                          type="date"
                        />
                      </label>
                    </div>

                    <label className="mt-3 text-sm text-gray-600">
                      เงื่อนไขการรับประกัน
                      <textarea
                        name="warranty_terms"
                        value={editForm?.warranty_terms ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, warranty_terms: e.target.value }))}
                        className="mt-1 min-h-[96px] w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                        placeholder="กรอกเงื่อนไขการรับประกัน"
                        required
                      />
                    </label>

                    <div className="mt-3 space-y-2">
                      <label className="text-sm text-gray-600">รูปภาพประกอบ</label>
                      <ImageUpload
                        images={warrantyImages}
                        onUpload={handleImageUpload}
                        onDelete={handleImageDelete}
                        maxImages={5}
                        disabled={warrantySubmitting}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* โหมดสร้างหลายรายการในใบเดียว */}
                    {createItems.map((it, idx) => (
                      <div key={idx} className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-semibold text-sky-700">รายการที่ {idx + 1}</div>
                          {createItems.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="text-xs text-rose-600 hover:underline">
                              ลบรายการ
                            </button>
                          )}
                        </div>

                        <label className="text-sm text-gray-600 block">
                          อีเมลลูกค้า
                          <input
                            value={it.customer_email}
                            onChange={e => patchItem(idx, { customer_email: e.target.value })}
                            className="mt-1 w-full rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                            placeholder="กรอกอีเมลลูกค้า"
                            type="email"
                            required
                          />
                        </label>

                        <label className="mt-3 text-sm text-gray-600 block">
                          ชื่อสินค้า
                          <input
                            value={it.product_name}
                            onChange={e => patchItem(idx, { product_name: e.target.value })}
                            className="mt-1 w-full rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                            placeholder="กรอกชื่อสินค้า"
                            type="text"
                            required
                          />
                        </label>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm text-gray-600 block">
                            ระยะเวลา (เดือน)
                            <select
                              value={it.duration_months}
                              onChange={e => patchItem(idx, { duration_months: Number(e.target.value || 12) })}
                              className="mt-1 w-full rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                            >
                              {[6, 12, 18, 24].map(month => (
                                <option key={month} value={month}>{month} เดือน</option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm text-gray-600 block">
                            Serial No. (สร้างอัตโนมัติ)
                            <input
                              value={it.serial}
                              onChange={e => patchItem(idx, { serial: e.target.value })}
                              className="mt-1 w-full rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                              placeholder="SN001"
                              type="text"
                              required
                            />
                          </label>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm text-gray-600 block">
                            วันเริ่ม
                            <input
                              value={it.purchase_date}
                              onChange={e => patchItem(idx, { purchase_date: e.target.value })}
                              className="mt-1 w-full rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                              type="date"
                              required
                            />
                          </label>
                          <label className="text-sm text-gray-600 block">
                            วันหมดอายุ (คำนวณอัตโนมัติ)
                            <input
                              value={it.expiry_date}
                              onChange={e => patchItem(idx, { expiry_date: e.target.value })}
                              className="mt-1 w-full rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                              type="date"
                            />
                          </label>
                        </div>

                        <label className="mt-3 text-sm text-gray-600 block">
                          เงื่อนไขการรับประกัน
                          <textarea
                            value={it.warranty_terms}
                            onChange={e => patchItem(idx, { warranty_terms: e.target.value })}
                            className="mt-1 min-h-[96px] w-full rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                            placeholder="กรอกเงื่อนไขการรับประกัน"
                            required
                          />
                        </label>

                        {/* แนบรูปตอนสร้างเลย */}
                        <div className="mt-3">
                          <div className="text-sm text-gray-600">รูปภาพประกอบ (อัปโหลดได้สูงสุด 5 รูป)</div>
                          <div className="mt-2 rounded-2xl border border-dashed border-gray-300 p-4">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => onPickImages(idx, e.target.files)}
                            />
                            {it.images?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {it.images.map((f, i) => (
                                  <div key={i} className="h-14 w-14 overflow-hidden rounded-lg border">
                                    <img
                                      src={URL.createObjectURL(f)}
                                      alt={`preview-${i}`}
                                      className="h-full w-full object-cover"
                                      onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 text-xs text-gray-500">รองรับ JPG, PNG, GIF, WebP (สูงสุด 5MB, 5 รูป)</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pb-2">
                      <button
                        type="button"
                        onClick={addItem}
                        className="rounded-full border border-sky-500 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50"
                      >
                        ➕ เพิ่มสินค้า
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* footer */}
              <div className="sticky bottom-0 z-10 rounded-b-3xl bg-white px-6 py-4 shadow-[0_-6px_12px_-8px_rgba(0,0,0,0.08)]">
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={warrantySubmitting}
                    className={`rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white shadow transition ${warrantySubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-sky-500'}`}
                  >
                    {warrantySubmitting ? 'กำลังบันทึก...' : modalMode === 'create' ? 'บันทึก' : 'ยืนยัน'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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
