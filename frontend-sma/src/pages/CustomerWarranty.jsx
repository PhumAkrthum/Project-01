// frontend-sma/src/pages/CustomerWarranty.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

const STATUS_META = {
  active: { label: "ใช้งานได้", cls: "text-emerald-700 bg-emerald-50" },
  nearing_expiration: { label: "ใกล้หมดอายุ", cls: "text-amber-700 bg-amber-50" },
  expired: { label: "หมดอายุ", cls: "text-rose-700 bg-rose-50" },
};

const FILTERS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "active", label: "ใช้งานได้" },
  { value: "nearing_expiration", label: "ใกล้หมดอายุ" },
  { value: "expired", label: "หมดอายุ" },
];

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  } catch {
    return String(d).slice(0, 10);
  }
};

function absolutize(p) {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  return `${base}/${String(p).replace(/^\/+/, "")}`;
}
function firstImageSrc(images) {
  if (!images) return null;
  if (Array.isArray(images) && images.length) {
    const first = images[0];
    if (typeof first === "string") return absolutize(first);
    if (first?.url) return absolutize(first.url);
    if (first?.path) return absolutize(first.path);
  }
  return null;
}

/* UI atoms */
function StatBox({ value, label, className = "" }) {
  return (
    <div className={`rounded-2xl border border-sky-100 bg-white px-6 py-4 shadow-sm ${className}`}>
      <div className="text-3xl font-extrabold text-gray-900">{value ?? 0}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}
function Pill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {children}
    </span>
  );
}

