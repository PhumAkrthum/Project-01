import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';

const STATUS_LABEL = {
  active: 'ใช้งานได้',
  nearing_expiration: 'ใกล้หมดอายุ',
  expired: 'หมดอายุ',
};

const FILTERS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'active', label: 'ใช้งานได้' },
  { value: 'nearing_expiration', label: 'ใกล้หมดอายุ' },
  { value: 'expired', label: 'หมดอายุ' },
];

function fmt(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return '-'; }
}

export default function CustomerWarranty() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [totals, setTotals] = useState({ all: 0, active: 0, nearing_expiration: 0, expired: 0 });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [noteModal, setNoteModal] = useState({ open: false, itemId: null, name: '', note: '' });

  async function fetchData() {
    setLoading(true);
    try {
      const r = await api.get('/customer/warranties', { params: { q: query, status: filter } });
      setTotals(r.data.totals);
      setData(r.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [filter]);

  // flatten เพื่อแสดง “ระดับรายการสินค้า”
  const flatItems = useMemo(() => {
    const rows = [];
    data.forEach(w => {
      const storeName = w.store?.storeProfile?.storeName || '-';
      const phone = w.store?.storeProfile?.phone || '-';
      (w.items || []).forEach(it => {
        rows.push({
          warrantyId: w.id,
          code: w.code,
          status: it._status,
          daysLeft: it._daysLeft,
          storeName,
          phone,
          item: it,
        });
      });
    });
    return rows;
  }, [data]);

  async function onSaveNote() {
    await api.patch(`/customer/warranty-items/${noteModal.itemId}/note`, { note: noteModal.note });
    setNoteModal({ open: false, itemId: null, name: '', note: '' });
    fetchData();
  }

  const StatusPill = ({ status }) => {
    const map = {
      active: 'bg-green-100 text-green-800',
      nearing_expiration: 'bg-amber-100 text-amber-800',
      expired: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] || ''}`}>
        {STATUS_LABEL[status] || '-'}
      </span>
    );
  };

  function firstImageSrc(images) {
    if (!images) return null;
    if (Array.isArray(images) && images.length) {
      const first = images[0];
      if (typeof first === 'string') return absolutize(first);
      if (first?.url) return absolutize(first.url);
      if (first?.path) return absolutize(first.path);
    }
    return null;
  }

  function absolutize(p) {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    const base = api.defaults.baseURL.replace(/\/$/, '');
    return `${base}/${String(p).replace(/^\/+/, '')}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Warranty</h1>
        <p className="text-gray-600 mt-1">
          ยินดีต้อนรับ, คุณ{user?.customerProfile?.firstName || ''} {user?.customerProfile?.lastName || ''}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="ในระบบทั้งหมด" value={totals.all} />
        <SummaryCard label="ใช้งานได้" value={totals.active} tone="green" />
        <SummaryCard label="ใกล้หมดอายุ" value={totals.nearing_expiration} tone="amber" />
        <SummaryCard label="หมดอายุ" value={totals.expired} tone="red" />
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-4">
        <div className="flex-1">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาด้วยชื่อสินค้า, ร้านค้า, รหัสรับประกัน"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={fetchData} className="absolute right-1 top-1 bottom-1 px-4 rounded-lg bg-blue-600 text-white text-sm">
              ค้นหา
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full border text-sm ${
                filter === f.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">กำลังโหลด...</div>
      ) : flatItems.length === 0 ? (
        <div className="p-6 text-center text-gray-500 bg-white rounded-xl shadow-sm">ไม่พบข้อมูล</div>
      ) : (
        <div className="space-y-4">
          {flatItems.map(row => {
            const img = firstImageSrc(row.item.images);
            return (
              <article key={`${row.warrantyId}-${row.item.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold">{row.item.productName}</h3>
                      <StatusPill status={row.status} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-1 text-sm">
                      <Field label="รหัสรับประกัน" value={row.code} />
                      <Field label="ร้านค้า" value={row.storeName} />
                      <Field label="เบอร์โทรศัพท์" value={row.phone} />
                      <Field label="เวลาที่เหลือ" value={row.status === 'expired' ? 'หมดอายุ' : `${row.daysLeft ?? '-'} วัน`} />
                      <Field label="วันที่ซื้อ" value={fmt(row.item.purchaseDate)} />
                      <Field label="วันหมดอายุ" value={fmt(row.item.expiryDate)} />
                      <Field label="เงื่อนไขการรับประกัน" value={row.item.coverageNote || '-'} className="md:col-span-2" />
                    </div>

                    <div className="mt-3">
                      <div className="text-sm text-gray-500 mb-1">หมายเหตุของฉัน</div>
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 text-sm text-gray-800 min-h-[44px]">
                        {row.item.customerNote?.trim() ? row.item.customerNote : '-'}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setNoteModal({ open: true, itemId: row.item.id, name: row.item.productName, note: row.item.customerNote || '' })}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        📝 เพิ่มหมายเหตุ
                      </button>

                      <a
                        href={`${api.defaults.baseURL.replace(/\/$/, '')}/customer/warranties/${row.warrantyId}/pdf`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        ⬇️ ดาวน์โหลด PDF
                      </a>
                    </div>
                  </div>

                  <div className="w-full md:w-56">
                    <div className="aspect-video bg-gray-100 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center text-gray-400 text-sm">
                      {img ? <img className="w-full h-full object-cover" src={img} alt="ภาพสินค้า" /> : <span>ไม่มีรูปภาพ</span>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {noteModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">เพิ่มหมายเหตุ - {noteModal.name}</h4>
              <button onClick={() => setNoteModal({ open: false, itemId: null, name: '', note: '' })}>✕</button>
            </div>
            <textarea
              rows={5}
              value={noteModal.note}
              onChange={e => setNoteModal({ ...noteModal, note: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="พิมพ์หมายเหตุของคุณ"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setNoteModal({ open: false, itemId: null, name: '', note: '' })} className="px-4 py-2 rounded-lg border">
                ยกเลิก
              </button>
              <button onClick={onSaveNote} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  const toneMap = { green: 'bg-green-50', amber: 'bg-amber-50', red: 'bg-red-50', default: 'bg-gray-50' };
  return (
    <div className={`rounded-xl p-4 ${toneMap[tone] || toneMap.default} border border-gray-200`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-gray-600 text-sm">{label}</div>
    </div>
  );
}

function Field({ label, value, className = '' }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-gray-800">{value ?? '-'}</span>
    </div>
  );
}
