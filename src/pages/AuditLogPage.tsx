import React, { useState } from 'react';
import { ShieldAlert, RotateCcw, Search, Clock, FileText } from 'lucide-react';
import { db } from '../services/db';
import { formatRupiah, formatDateTime } from '../services/printer';
import { AuditLog, RefundRecord, User } from '../types';

interface AuditLogPageProps {
  currentUser?: User;
}

export const AuditLogPage: React.FC<AuditLogPageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'refunds' | 'voids'>('audit');
  const [logs] = useState<AuditLog[]>(db.getAuditLog());
  const [refunds] = useState<RefundRecord[]>(db.getRefunds());
  const [voids] = useState(db.getVoidedItems());
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(l => {
    const isSuperAdminLog =
      l.user_id === 'SUPERADMIN' ||
      l.user_name.toLowerCase().includes('superadmin') ||
      l.user_name.toLowerCase().includes('divailean') ||
      l.details.toLowerCase().includes('superadmin') ||
      l.action.toLowerCase().includes('superadmin');

    // Hide superadmin logs from store audit log table
    if (isSuperAdminLog) return false;

    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(s) ||
      l.details.toLowerCase().includes(s) ||
      l.user_name.toLowerCase().includes(s)
    );
  });

  const filteredVoids = voids.filter(v => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      v.product_name.toLowerCase().includes(s) ||
      v.cashier_name.toLowerCase().includes(s) ||
      v.barcode.includes(s) ||
      v.sku.toLowerCase().includes(s)
    );
  });

  const totalVoidQty = voids.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalVoidVal = voids.reduce((acc, curr) => acc + curr.total_price, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-stone-900 tracking-tight">Audit Log & Rekap Pembatalan Kasir</h1>
        <p className="text-xs text-stone-500">
          Pencatatan rekam jejak aktivitas penting sistem, refund transaksi, serta rangkuman item yang dibatalkan kasir.
        </p>
      </div>

      <div className="flex gap-2 border-b border-stone-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Audit Log Aktivitas ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'refunds'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Riwayat Refund Struk ({refunds.length})
        </button>
        <button
          onClick={() => setActiveTab('voids')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'voids'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Rangkuman Item Dibatalkan Kasir ({voids.length})
        </button>
      </div>

      {activeTab === 'audit' && (
        <div className="space-y-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter aktivitas audit..."
            className="w-full max-w-sm rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none"
          />

          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Pengguna</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Rincian Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-stone-400">
                        Belum ada riwayat audit log.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(l => (
                      <tr key={l.log_id} className="hover:bg-stone-50">
                        <td className="px-4 py-2.5 font-mono text-[10px] text-stone-400">
                          {formatDateTime(l.timestamp)}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-stone-800">{l.user_name}</td>
                        <td className="px-4 py-2.5">
                          <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                            {l.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-stone-700">{l.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'refunds' && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">No. Refund & Tanggal</th>
                  <th className="px-4 py-3">ID Transaksi</th>
                  <th className="px-4 py-3 text-right">Nilai Refund</th>
                  <th className="px-4 py-3">Alasan Pembatalan</th>
                  <th className="px-4 py-3">Disetujui Oleh</th>
                  <th className="px-4 py-3 text-center">Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      Belum ada permohonan atau proses refund.
                    </td>
                  </tr>
                ) : (
                  refunds.map(r => (
                    <tr key={r.refund_id} className="hover:bg-red-50/30">
                      <td className="px-4 py-3">
                        <div className="font-bold text-red-700 font-mono">{r.refund_number}</div>
                        <div className="text-[10px] text-stone-400">{formatDateTime(r.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-stone-600">{r.transaction_id}</td>
                      <td className="px-4 py-3 text-right font-black text-red-700">
                        {formatRupiah(r.amount)}
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-800">{r.reason}</td>
                      <td className="px-4 py-3 text-stone-600">{r.approved_by || r.created_by}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                          {r.restock_items ? 'Ya (Restok)' : 'Tidak'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'voids' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border border-red-200 bg-red-50/40 shadow-2xs space-y-1">
              <div className="text-[10px] text-red-700 font-bold uppercase">Total Item Dibatalkan</div>
              <div className="text-xl font-black text-red-800">{totalVoidQty} Pcs</div>
              <div className="text-[11px] text-stone-500">{voids.length} transaksi pembatalan oleh kasir</div>
            </div>

            <div className="p-4 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-1">
              <div className="text-[10px] text-stone-500 font-bold uppercase">Nilai Total Item Dibatalkan</div>
              <div className="text-xl font-black text-stone-900">{formatRupiah(totalVoidVal)}</div>
              <div className="text-[11px] text-stone-400">Estimasi nilai omset yang dibatalkan kasir</div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kasir, produk, barcode..."
              className="w-full max-w-sm rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Waktu & Tanggal</th>
                    <th className="px-4 py-3">Kasir</th>
                    <th className="px-4 py-3">Produk & Barcode</th>
                    <th className="px-4 py-3 text-center">Qty Batal</th>
                    <th className="px-4 py-3 text-right">Harga Satuan</th>
                    <th className="px-4 py-3 text-right">Total Nilai Batal</th>
                    <th className="px-4 py-3">Alasan / Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredVoids.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-400">
                        Belum ada riwayat pembatalan item keranjang oleh kasir.
                      </td>
                    </tr>
                  ) : (
                    filteredVoids.map(v => (
                      <tr key={v.void_id} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3 font-mono text-[10px] text-stone-500">
                          {formatDateTime(v.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-bold text-stone-800">{v.cashier_name}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900">{v.product_name}</div>
                          <div className="text-[10px] font-mono text-stone-400">{v.barcode || v.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-red-700">
                          {v.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-stone-700">
                          {formatRupiah(v.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-red-700">
                          {formatRupiah(v.total_price)}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-stone-500">
                          {v.reason || 'Dibatalkan di keranjang'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

