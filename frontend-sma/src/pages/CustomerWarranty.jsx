// frontend-sma/src/pages/CustomerWarranty.jsx
import React, { useEffect, useMemo, useState } from "react";

const api = (path, opts={}) => {
  const token = localStorage.getItem("token");
  return fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

function StatusPill({ code }) {
  const map = {
    active: { label: "ใช้งานได้", class: "bg-emerald-50 text-emerald-700" },
    nearing_expiration: { label: "ใกล้หมดอายุ", class: "bg-amber-50 text-amber-700" },
    expired: { label: "หมดอายุ", class: "bg-rose-50 text-rose-700" },
  };
  const s = map[code] || map.active;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.class}`}>{s.label}</span>;
}

function NoteModal({ open, onClose, onSave, defaultValue }) {
  const [val, setVal] = useState(defaultValue || "");
  useEffect(()=>{ setVal(defaultValue || ""); }, [defaultValue, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-[520px] rounded-xl shadow-xl p-5">
        <div className="text-lg font-semibold mb-2">เพิ่มหมายเหตุ</div>
        <textarea className="w-full border rounded-lg p-3 min-h-[120px]" value={val} onChange={e=>setVal(e.target.value)} placeholder="พิมพ์หมายเหตุของคุณ"/>
        <div className="flex justify-end gap-2 mt-3">
          <button className="px-3 py-2 rounded-lg border" onClick={onClose}>ยกเลิก</button>
          <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={()=>onSave(val)}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerWarranty() {
  const [summary, setSummary] = useState({ all: 0, active: 0, near: 0, expired: 0 });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState([]);

  const [noteItem, setNoteItem] = useState(null);        // {itemId, defaultValue}
  const [reloading, setReloading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [sumRes, listRes] = await Promise.all([
      api("/customers/me/summary"),
      api(`/customers/me/warranties?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`),
    ]);
    const sumJson = await sumRes.json();
    const listJson = await listRes.json();
    setSummary(sumJson?.data?.totals || { all:0, active:0, near:0, expired:0 });
    setWarranties(listJson?.data?.warranties || []);
    setLoading(false);
  };

  useEffect(()=>{ fetchAll(); /* eslint-disable-next-line */ },[]);
  useEffect(()=>{ const t = setTimeout(fetchAll, 300); return ()=>clearTimeout(t); }, [query, status]);

  const cards = useMemo(()=>warranties, [warranties]);

  const handleSaveNote = async (text) => {
    if (!noteItem) return;
    setReloading(true);
    await api(`/customers/me/items/${noteItem.itemId}/note`, { method: "POST", body: JSON.stringify({ note: text }) });
    setNoteItem(null);
    await fetchAll();
    setReloading(false);
  };

  return (
    <div className="min-h-screen bg-[#e9f3fb]">
      <div className="max-w-5xl mx-auto pt-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600" />
          <div className="text-2xl font-bold">Warranty</div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-center">{summary.all}</div>
            <div className="text-center text-gray-600">ในรับประกันทั้งหมด</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-center">{summary.active}</div>
            <div className="text-center text-gray-600">ใช้งานได้</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-center">{summary.near}</div>
            <div className="text-center text-gray-600">ใกล้หมดอายุ</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-3xl font-bold text-center">{summary.expired}</div>
            <div className="text-center text-gray-600">หมดอายุ</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl p-3 shadow-sm mb-4 flex items-center gap-3">
          <input className="flex-1 border rounded-md px-3 py-2" placeholder="ค้นหาได้ด้วยชื่อสินค้า ร้านค้า รหัสรับประกัน หรือ Serial" value={query} onChange={e=>setQuery(e.target.value)} />
          <div className="flex gap-2">
            <button className={`px-3 py-1 rounded-lg border ${status===""?"bg-gray-900 text-white":""}`} onClick={()=>setStatus("")}>ทั้งหมด</button>
            <button className={`px-3 py-1 rounded-lg border ${status==="active"?"bg-emerald-600 text-white":""}`} onClick={()=>setStatus("active")}>ใช้งานได้</button>
            <button className={`px-3 py-1 rounded-lg border ${status==="nearing_expiration"?"bg-amber-600 text-white":""}`} onClick={()=>setStatus("nearing_expiration")}>ใกล้หมดอายุ</button>
            <button className={`px-3 py-1 rounded-lg border ${status==="expired"?"bg-rose-600 text-white":""}`} onClick={()=>setStatus("expired")}>หมดอายุ</button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-gray-500 py-10">กำลังโหลด...</div>
        ) : cards.length===0 ? (
          <div className="text-center text-gray-500 py-10">ไม่พบใบรับประกัน</div>
        ) : (
          <div className="space-y-4">
            {cards.map(h => (
              <div key={h.id} className="bg-white rounded-2xl shadow-sm p-4">
                {h.items.map((it, idx)=>(
                  <div key={it.id} className="flex gap-4 items-start border-b last:border-0 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold">{it.productName}</div>
                        <StatusPill code={it.status.code}/>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm mt-1">
                        <div>
                          <div className="text-gray-500">รหัสรับประกัน</div>
                          <div className="font-medium">{h.code}</div>
                          <div className="text-gray-500 mt-1">Serial No.</div>
                          <div className="font-medium">{it.serial || "-"}</div>
                          <div className="text-gray-500 mt-1">วันที่ซื้อ</div>
                          <div>{it.purchaseDate ? new Date(it.purchaseDate).toLocaleDateString() : "-"}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">ร้านค้า</div>
                          <div className="font-medium">{h.storeName}</div>
                          <div className="text-gray-500 mt-1">วันหมดอายุ</div>
                          <div>{it.expiryDate ? new Date(it.expiryDate).toLocaleDateString() : "-"}</div>
                          <div className="text-gray-500 mt-1">เวลาที่เหลือ</div>
                          <div>{it.remainingDays==null? "-" : (it.remainingDays<0? "หมดอายุ": `${it.remainingDays} วัน`)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">เบอร์ร้าน</div>
                          <div className="font-medium">{h.storePhone || "-"}</div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 mt-2">
                        <div className="font-medium">เงื่อนไขบริการรับประกัน</div>
                        <div>{it.noteFromStore || "-"}</div>
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        <div className="font-medium">หมายเหตุของฉัน</div>
                        <div className="whitespace-pre-wrap">{it.customerNote || "-"}</div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="px-3 py-2 rounded-lg border flex items-center gap-2" onClick={()=>setNoteItem({ itemId: it.id, defaultValue: it.customerNote || "" })}>
                          <span>✎</span> เพิ่มหมายเหตุ
                        </button>
                        <a className="px-3 py-2 rounded-lg border flex items-center gap-2" href="#" onClick={(e)=>e.preventDefault()}>
                          ⬇️ ดาวน์โหลด PDF
                        </a>
                      </div>
                    </div>
                    <div className="w-48 h-32 bg-gray-200 rounded-xl shrink-0 overflow-hidden flex items-center justify-center">
                      {/* ภาพสินค้า/ใบเสร็จภายหลัง */}
                      <span className="text-gray-500 text-sm">ไม่มีรูปภาพ</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <NoteModal
          open={!!noteItem}
          defaultValue={noteItem?.defaultValue}
          onClose={()=>setNoteItem(null)}
          onSave={handleSaveNote}
        />
        {reloading && <div className="fixed bottom-4 right-4 bg-black text-white text-sm px-3 py-2 rounded-lg">กำลังบันทึก...</div>}
      </div>
    </div>
  );
}