export default function CustomerWarranty() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [totals, setTotals] = useState({ all: 0, active: 0, nearing_expiration: 0, expired: 0 });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW: สถานะโชว์/ซ่อนรายการต่อใบ (เหมือนฝั่งร้านค้า)
  const [expandedByHeader, setExpandedByHeader] = useState({}); // { [warrantyId]: boolean }

  // Pagination (5 ใบ/หน้า)
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  const [noteModal, setNoteModal] = useState({ open: false, itemId: null, name: "", note: "" });

  async function fetchData(opts = {}) {
    setLoading(true);
    try {
      const r = await api.get("/customer/warranties", {
        params: { q: opts.q ?? query, status: opts.filter ?? filter },
      });
      setTotals(r.data?.totals || { all: 0, active: 0, nearing_expiration: 0, expired: 0 });
      const rows = r.data?.data || [];
      setData(rows);
      setPage(1); // รีเซ็ตหน้าเมื่อมีการค้น/เปลี่ยนตัวกรอง

      // รีเซ็ต expanded เฉพาะใบที่ไม่มีในเพจใหม่แล้ว เพื่อลด state ค้าง
      setExpandedByHeader((prev) => {
        const next = {};
        for (const w of rows) if (prev[w.id]) next[w.id] = true;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const hasData = useMemo(() => Array.isArray(data) && data.length > 0, [data]);

  // คำนวณหน้าปัจจุบัน
  const { totalPages, currentPage, paginated } = useMemo(() => {
    const totalPagesCalc = Math.max(1, Math.ceil((data?.length || 0) / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPagesCalc);
    const start = (safePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return {
      totalPages: totalPagesCalc,
      currentPage: safePage,
      paginated: (data || []).slice(start, end),
    };
  }, [data, page]);

  useEffect(() => {
    setPage((p) => (p !== currentPage ? currentPage : p));
  }, [currentPage]);

  async function onSaveNote() {
    await api.patch(`/customer/warranty-items/${noteModal.itemId}/note`, { note: noteModal.note });
    setNoteModal({ open: false, itemId: null, name: "", note: "" });
    fetchData();
  }

  function onDownloadPdf(warrantyId) {
    const href = `${(api.defaults.baseURL || "").replace(/\/$/, "")}/customer/warranties/${warrantyId}/pdf`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function usePageNumbers(total, current, windowSize = 5) {
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, Math.min(start, end - windowSize + 1));
    const arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }
  const pageNumbers = usePageNumbers(totalPages, currentPage, 5);

  return (
    <div className="min-h-screen bg-sky-50/80 pb-12">
      {/* ไม่มี header ซ้อน: ใช้หัวเรื่องอยู่ในกล่องหลักแทน */}
      <main className="mx-auto max-w-6xl px-4 pt-6">
        <div className="rounded-3xl border border-sky-100 bg-gradient-to-b from-white to-sky-50 p-6 shadow-xl">
          {/* หัวเรื่องในกล่อง */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/90 text-2xl text-white shadow-lg">🛡️</div>
              <div>
                <div className="text-lg font-semibold text-gray-900">Warranty</div>
                <div className="text-sm text-gray-500">การ์ดรับประกันของคุณทั้งหมดในที่เดียว</div>
              </div>
            </div>
            <div className="hidden text-right text-sm md:block">
              <div className="font-medium text-gray-900">
                สวัสดี, {user?.customerProfile?.firstName || ""} {user?.customerProfile?.lastName || ""}
              </div>
              <div className="text-xs text-gray-500">ยินดีต้อนรับกลับมา</div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatBox value={totals.all} label="ในระบบทั้งหมด" />
            <StatBox value={totals.active} label="ใช้งานได้" className="bg-emerald-50/60" />
            <StatBox value={totals.nearing_expiration} label="ใกล้หมดอายุ" className="bg-amber-50/60" />
            <StatBox value={totals.expired} label="หมดอายุ" className="bg-rose-50/60" />
          </div>

          {/* Search + Filters */}
          <div className="mt-6 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="flex items-center rounded-2xl bg-white px-4 py-2 shadow ring-1 ring-black/5">
                <span className="text-gray-400">🔍</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchData({ q: query })}
                  placeholder="ค้นหาด้วยชื่อสินค้า, ร้านค้า, รหัสรับประกัน"
                  className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                />
                <button
                  onClick={() => fetchData({ q: query })}
                  className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-sky-500"
                >
                  ค้นหา
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const isActive = filter === f.value;
                const activeClass = isActive
                  ? f.value === "active"
                    ? "bg-emerald-500 text-white"
                    : f.value === "nearing_expiration"
                    ? "bg-amber-500 text-white"
                    : f.value === "expired"
                    ? "bg-rose-500 text-white"
                    : "bg-gray-900 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50";
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`rounded-full px-3 py-2 text-xs font-medium shadow-sm transition ${activeClass}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards */}
          <div className="mt-6 space-y-5">
            {loading && (
              <div className="rounded-2xl border border-black/10 bg-white p-6 text-center text-gray-600 shadow-sm">
                กำลังโหลดข้อมูล…
              </div>
            )}

            {!loading && !hasData && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
                ไม่พบข้อมูล
              </div>
            )}

            {!loading &&
              hasData &&
              paginated.map((w) => {
                const storeName = w?.store?.storeProfile?.storeName || w?.store?.storeName || "ร้านค้า";
                const phone = w?.store?.storeProfile?.phone || "-";
                const expanded = !!expandedByHeader[w.id];
                const itemsCount = (w.items || []).length;

                return (
                  <article key={w.id} className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-gray-900">Warranty Card</div>
                        <div className="mt-2 grid gap-1 text-sm text-gray-700 md:grid-cols-2">
                          <div>รหัสใบรับประกัน: <span className="font-medium text-gray-900">{w.code}</span></div>
                          <div>ร้านค้า: <span className="font-medium text-gray-900">{storeName}</span></div>
                          <div>เบอร์โทรศัพท์: <span className="font-medium text-gray-900">{phone}</span></div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => onDownloadPdf(w.id)}
                          className="h-10 min-w-[96px] rounded-full bg-sky-500 px-5 text-sm font-medium text-white shadow transition hover:bg-sky-400"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedByHeader((prev) => ({ ...prev, [w.id]: !prev[w.id] }))}
                          className="rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-100"
                        >
                          {expanded ? "ซ่อนรายละเอียด" : "รายละเอียดเพิ่มเติม"}
                        </button>
                      </div>
                    </div>

                    {/* สรุปรายการในใบ */}
                    <p className="mt-4 rounded-xl bg-white/60 p-3 text-xs text-amber-700">
                      ใบนี้มีทั้งหมด {itemsCount} รายการ
                    </p>

                    {/* รายการในใบ (ซ่อน/โชว์ได้) */}
                    {expanded && (
                      <div className="mt-4 grid gap-4">
                        {(w.items || []).map((it) => {
                          const meta = STATUS_META[it._status] || STATUS_META.active;
                          const img = firstImageSrc(it.images);
                          return (
                            <div key={it.id} className="flex flex-col justify-between gap-6 rounded-2xl bg-white p-4 shadow ring-1 ring-black/5 md:flex-row">
                              <div className="flex-1 space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="text-base font-semibold text-gray-900">{it.productName || "-"}</div>
                                  <Pill className={meta.cls}>{meta.label}</Pill>
                                  {Number.isFinite(it._daysLeft) && <span className="text-xs text-gray-500">({it._daysLeft} วัน)</span>}
                                  <span className="text-xs text-gray-400">#{it.id}</span>
                                </div>

                                <div className="grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                                  <div>Serial No.: <span className="font-medium text-gray-900">{it.serial || "-"}</span></div>
                                  <div>วันที่ซื้อ: <span className="font-medium text-gray-900">{fmtDate(it.purchaseDate)}</span></div>
                                  <div>วันหมดอายุ: <span className="font-medium text-gray-900">{fmtDate(it.expiryDate)}</span></div>
                                  <div>เงื่อนไขรับประกัน: <span className="font-medium text-gray-900">{it.coverageNote || "-"}</span></div>
                                </div>

                                <div>
                                  <div className="text-sm font-medium text-gray-700">หมายเหตุของฉัน</div>
                                  <div className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                    {it.customerNote?.trim() ? it.customerNote : "-"}
                                  </div>
                                  <div className="mt-2">
                                    <button
                                      onClick={() => setNoteModal({ open: true, itemId: it.id, name: it.productName, note: it.customerNote || "" })}
                                      className="rounded-full border border-sky-500 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50"
                                    >
                                      เพิ่มหมายเหตุ
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="grid place-items-center">
                                <div className="relative h-32 w-40 overflow-hidden rounded-2xl border border-gray-300 bg-gray-50">
                                  {img ? (
                                    <img src={img} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                                      <div className="text-center">
                                        <div className="mb-1 text-2xl">📷</div>
                                        <div>ไม่มีรูปภาพ</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
          </div>

          {/* Pagination */}
          {!loading && hasData && (
            <div className="mt-6 flex flex-col items-center gap-3 md:flex-row md:justify-between">
              <div className="text-xs text-gray-500">
                หน้า <span className="font-medium text-gray-900">{currentPage}</span> จาก{" "}
                <span className="font-medium text-gray-900">{totalPages}</span>
                {" • "}
                แสดง {Math.min((currentPage - 1) * PAGE_SIZE + 1, data.length)}–
                {Math.min(currentPage * PAGE_SIZE, data.length)} จาก {data.length} ใบ
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`rounded-full px-3 py-2 text-xs font-medium shadow-sm ${
                    currentPage === 1 ? "cursor-not-allowed bg-white text-gray-300 ring-1 ring-black/10" : "bg-white text-gray-700 ring-1 ring-black/10 hover:bg-gray-50"
                  }`}
                >
                  ก่อนหน้า
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`rounded-full px-3 py-2 text-xs font-medium shadow-sm ${
                      n === currentPage ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-black/10 hover:bg-gray-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`rounded-full px-3 py-2 text-xs font-medium shadow-sm ${
                    currentPage === totalPages ? "cursor-not-allowed bg-white text-gray-300 ring-1 ring-black/10" : "bg-white text-gray-700 ring-1 ring-black/10 hover:bg-gray-50"
                  }`}
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal เพิ่มหมายเหตุ */}
      {noteModal.open && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-3xl bg-sky-600 px-6 py-4 text-white">
              <div className="text-base font-semibold">เพิ่มหมายเหตุ - {noteModal.name}</div>
              <button
                onClick={() => setNoteModal({ open: false, itemId: null, name: "", note: "" })}
                className="text-2xl text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-5">
              <textarea
                rows={5}
                value={noteModal.note}
                onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-gray-900 focus:border-sky-300 focus:outline-none"
                placeholder="พิมพ์หมายเหตุของคุณ"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setNoteModal({ open: false, itemId: null, name: "", note: "" })}
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-600 shadow ring-1 ring-black/10 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={onSaveNote}
                  className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-sky-500"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
