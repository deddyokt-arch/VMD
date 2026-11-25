import React, { useState } from 'react';
import { Coins, Calendar, ArrowUpRight, ArrowDownLeft, FileSpreadsheet, Filter, Search, Wallet, TrendingUp, TrendingDown, RefreshCw, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../services/db';
import { formatRupiah, formatDateTime } from '../services/printer';
import { CashSession, Expense, Purchase, Transaction, User } from '../types';

interface CashLedgerPageProps {
  currentUser?: User;
}

type PeriodFilter = 'daily' | 'weekly' | 'monthly' | 'all';

interface LedgerEntry {
  id: string;
  timestamp: string;
  type: 'MODAL_SHIFT' | 'PENJUALAN_TUNAI' | 'PENJUALAN_NON_TUNAI' | 'KAS_MASUK' | 'KAS_KELUAR' | 'EXPENSE' | 'PURCHASE';
  typeLabel: string;
  cashierName: string;
  reference: string;
  description: string;
  cashIn: number;
  cashOut: number;
  runningBalance?: number;
}

export const CashLedgerPage: React.FC<CashLedgerPageProps> = () => {
  const [period, setPeriod] = useState<PeriodFilter>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [volumeSelector, setVolumeSelector] = useState<'ACTIVE' | 'ALL' | string>('ACTIVE');

  const activeVolume = db.getActiveVolume();
  const archivedVolumes = db.getArchivedVolumes();

  // Load raw data from selected volume(s)
  const transactions = db.getTransactionsByVolume(volumeSelector);
  const cashSessions = db.getCashSessionsByVolume(volumeSelector);
  const cashMovements = db.getCashMovementsByVolume(volumeSelector);
  const expenses = db.getExpensesByVolume(volumeSelector);
  const purchases = db.getPurchasesByVolume(volumeSelector);

  // Helper date filters
  const isDateInPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const itemDate = dateStr.slice(0, 10);
    if (period === 'all') return true;

    if (period === 'daily') {
      return itemDate === selectedDate;
    }

    if (period === 'weekly') {
      const target = new Date(selectedDate);
      const startOfWeek = new Date(target);
      startOfWeek.setDate(target.getDate() - target.getDay()); // Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

      const current = new Date(itemDate);
      return current >= startOfWeek && current <= endOfWeek;
    }

    if (period === 'monthly') {
      return itemDate.slice(0, 7) === selectedDate.slice(0, 7);
    }

    return true;
  };

  // Build combined Ledger Entries
  const rawEntries: LedgerEntry[] = [];

  // 1. Shift Opening Cash
  cashSessions.forEach(s => {
    if (isDateInPeriod(s.opening_time) && s.opening_cash > 0) {
      rawEntries.push({
        id: 'shift_open_' + s.session_id,
        timestamp: s.opening_time,
        type: 'MODAL_SHIFT',
        typeLabel: 'Modal Awal Shift',
        cashierName: s.cashier_name,
        reference: 'Shift ID: ' + s.session_id.slice(-6),
        description: `Buka Shift Kasir (${s.cashier_name})`,
        cashIn: s.opening_cash,
        cashOut: 0,
      });
    }
  });

  // 2. Completed Transactions
  transactions.forEach(t => {
    if (t.transaction_status === 'COMPLETED' && isDateInPeriod(t.created_at)) {
      const isCash = t.payment_method === 'TUNAI';
      rawEntries.push({
        id: 'tx_' + t.transaction_id,
        timestamp: t.created_at,
        type: isCash ? 'PENJUALAN_TUNAI' : 'PENJUALAN_NON_TUNAI',
        typeLabel: isCash ? 'Penjualan Tunai' : 'Penjualan ' + t.payment_method,
        cashierName: t.cashier_name,
        reference: t.invoice_number,
        description: `Penjualan Kasir (${t.items.length} item) - ${t.customer_name || 'Pelanggan Direct'}`,
        cashIn: isCash ? t.total : 0, // Non-cash tracked as informative or 0 cash drawer
        cashOut: 0,
      });
    }
  });

  // 3. Cash Drawer Movements (In / Out)
  cashMovements.forEach(m => {
    if (isDateInPeriod(m.created_at)) {
      const isIn = m.movement_type === 'CASH_IN';
      rawEntries.push({
        id: 'mov_' + m.movement_id,
        timestamp: m.created_at,
        type: isIn ? 'KAS_MASUK' : 'KAS_KELUAR',
        typeLabel: isIn ? 'Kas Masuk (Drawer)' : 'Kas Keluar (Drawer)',
        cashierName: m.created_by,
        reference: 'Drawer Adj',
        description: m.description,
        cashIn: isIn ? m.amount : 0,
        cashOut: isIn ? 0 : m.amount,
      });
    }
  });

  // 4. Operational Expenses
  expenses.forEach(e => {
    if (isDateInPeriod(e.expense_date)) {
      rawEntries.push({
        id: 'exp_' + e.expense_id,
        timestamp: e.created_at || e.expense_date + 'T12:00:00.000Z',
        type: 'EXPENSE',
        typeLabel: 'Pengeluaran Toko',
        cashierName: e.created_by,
        reference: 'EXP-' + e.expense_id.slice(-6),
        description: `[${e.category}] ${e.description}`,
        cashIn: 0,
        cashOut: e.amount,
      });
    }
  });

  // 5. Restock Purchase Orders
  purchases.forEach(p => {
    if (isDateInPeriod(p.purchase_date) && p.payment_status === 'LUNAS') {
      rawEntries.push({
        id: 'pur_' + p.purchase_id,
        timestamp: p.purchase_date + 'T12:00:00.000Z',
        type: 'PURCHASE',
        typeLabel: 'Pembelian Restok PO',
        cashierName: p.created_by,
        reference: p.purchase_number,
        description: `Pembelian Bahan (${p.supplier_name || 'Supplier'})`,
        cashIn: 0,
        cashOut: p.total,
      });
    }
  });

  // Sort chronological ascending to calculate running balance, then reverse for display
  rawEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let currentBalance = 0;
  const entriesWithBalance = rawEntries.map(entry => {
    currentBalance += entry.cashIn - entry.cashOut;
    return { ...entry, runningBalance: currentBalance };
  });

  // Reverse to show latest first
  entriesWithBalance.reverse();

  // Search filter
  const filteredEntries = entriesWithBalance.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.reference.toLowerCase().includes(s) ||
      e.description.toLowerCase().includes(s) ||
      e.cashierName.toLowerCase().includes(s) ||
      e.typeLabel.toLowerCase().includes(s)
    );
  });

  // Calculations for summary metrics
  const totalOpeningCash = rawEntries.filter(e => e.type === 'MODAL_SHIFT').reduce((a, c) => a + c.cashIn, 0);
  const totalCashSales = rawEntries.filter(e => e.type === 'PENJUALAN_TUNAI').reduce((a, c) => a + c.cashIn, 0);
  const totalNonCashSales = rawEntries.filter(e => e.type === 'PENJUALAN_NON_TUNAI').reduce((a, c) => a + c.cashIn, 0);
  const totalCashIn = rawEntries.filter(e => e.type === 'KAS_MASUK').reduce((a, c) => a + c.cashIn, 0);
  const totalExpenses = rawEntries.filter(e => e.type === 'EXPENSE').reduce((a, c) => a + c.cashOut, 0);
  const totalPurchases = rawEntries.filter(e => e.type === 'PURCHASE').reduce((a, c) => a + c.cashOut, 0);
  const totalCashOut = rawEntries.filter(e => e.type === 'KAS_KELUAR').reduce((a, c) => a + c.cashOut, 0) + totalExpenses + totalPurchases;

  const endingCashBalance = (totalOpeningCash + totalCashSales + totalCashIn) - totalCashOut;

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = filteredEntries.map((e, idx) => ({
      No: idx + 1,
      'Waktu / Tanggal': formatDateTime(e.timestamp),
      'Kategori Mutasi': e.typeLabel,
      'No. Referensi / Invoice': e.reference,
      'Kasir / Operator': e.cashierName,
      'Rincian / Keterangan': e.description,
      'Kas Masuk (Debet Rp)': e.cashIn,
      'Kas Keluar (Kredit Rp)': e.cashOut,
      'Saldo Akhir (Rp)': e.runningBalance,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku Kas');
    XLSX.writeFile(workbook, `Buku_Kas_Lengkap_${period}_${selectedDate}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-800" />
            <span>Buku Kas Lengkap Toko & Kasir</span>
          </h1>
          <p className="text-xs text-stone-500">
            Jurnal mutasi arus kas, saldo modal awal, hasil penjualan, kas masuk/keluar, dan beban operasional harian, mingguan, serta bulanan.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Eksport Excel Buku Kas</span>
        </button>
      </div>

      {/* Period Selector & Date Picker */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setPeriod('daily')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === 'daily'
                ? 'bg-[#2D1B14] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Per Hari (Daily)
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === 'weekly'
                ? 'bg-[#2D1B14] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Per Minggu (Weekly)
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === 'monthly'
                ? 'bg-[#2D1B14] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Per Bulan (Monthly)
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === 'all'
                ? 'bg-[#2D1B14] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Semua Periode
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5">
            <Database className="w-3.5 h-3.5 text-amber-800 shrink-0" />
            <select
              value={volumeSelector}
              onChange={e => setVolumeSelector(e.target.value)}
              className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none cursor-pointer"
              title="Pilih Sumber Spreadsheet"
            >
              <option value="ACTIVE">
                Spreadsheet Aktif {activeVolume ? `(Vol. ${activeVolume.volume_number})` : ''}
              </option>
              {archivedVolumes.length > 0 && (
                <option value="ALL">Semua Spreadsheet (Aktif + Arsip)</option>
              )}
              {archivedVolumes.map(v => (
                <option key={v.volume_id} value={v.volume_id}>
                  Arsip Vol. {v.volume_number} ({v.transaction_count} tx)
                </option>
              ))}
            </select>
          </div>

          {period !== 'all' && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-stone-400" />
              <input
                type={period === 'monthly' ? 'month' : 'date'}
                value={period === 'monthly' ? selectedDate.slice(0, 7) : selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-1">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Modal Shift Awal</div>
          <div className="text-sm font-black text-stone-900">{formatRupiah(totalOpeningCash)}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-2xs space-y-1">
          <div className="text-[10px] text-emerald-800 font-bold uppercase">Penjualan Tunai</div>
          <div className="text-sm font-black text-emerald-900">{formatRupiah(totalCashSales)}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-sky-200 bg-sky-50/50 shadow-2xs space-y-1">
          <div className="text-[10px] text-sky-800 font-bold uppercase">Penjualan QRIS/Non-Tunai</div>
          <div className="text-sm font-black text-sky-900">{formatRupiah(totalNonCashSales)}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-1">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Setoran Kas Masuk</div>
          <div className="text-sm font-black text-emerald-700">{formatRupiah(totalCashIn)}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50/40 shadow-2xs space-y-1">
          <div className="text-[10px] text-red-800 font-bold uppercase">Beban Operasional</div>
          <div className="text-sm font-black text-red-700">{formatRupiah(totalExpenses)}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-2xs space-y-1">
          <div className="text-[10px] text-amber-800 font-bold uppercase">Pembelian Restok PO</div>
          <div className="text-sm font-black text-amber-900">{formatRupiah(totalPurchases)}</div>
        </div>

        <div className="p-3.5 rounded-2xl border border-amber-800 bg-[#2D1B14] text-white shadow-md space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-amber-300 font-bold uppercase">Saldo Akhir Buku Kas</div>
          <div className="text-base font-black text-white">{formatRupiah(endingCashBalance)}</div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari transaksi, no. invoice, atau kasir..."
              className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-amber-700"
            />
          </div>
          <div className="text-xs text-stone-500 font-semibold">
            Tercatat <span className="text-stone-900 font-bold">{filteredEntries.length}</span> mutasi kas
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">Waktu & Tanggal</th>
                  <th className="px-4 py-3">Kategori Mutasi</th>
                  <th className="px-4 py-3">No. Referensi</th>
                  <th className="px-4 py-3">Kasir / Operator</th>
                  <th className="px-4 py-3">Keterangan / Rincian</th>
                  <th className="px-4 py-3 text-right">Debet (Masuk)</th>
                  <th className="px-4 py-3 text-right">Kredit (Keluar)</th>
                  <th className="px-4 py-3 text-right">Saldo Running</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      Belum ada catatan mutasi kas pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(e => {
                    const isMasuk = e.cashIn > 0;
                    const isKeluar = e.cashOut > 0;

                    return (
                      <tr key={e.id} className="hover:bg-amber-50/30 transition">
                        <td className="px-4 py-3 font-mono text-[10px] text-stone-500 whitespace-nowrap">
                          {formatDateTime(e.timestamp)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.type === 'MODAL_SHIFT'
                                ? 'bg-purple-100 text-purple-800'
                                : e.type === 'PENJUALAN_TUNAI'
                                ? 'bg-emerald-100 text-emerald-800'
                                : e.type === 'PENJUALAN_NON_TUNAI'
                                ? 'bg-sky-100 text-sky-800'
                                : e.type === 'EXPENSE'
                                ? 'bg-red-100 text-red-800'
                                : e.type === 'PURCHASE'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {e.typeLabel}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-mono font-bold text-stone-800 whitespace-nowrap">
                          {e.reference}
                        </td>

                        <td className="px-4 py-3 font-semibold text-stone-700 whitespace-nowrap">
                          {e.cashierName}
                        </td>

                        <td className="px-4 py-3 text-stone-800 font-medium max-w-xs truncate">
                          {e.description}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                          {isMasuk ? formatRupiah(e.cashIn) : '-'}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-red-600 whitespace-nowrap">
                          {isKeluar ? formatRupiah(e.cashOut) : '-'}
                        </td>

                        <td className="px-4 py-3 text-right font-black text-stone-900 whitespace-nowrap">
                          {formatRupiah(e.runningBalance || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
