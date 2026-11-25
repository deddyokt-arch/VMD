import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Printer,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Database,
} from 'lucide-react';
import { Transaction, User } from '../types';
import { db } from '../services/db';
import { formatRupiah, formatDateTime } from '../services/printer';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { useDialog } from '../contexts/DialogContext';

interface TransactionsPageProps {
  currentUser: User;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ currentUser }) => {
  const [volumeSelector, setVolumeSelector] = useState<'ACTIVE' | 'ALL' | string>('ACTIVE');
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactionsByVolume('ACTIVE'));
  const [searchInvoice, setSearchInvoice] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);

  const activeVolume = db.getActiveVolume();
  const archivedVolumes = db.getArchivedVolumes();
  const activeTxIds = new Set(db.getTransactions().map(t => t.transaction_id));

  // Refund Modal State
  const [refundTargetTx, setRefundTargetTx] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundRestock, setRefundRestock] = useState(true);
  const [adminPin, setAdminPin] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const { confirmAction, toast } = useDialog();

  const refreshList = (nextSelector = volumeSelector) => {
    setTransactions(db.getTransactionsByVolume(nextSelector));
  };

  const handleVolumeChange = (nextSelector: string) => {
    setVolumeSelector(nextSelector);
    refreshList(nextSelector);
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    const confirmed = await confirmAction({
      title: 'Hapus Transaksi Permanen',
      message: `Yakin ingin menghapus transaksi invoice "${tx.invoice_number}" secara permanen?`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.deleteTransaction(tx.transaction_id);
      refreshList();
      toast(`Transaksi ${tx.invoice_number} berhasil dihapus.`, 'success');
    }
  };

  const filtered = transactions.filter(t => {
    const matchesSearch =
      t.invoice_number.toLowerCase().includes(searchInvoice.toLowerCase()) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(searchInvoice.toLowerCase())) ||
      t.cashier_name.toLowerCase().includes(searchInvoice.toLowerCase());

    const matchesMethod = filterMethod === 'ALL' || t.payment_method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const handleOpenRefund = (tx: Transaction) => {
    setRefundTargetTx(tx);
    setRefundReason('');
    setAdminPin('');
    setRefundError(null);
  };

  const handleProcessRefund = () => {
    if (!refundTargetTx) return;
    if (!refundReason.trim()) {
      setRefundError('Harap masukkan alasan pembatalan/refund.');
      return;
    }

    // Verify Admin PIN if current user is not admin or even if cashier requests
    const users = db.getUsers();
    const adminUser = users.find(u => u.role === 'ADMIN');
    // Simple check: if currentUser is ADMIN, or adminPin matches
    if (currentUser.role !== 'ADMIN') {
      if (adminPin !== '1234') {
        setRefundError('PIN Otorisasi Admin salah. Hubungi supervisor / admin.');
        return;
      }
    }

    db.createRefund(
      refundTargetTx.transaction_id,
      refundTargetTx.total,
      refundReason,
      currentUser.full_name,
      refundRestock
    );

    const refundedInvoice = refundTargetTx.invoice_number;
    refreshList();
    setRefundTargetTx(null);
    toast(`Transaksi ${refundedInvoice} berhasil dibatalkan / di-refund.`, 'success');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">Riwayat Transaksi Penjualan</h1>
          <p className="text-xs text-stone-500">
            Daftar seluruh transaksi kasir, cetak ulang struk duplikat, dan otorisasi refund.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchInvoice}
            onChange={e => setSearchInvoice(e.target.value)}
            placeholder="Cari No. Invoice, Nama Pelanggan, atau Kasir..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-amber-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5">
          <Database className="w-3.5 h-3.5 text-amber-800 shrink-0" />
          <select
            value={volumeSelector}
            onChange={e => handleVolumeChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none cursor-pointer"
            title="Pilih Sumber Spreadsheet"
          >
            <option value="ACTIVE">
              Spreadsheet Aktif {activeVolume ? `(Vol. ${activeVolume.volume_number})` : ''}
            </option>
            {archivedVolumes.length > 0 && (
              <option value="ALL">Semua Spreadsheet (Aktif + Arsip Lama)</option>
            )}
            {archivedVolumes.map(v => (
              <option key={v.volume_id} value={v.volume_id}>
                Arsip Vol. {v.volume_number} ({v.transaction_count} tx)
              </option>
            ))}
          </select>
        </div>

        <select
          value={filterMethod}
          onChange={e => setFilterMethod(e.target.value)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none focus:border-amber-600 cursor-pointer"
        >
          <option value="ALL">Semua Metode Pembayaran</option>
          <option value="TUNAI">Tunai (Cash)</option>
          <option value="QRIS_STATIS">QRIS Statis</option>
          <option value="QRIS_DINAMIS">QRIS Dinamis</option>
          <option value="DEBIT_KREDIT">Kartu / Debit</option>
        </select>
      </div>

      {/* Transaction List */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">No. Invoice & Tanggal</th>
                <th className="px-4 py-3">Kasir & Tipe</th>
                <th className="px-4 py-3">Item Pesanan</th>
                <th className="px-4 py-3">Metode Bayar</th>
                <th className="px-4 py-3 text-right">Total Transaksi</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    Belum ada riwayat transaksi yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map(tx => {
                  const isRefunded = tx.transaction_status === 'REFUNDED';
                  const isArchivedRecord = !activeTxIds.has(tx.transaction_id);
                  return (
                    <tr key={tx.transaction_id} className="hover:bg-amber-50/40 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900 font-mono">{tx.invoice_number}</span>
                          {isArchivedRecord && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-bold">
                              ARSIP
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400">{formatDateTime(tx.created_at)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-800">{tx.cashier_name}</div>
                        <div className="text-[10px] text-stone-500">
                          {tx.order_type} {tx.table_number ? `• Troli/Ref ${tx.table_number}` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate font-medium text-stone-700">
                          {tx.items.map(i => `${i.quantity}x ${i.product_name_snapshot}`).join(', ')}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {tx.items.length} jenis produk
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700 border border-stone-200">
                          {tx.payment_method}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-stone-900">
                        <div className={isRefunded ? 'line-through text-stone-400' : 'text-amber-950 font-extrabold'}>
                          {formatRupiah(tx.total)}
                        </div>
                        {tx.discount > 0 && (
                          <div className="text-[10px] text-amber-700 font-normal">
                            Diskon: -{formatRupiah(tx.discount)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isRefunded
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isRefunded ? 'REFUND' : 'LUNAS'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTxForReceipt(tx)}
                            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs transition cursor-pointer"
                            title="Cetak Salinan Struk"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-800" />
                          </button>

                          {!isRefunded && !isArchivedRecord && (
                            <button
                              onClick={() => handleOpenRefund(tx)}
                              className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs transition cursor-pointer"
                              title="Ajukan Refund / Pembatalan"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {currentUser.role === 'ADMIN' && !isArchivedRecord && (
                            <button
                              onClick={() => handleDeleteTransaction(tx)}
                              className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs transition cursor-pointer"
                              title="Hapus Transaksi Permanen (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal (Duplicate print) */}
      <ReceiptModal
        transaction={selectedTxForReceipt}
        isOpen={!!selectedTxForReceipt}
        onClose={() => setSelectedTxForReceipt(null)}
        isDuplicate={true}
      />

      {/* Refund Approval Modal */}
      {refundTargetTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5 space-y-4 text-stone-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-2 text-red-700 font-bold border-b border-stone-100 pb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3>Otorisasi Pembatalan & Refund</h3>
            </div>

            {refundError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                {refundError}
              </div>
            )}

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
              <div>Invoice: <strong className="font-mono">{refundTargetTx.invoice_number}</strong></div>
              <div>Nilai Transaksi: <strong>{formatRupiah(refundTargetTx.total)}</strong></div>
              <div>Kasir Pembuat: <strong>{refundTargetTx.cashier_name}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Alasan Pembatalan / Refund (Wajib)
              </label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="Contoh: Pelanggan batal belanja, salah scan barang di kasir"
                className="w-full rounded-xl border border-stone-300 p-2 text-xs focus:outline-none focus:border-amber-600"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={refundRestock}
                onChange={e => setRefundRestock(e.target.checked)}
                className="rounded text-amber-700"
              />
              <span>Kembalikan stok produk ke inventori</span>
            </label>

            {currentUser.role !== 'ADMIN' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Masukkan PIN Supervisor / Admin (1234)
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  placeholder="PIN Otorisasi"
                  className="w-full rounded-xl border border-stone-300 p-2 text-xs focus:outline-none focus:border-amber-600"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setRefundTargetTx(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Batal
              </button>
              <button
                onClick={handleProcessRefund}
                className="px-4 py-2 rounded-xl bg-red-700 text-white text-xs font-bold hover:bg-red-800 shadow-xs"
              >
                Konfirmasi Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
