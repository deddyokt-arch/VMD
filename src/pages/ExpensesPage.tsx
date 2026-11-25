import React, { useState } from 'react';
import { TrendingDown, Plus, Trash2, Calendar, FileText, Upload, X } from 'lucide-react';
import { Expense, User } from '../types';
import { db } from '../services/db';
import { formatRupiah, formatDateTime } from '../services/printer';
import { useDialog } from '../contexts/DialogContext';

interface ExpensesPageProps {
  currentUser: User;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ currentUser }) => {
  const [expenses, setExpenses] = useState<Expense[]>(db.getExpenses());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<Expense['category']>('Operasional');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const { confirmAction, toast } = useDialog();

  const refresh = () => setExpenses(db.getExpenses());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) {
      toast('Deskripsi dan nominal pengeluaran wajib diisi.', 'error');
      return;
    }

    db.saveExpense({
      expense_id: 'exp_' + Date.now(),
      expense_date: expenseDate,
      category,
      description: description.trim(),
      amount,
      payment_method: 'KAS_OPERASIONAL',
      created_by: currentUser.full_name,
      created_at: new Date().toISOString(),
    });

    refresh();
    setIsModalOpen(false);
    setDescription('');
    setAmount(0);
  };

  const handleDelete = async (id: string, desc: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Pengeluaran',
      message: `Hapus pengeluaran "${desc}"?`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.deleteExpense(id);
      refresh();
      toast(`Pengeluaran "${desc}" berhasil dihapus.`, 'success');
    }
  };

  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">Pengeluaran & Biaya Operasional</h1>
          <p className="text-xs text-stone-500">
            Catat pengeluaran listrik, sewa toko, internet, gaji pegawai, serta operasional harian swalayan.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pengeluaran Baru</span>
        </button>
      </div>

      {/* Metric Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-1">
          <div className="text-xs text-stone-500 font-bold uppercase tracking-wider">Total Biaya Operasional</div>
          <div className="text-2xl font-black text-red-700">{formatRupiah(totalExpense)}</div>
          <div className="text-[11px] text-stone-400">{expenses.length} transaksi pengeluaran tercatat</div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Kategori Biaya</th>
                <th className="px-4 py-3">Keterangan / Rincian</th>
                <th className="px-4 py-3">Dicatat Oleh</th>
                <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    Belum ada pengeluaran operasional yang dicatat.
                  </td>
                </tr>
              ) : (
                expenses.map(e => (
                  <tr key={e.expense_id} className="hover:bg-stone-50 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-stone-600">
                      {e.expense_date}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-800">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900">
                      {e.description}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-[11px]">
                      {e.created_by}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">
                      {formatRupiah(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(e.expense_id, e.description)}
                        className="p-1 rounded-lg text-stone-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-stone-800 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm">Catat Pengeluaran Operasional</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Kategori Pengeluaran</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="Operasional">Operasional Harian Toko</option>
                  <option value="Listrik & Air">Listrik &amp; Air (PLN / PDAM)</option>
                  <option value="Internet">Internet / WiFi Toko</option>
                  <option value="Gaji Karyawan">Gaji Karyawan &amp; Kasir</option>
                  <option value="Sewa Tempat">Sewa Toko &amp; Gudang</option>
                  <option value="Peralatan">Perawatan Rak, Freezer &amp; Scanner Kasir</option>
                  <option value="Bahan Baku">Perlengkapan Toko &amp; Plastik Kemasan</option>
                  <option value="Lainnya">Biaya Lain-Lain</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Contoh: Pembayaran Token Listrik PLN Minggu 1"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nominal Biaya (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-stone-400 font-bold text-xs">Rp</span>
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full rounded-xl border border-stone-300 pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
