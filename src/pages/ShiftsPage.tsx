import React, { useState } from 'react';
import { Coins, Plus, DollarSign, Clock, ArrowDownRight, ArrowUpRight, CheckCircle2, X } from 'lucide-react';
import { CashSession, CashMovement, User } from '../types';
import { db } from '../services/db';
import { formatRupiah, formatDateTime } from '../services/printer';
import { ShiftModal } from '../components/shifts/ShiftModal';
import { useDialog } from '../contexts/DialogContext';

interface ShiftsPageProps {
  currentUser: User;
}

export const ShiftsPage: React.FC<ShiftsPageProps> = ({ currentUser }) => {
  const [sessions, setSessions] = useState<CashSession[]>(db.getCashSessions());
  const [activeSession, setActiveSession] = useState<CashSession | null>(
    db.getActiveCashSession(currentUser.role === 'KASIR' ? currentUser.user_id : undefined)
  );
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [movType, setMovType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [movAmount, setMovAmount] = useState<number>(0);
  const [movDescription, setMovDescription] = useState('');
  const { toast } = useDialog();

  const refresh = () => {
    setSessions(db.getCashSessions());
    setActiveSession(
      db.getActiveCashSession(currentUser.role === 'KASIR' ? currentUser.user_id : undefined)
    );
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) {
      toast('Harap buka shift kasir terlebih dahulu sebelum mencatat kas keluar/masuk.', 'error');
      return;
    }
    if (movAmount <= 0 || !movDescription.trim()) {
      toast('Nominal dan deskripsi harus diisi.', 'error');
      return;
    }

    const newMov: CashMovement = {
      movement_id: 'cm_' + Date.now(),
      session_id: activeSession.session_id,
      movement_type: movType,
      amount: movAmount,
      description: movDescription.trim(),
      created_by: currentUser.full_name,
      created_at: new Date().toISOString(),
    };

    db.addCashMovement(newMov);
    setIsCashMovementModalOpen(false);
    setMovAmount(0);
    setMovDescription('');
    refresh();
    toast('Mutasi kas laci berhasil dicatat!', 'success');
  };

  const cashMovements = db.getCashMovements();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">
            Kas & Shift Kasir
          </h1>
          <p className="text-xs text-stone-500">
            Kelola modal awal kasir, kas masuk/keluar laci (petty cash), dan rekonsiliasi tutup shift.
          </p>
        </div>

        <div className="flex gap-2">
          {activeSession && (
            <button
              onClick={() => setIsCashMovementModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-3.5 py-2 text-xs font-bold transition shadow-2xs"
            >
              <Coins className="w-4 h-4 text-amber-700" />
              <span>Kas Masuk / Keluar</span>
            </button>
          )}

          <button
            onClick={() => setShowShiftModal(true)}
            className={`flex items-center gap-1.5 rounded-xl text-white px-4 py-2 text-xs font-bold shadow-xs transition ${
              activeSession ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-800 hover:bg-amber-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{activeSession ? 'Tutup Shift Sekarang' : 'Buka Shift Kasir'}</span>
          </button>
        </div>
      </div>

      {/* Active Shift Banner */}
      {activeSession ? (
        <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-800 to-teal-900 text-white shadow-md space-y-2">
          <div className="flex justify-between items-center">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/40">
              SHIFT AKTIF BERJALAN
            </span>
            <span className="text-xs text-emerald-200 font-mono">
              Buka: {formatDateTime(activeSession.opening_time)}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs text-emerald-200 font-semibold">Kasir Bertugas</div>
              <div className="text-lg font-black">{activeSession.cashier_name}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-emerald-200 font-semibold">Modal Awal Laci</div>
              <div className="text-lg font-black text-amber-300">
                {formatRupiah(activeSession.opening_cash)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div>
            <div className="font-bold">Belum Ada Shift Aktif</div>
            <p className="text-amber-800 mt-0.5">Buka shift untuk memasukkan modal awal kasir sebelum transaksi tunai.</p>
          </div>
          <button
            onClick={() => setShowShiftModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-800 text-white font-bold hover:bg-amber-900 transition"
          >
            Buka Shift
          </button>
        </div>
      )}

      {/* Shifts History Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
        <div className="px-5 py-3 border-b border-stone-100 font-bold text-xs text-stone-800">
          Riwayat Shift Kasir
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Kasir</th>
                <th className="px-4 py-3">Waktu Buka & Tutup</th>
                <th className="px-4 py-3 text-right">Modal Awal</th>
                <th className="px-4 py-3 text-right">Kas Sistem</th>
                <th className="px-4 py-3 text-right">Kas Fisik</th>
                <th className="px-4 py-3 text-right">Selisih Kas</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    Belum ada sesi shift kasir tercatat.
                  </td>
                </tr>
              ) : (
                sessions.map(s => {
                  const diff = s.cash_difference || 0;
                  return (
                    <tr key={s.session_id} className="hover:bg-amber-50/40 transition">
                      <td className="px-4 py-3 font-bold text-stone-900">{s.cashier_name}</td>
                      <td className="px-4 py-3 text-[11px] text-stone-500">
                        <div>Buka: {formatDateTime(s.opening_time)}</div>
                        {s.closing_time && <div>Tutup: {formatDateTime(s.closing_time)}</div>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatRupiah(s.opening_cash)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-stone-800">
                        {formatRupiah(s.expected_cash)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-stone-800">
                        {s.actual_cash !== undefined ? formatRupiah(s.actual_cash) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {s.status === 'CLOSED' ? (
                          <span
                            className={
                              diff === 0
                                ? 'text-emerald-700'
                                : diff > 0
                                ? 'text-blue-700'
                                : 'text-red-600'
                            }
                          >
                            {diff === 0 ? 'Seimbang' : diff > 0 ? `+${formatRupiah(diff)}` : formatRupiah(diff)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'OPEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-stone-500 italic max-w-xs truncate">
                        {s.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash In / Out Movement Modal */}
      {isCashMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-stone-800 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm">Catat Kas Keluar / Masuk Laci</h3>
              <button onClick={() => setIsCashMovementModalOpen(false)} className="text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Jenis Kas</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovType('CASH_OUT')}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      movType === 'CASH_OUT'
                        ? 'bg-red-600 text-white'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Kas Keluar (Biaya)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovType('CASH_IN')}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      movType === 'CASH_IN'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Kas Masuk (Tambah)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nominal (Rp) *</label>
                <input
                  type="number"
                  value={movAmount || ''}
                  onChange={e => setMovAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Keterangan / Keperluan *</label>
                <input
                  type="text"
                  value={movDescription}
                  onChange={e => setMovDescription(e.target.value)}
                  placeholder="Contoh: Beli es batu kristal 2 kantong"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCashMovementModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900"
                >
                  Simpan Mutasi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Modal */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        currentUser={currentUser}
        onShiftUpdated={refresh}
      />
    </div>
  );
};
