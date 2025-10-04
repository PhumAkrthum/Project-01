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

function StatBox({ value, label, className = "" }) {
  return (
    <div className={`rounded-2xl border border-black/10 bg-white px-6 py-4 shadow-sm ${className}`}>
      <div className="text-3xl font-extrabold text-gray-900">{value ?? 0}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export default function CustomerWarranty() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [totals, setTotals] = useState({ all: 0, active: 0, nearing_expiration: 0, expired: 0 });
  const [data, setData] = useState([]); // <-- โครงสร้างเป็นระดับ "ใบ" อยู่แล้ว
  const [loading, setLoading] = useState(true);

  const [noteModal, setNoteModal] = useState({ open: false, itemId: null, name: "", note: "" });

  async function fetchData(opts = {}) {
    setLoading(true);
    try {
      const r = await api.get("/customer/warranties", {
        params: { q: opts.q ?? query, status: opts.filter ?? filter },
      });
      setTotals(r.data?.totals || { all: 0, active: 0, nearing_expiration: 0, expired: 0 });
      setData(r.data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const hasData = useMemo(() => Array.isArray(data) && data.length > 0, [data]);

  async function onSaveNote() {
    await api.patch(`/customer/warranty-items/${noteModal.itemId}/note`, { note: noteModal.note });
    setNoteModal({ open: false, itemId: null, name: "", note: "" });
    fetchData();
  }

  function onDownloadPdf(warrantyId) {
    const href = `${(api.defaults.baseURL || "").replace(/\/$/, "")}/customer/warranties/${warrantyId}/pdf`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="bg-[#f3f7ff]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Warranty</h1>
          <p className="text-gray-600 mt-1">
            ยินดีต้อนรับ, คุณ{user?.customerProfile?.firstName || ""}{" "}
            {user?.customerProfile?.lastName || ""}
          </p>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatBox value={totals.all} label="ในระบบทั้งหมด" />
          <StatBox value={totals.active} label="ใช้งานได้" className="bg-green-50/60" />
          <StatBox value={totals.nearing_expiration} label="ใกล้หมดอายุ" className="bg-amber-50/60" />
          <StatBox value={totals.expired} label="หมดอายุ" className="bg-rose-50/60" />
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-4">
          <div className="flex-1">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData({ q: query })}
                placeholder="ค้นหาด้วยชื่อสินค้า, ร้านค้า, รหัสรับประกัน"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => fetchData({ q: query })}
                className="absolute right-1 top-1 bottom-1 px-4 rounded-lg bg-blue-600 text-white text-sm"
              >
                ค้นหา
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full border text-sm ${
                  filter === f.value ? "bg-gray-900 text-white" : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards แบบ “ใบ + รายการภายในใบ” */}
        <div className="space-y-5">
          {loading && (
            <div className="rounded-2xl border border-black/10 bg-white p-6 text-center text-gray-600 shadow-sm">
              กำลังโหลดข้อมูล…
            </div>
          )}

          {!loading && !hasData && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center text-gray-500">
              ไม่พบข้อมูล
            </div>
          )}

          {!loading &&
            hasData &&
            data.map((w) => {
              const storeName =
                w?.store?.storeProfile?.storeName || w?.store?.storeName || "ร้านค้า";
              const phone = w?.store?.storeProfile?.phone || "-";

              return (
                <article
                  key={w.id}
                  className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60 shadow-sm"
                >
                  {/* หัวใบ */}
                  <div className="flex items-start gap-4 border-b border-amber-200/70 p-4">
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900">Warranty Card</div>
                      <div className="mt-1 text-sm text-gray-700">
                        <span className="font-medium">รหัสใบรับประกัน:</span>{" "}
                        <span className="font-mono">{w.code}</span>
                      </div>
                      <div className="mt-0.5 text-sm text-gray-700">
                        <span className="font-medium">ร้านค้า:</span> {storeName}{" "}
                        <span className="ml-4 font-medium">เบอร์โทรศัพท์:</span> {phone}
                      </div>
                    </div>

                    <button
                      onClick={() => onDownloadPdf(w.id)}
                      className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                    >
                      PDF
                    </button>
                  </div>

                  {/* รายการในใบ */}
                  <div className="divide-y divide-amber-200/70">
                    {(w.items || []).map((it) => {
                      const meta = STATUS_META[it._status] || STATUS_META.active;
                      const img = firstImageSrc(it.images);

                      return (
                        <div key={it.id} className="grid grid-cols-1 gap-4 p-4 md:grid-cols-12">
                          <div className="md:col-span-8">
                            <div className="flex items-center gap-3">
                              <div className="text-base font-semibold text-gray-900">
                                {it.productName || "-"}
                              </div>
                              <Pill className={meta.cls}>
                                <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
                                {meta.label}
                              </Pill>
                              {Number.isFinite(it._daysLeft) && (
                                <span className="text-xs text-gray-500">
                                  ({it._daysLeft} วัน)
                                </span>
                              )}
                            </div>

                            <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
                              <div>
                                <span className="font-medium">Serial No.:</span>{" "}
                                {it.serial || "-"}
                              </div>
                              <div>
                                <span className="font-medium">วันที่ซื้อ:</span>{" "}
                                {fmtDate(it.purchaseDate)}
                              </div>
                              <div>
                                <span className="font-medium">วันหมดอายุ:</span>{" "}
                                {fmtDate(it.expiryDate)}
                              </div>
                              <div>
                                <span className="font-medium">เงื่อนไขรับประกัน:</span>{" "}
                                {it.coverageNote || "-"}
                              </div>
                            </div>

                            {/* หมายเหตุของฉัน */}
                            <div className="mt-3">
                              <div className="text-sm font-medium text-gray-700">หมายเหตุของฉัน</div>
                              <div className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                {it.customerNote?.trim() ? it.customerNote : "-"}
                              </div>
                              <div className="mt-2">
                                <button
                                  onClick={() =>
                                    setNoteModal({
                                      open: true,
                                      itemId: it.id,
                                      name: it.productName,
                                      note: it.customerNote || "",
                                    })
                                  }
                                  className="rounded-xl border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  เพิ่มหมายเหตุ
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* รูปภาพ */}
                          <div className="md:col-span-4">
                            <div className="aspect-video rounded-xl border border-black/10 bg-white/60 overflow-hidden flex items-center justify-center text-gray-400 text-sm">
                              {img ? (
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>ไม่มีรูปภาพ</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
        </div>
      </div>

      {/* Modal เพิ่มหมายเหตุ */}
      {noteModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">เพิ่มหมายเหตุ - {noteModal.name}</h4>
              <button
                onClick={() => setNoteModal({ open: false, itemId: null, name: "", note: "" })}
              >
                ✕
              </button>
            </div>
            <textarea
              rows={5}
              value={noteModal.note}
              onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="พิมพ์หมายเหตุของคุณ"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setNoteModal({ open: false, itemId: null, name: "", note: "" })}
                className="px-4 py-2 rounded-lg border"
              >
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
