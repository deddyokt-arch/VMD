import React, { useState } from 'react';
import { X, DollarSign, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { CashSession, User } from '../../types';
import { db } from '../../services/db';
import { formatRupiah, formatDateTime } from '../../services/printer';
import { useDialog } from '../../contexts/DialogContext';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onShiftUpdated: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShiftUpdated,
}) => {
  const activeSession = db.getActiveCashSession(currentUser.role === 'KASIR' ? currentUser.user_id : undefined);
  const [openingCashInput, setOpeningCashInput] = useState<number>(100000);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useDialog();

  if (!isOpen) return null;

  // If session is open, calculate current metrics
  let openingCash = 0;
  let cashSales = 0;
  let cashIn = 0;
  let cashOut = 0;
  let expectedCash = 0;

  if (activeSession) {
    openingCash = activeSession.opening_cash;
    const transactions = db.getTransactions().filter(
      t =>
        t.cashier_id === activeSession.cashier_id &&
        new Date(t.created_at) >= new Date(activeSession.opening_time) &&
        t.payment_method === 'TUNAI' &&
        t.transaction_status === 'COMPLETED'
    );
    cashSales = transactions.reduce((acc, curr) => acc + curr.total, 0);

    const movements = db.getCashMovements().filter(m => m.session_id === activeSession.session_id);
    cashIn = movements.filter(m => m.movement_type === 'CASH_IN').reduce((acc, c) => acc + c.amount, 0);
    cashOut = movements.filter(m => m.movement_type === 'CASH_OUT').reduce((acc, c) => acc + c.amount, 0);
    expectedCash = openingCash + cashSales + cashIn - cashOut;
  }

  const cashDiff = actualCashInput - expectedCash;

  const handleOpenShift = () => {
    if (openingCashInput < 0) {
      toast('Modal awal tidak boleh negatif.', 'error');
      return;
    }
    setIsSubmitting(true);
    db.openCashSession(currentUser.user_id, currentUser.full_name, openingCashInput);
    setIsSubmitting(false);
    onShiftUpdated();
    onClose();
  };

  const handleCloseShift = () => {
    if (!activeSession) return;
    if (actualCashInput < 0) {
      toast('Penghitungan fisik kas tidak boleh negatif.', 'error');
      return;
    }
    if (cashDiff !== 0 && !notes.trim()) {
      toast('Terdapat selisih kas! Harap isi keterangan/alasan selisih kas pada kolom catatan.', 'warning');
      return;
    }
    setIsSubmitting(true);
    db.closeCashSession(activeSession.session_id, actualCashInput, notes);
    setIsSubmitting(false);
    onShiftUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-800 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#2D1B14] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold">
              {activeSession ? 'Tutup Shift & Hitung Kas' : 'Buka Shift Baru Kasir'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-300 hover:bg-stone-800 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!activeSession ? (
            /* Open Shift Form */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                Anda belum membuka shift kasir hari ini. Masukkan uang modal awal di laci kasir (kembalian uang receh/pecahan) untuk memulai penjualan.
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Modal Awal di Laci Kasir (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-sm">Rp</span>
                  <input
                    type="number"
                    value={openingCashInput || ''}
                    onChange={e => setOpeningCashInput(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-stone-800 focus:border-amber-600 focus:outline-none"
                    placeholder="100000"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {[50000, 100000, 200000, 500000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOpeningCashInput(amt)}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold hover:border-amber-400 hover:bg-amber-50 text-stone-700 transition cursor-pointer"
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Close Shift Reconciliation */
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <div>
                  <div className="text-stone-500">Kasir: <strong className="text-stone-800">{activeSession.cashier_name}</strong></div>
                  <div className="text-stone-500">Waktu Buka: {formatDateTime(activeSession.opening_time)}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  SHIFT AKTIF
                </span>
              </div>

              {/* Breakdown */}
              <div className="rounded-xl border border-stone-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-600">Modal Kas Awal</span>
                  <span className="font-semibold">{formatRupiah(openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">(+) Penjualan Tunai</span>
                  <span className="font-semibold text-emerald-700">+{formatRupiah(cashSales)}</span>
                </div>
                {cashIn > 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">(+) Kas Masuk Drawer</span>
                    <span className="font-semibold text-emerald-700">+{formatRupiah(cashIn)}</span>
                  </div>
                )}
                {cashOut > 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">(-) Kas Keluar Drawer</span>
                    <span className="font-semibold text-red-600">-{formatRupiah(cashOut)}</span>
                  </div>
                )}
                <div className="border-t border-stone-200 pt-2 flex justify-between font-extrabold text-sm text-stone-900">
                  <span>Kas Sistem Seharusnya</span>
                  <span className="text-amber-900">{formatRupiah(expectedCash)}</span>
                </div>
              </div>

              {/* Physical cash input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Hasil Hitung Fisik Kas Laci (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-sm">Rp</span>
                  <input
                    type="number"
                    value={actualCashInput || ''}
                    onChange={e => setActualCashInput(Number(e.target.value))}
                    placeholder="Hitung uang fisik di kasir..."
                    className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-stone-800 focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Difference Status */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  cashDiff === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : cashDiff > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <span>Selisih Kas:</span>
                <span>
                  {cashDiff === 0
                    ? 'Sesuai (Seimbang)'
                    : cashDiff > 0
                    ? `Lebih ${formatRupiah(cashDiff)}`
                    : `Kurang ${formatRupiah(Math.abs(cashDiff))}`}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Catatan Shift / Alasan Selisih
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Catatan penutupan shift..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 bg-stone-50 px-5 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
          >
            Tutup
          </button>

          {!activeSession ? (
            <button
              onClick={handleOpenShift}
              disabled={isSubmitting}
              className="rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              Mulai & Buka Shift
            </button>
          ) : (
            <button
              onClick={handleCloseShift}
              disabled={isSubmitting}
              className="rounded-xl bg-red-700 hover:bg-red-800 text-white px-5 py-2.5 text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              Tutup & Selesaikan Shift
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
