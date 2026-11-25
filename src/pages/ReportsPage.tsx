import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Percent,
  Layers,
  PieChart,
  FileSpreadsheet,
  Database,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../services/db';
import { formatRupiah, formatDateTime, safePrint } from '../services/printer';
import { DailySummary } from '../types';

export const ReportsPage: React.FC = () => {
  const [filterRange, setFilterRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');
  const [volumeSelector, setVolumeSelector] = useState<'ACTIVE' | 'ALL' | string>('ACTIVE');
  const activeVolume = db.getActiveVolume();
  const archivedVolumes = db.getArchivedVolumes();

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthStart = todayStr.slice(0, 7) + '-01';

  let startDate: string | undefined = undefined;
  let endDate: string | undefined = undefined;

  if (filterRange === 'today') {
    startDate = todayStr;
    endDate = todayStr;
  } else if (filterRange === 'yesterday') {
    startDate = yesterday;
    endDate = yesterday;
  } else if (filterRange === 'week') {
    startDate = weekAgo;
  } else if (filterRange === 'month') {
    startDate = monthStart;
  }

  const summary = db.calculateFinancialSummary(startDate, endDate, volumeSelector);
  const transactions = db.getTransactionsByVolume(volumeSelector).filter(t => {
    if (t.transaction_status === 'CANCELLED' || t.transaction_status === 'REFUNDED') return false;
    const d = t.business_date || t.created_at.slice(0, 10);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  // Calculate Product Sales Breakdown (Best Sellers)
  const productSalesMap: { [id: string]: { name: string; qty: number; revenue: number } } = {};
  for (const tx of transactions) {
    for (const item of tx.items) {
      if (!productSalesMap[item.product_id]) {
        productSalesMap[item.product_id] = {
          name: item.product_name_snapshot,
          qty: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.product_id].qty += item.quantity;
      productSalesMap[item.product_id].revenue += item.line_total;
    }
  }

  const sortedBestSellers = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty);

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    // 1. Summary Sheet
    const summaryData = [
      ['LAPORAN KEUANGAN & PEMBUKUAN MARTVAI SWALAYAN'],
      [`Periode Filter: ${filterRange.toUpperCase()} (${startDate || 'Awal'} s.d. ${endDate || 'Sekarang'})`],
      [`Waktu Ekspor: ${new Date().toLocaleString('id-ID')}`],
      [],
      ['METRIK KEUANGAN', 'NILAI (IDR)'],
      ['Penjualan Bruto (Gross Sales)', summary.gross_sales],
      ['Total Diskon Penjualan', summary.discounts],
      ['PENJUALAN BERSIH (NET SALES)', summary.net_sales],
      ['Harga Pokok Penjualan (HPP / COGS)', summary.cogs],
      ['LABA KOTOR (GROSS PROFIT)', summary.gross_profit],
      ['Total Biaya Operasional (Expenses)', summary.expenses],
      ['LABA BERSIH (NET PROFIT)', summary.net_profit],
      [],
      ['PAJAK & SERVICE CHARGE'],
      ['PPN / Pajak Ritel Terkumpul', summary.tax],
      ['Service Charge Terkumpul', summary.service_charge],
      ['Total Transaksi Berhasil', summary.transaction_count],
      [],
      ['REKAP PEMBAYARAN'],
      ['Penjualan Tunai (Cash)', summary.cash_sales],
      ['Penjualan QRIS', summary.qris_sales],
      ['Penjualan Debit / Kartu / Transfer', summary.other_sales],
    ];

    // 2. Transactions Sheet
    const txHeaders = [
      'Waktu Transaksi',
      'Tanggal Bisnis',
      'No. Invoice',
      'Kasir',
      'Tipe Belanja',
      'No. Troli / Member',
      'Metode Pembayaran',
      'Subtotal',
      'Diskon',
      'Pajak PPN',
      'Service Charge',
      'Total Transaksi',
      'Status Transaksi',
    ];

    const txRows = transactions.map(t => [
      formatDateTime(t.created_at),
      t.business_date,
      t.invoice_number,
      t.cashier_name,
      t.order_type,
      t.table_number || '-',
      t.payment_method,
      t.subtotal,
      t.discount,
      t.tax,
      t.service_charge,
      t.total,
      t.transaction_status,
    ]);

    // 3. Best Sellers Sheet
    const bestSellerHeaders = ['Peringkat', 'Nama Produk Swalayan', 'Qty Terjual (Pcs)', 'Total Omzet (IDR)'];
    const bestSellerRows = sortedBestSellers.map((prod, idx) => [
      idx + 1,
      prod.name,
      prod.qty,
      prod.revenue,
    ]);

    // Create Workbook
    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
    const wsBestSellers = XLSX.utils.aoa_to_sheet([bestSellerHeaders, ...bestSellerRows]);

    // Column width configurations
    wsSummary['!cols'] = [{ wch: 38 }, { wch: 22 }];
    wsTx['!cols'] = [
      { wch: 22 },
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
    ];
    wsBestSellers['!cols'] = [{ wch: 10 }, { wch: 32 }, { wch: 20 }, { wch: 22 }];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Laporan');
    XLSX.utils.book_append_sheet(wb, wsTx, 'Rincian Transaksi');
    XLSX.utils.book_append_sheet(wb, wsBestSellers, 'Produk Terlaris');

    // Save File
    const fileName = `MartVai_Laporan_Keuangan_${filterRange}_${todayStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handlePrintReport = () => {
    safePrint();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Laporan Keuangan & Pembukuan Swalayan
          </h1>
          <p className="text-xs text-slate-500">
            Perhitungan omzet bersih, HPP riil barang retail, laba kotor, beban operasional toko, dan laba bersih.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Date Range & Spreadsheet Volume Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'yesterday', label: 'Kemarin' },
            { id: 'week', label: '7 Hari Terakhir' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua Periode' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterRange(tab.id as any)}
              className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                filterRange === tab.id
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-2xs shrink-0">
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
              <option value="ALL">Semua Spreadsheet (Aktif + Arsip Lama)</option>
            )}
            {archivedVolumes.map(v => (
              <option key={v.volume_id} value={v.volume_id}>
                Arsip Vol. {v.volume_number} ({v.transaction_count} tx)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Penjualan Bersih */}
        <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Penjualan Bersih</span>
            <DollarSign className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-black text-stone-900">{formatRupiah(summary.net_sales)}</div>
          <div className="text-[11px] text-stone-500">
            {summary.transaction_count} transaksi berhasil
          </div>
        </div>

        {/* Card 2: HPP (COGS) */}
        <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Harga Pokok (HPP)</span>
            <Layers className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl font-black text-stone-800">{formatRupiah(summary.cogs)}</div>
          <div className="text-[11px] text-stone-500">
            Biaya bahan baku riil produk terjual
          </div>
        </div>

        {/* Card 3: Laba Kotor */}
        <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
            <span>Laba Kotor</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{formatRupiah(summary.gross_profit)}</div>
          <div className="text-[11px] text-stone-500">
            Margin Kotor: {summary.net_sales > 0 ? Math.round((summary.gross_profit / summary.net_sales) * 100) : 0}%
          </div>
        </div>

        {/* Card 4: Laba Bersih */}
        <div className="p-5 rounded-2xl border border-stone-200 bg-linear-to-br from-amber-900 to-[#2D1B14] text-white shadow-md space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300 uppercase tracking-wider">
            <span>Laba Bersih Swalayan</span>
            <Percent className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-2xl font-black text-white">{formatRupiah(summary.net_profit)}</div>
          <div className="text-[11px] text-amber-200/80">
            Setelah dikurangi beban operasional ({formatRupiah(summary.expenses)})
          </div>
        </div>
      </div>

      {/* Comprehensive Income Statement Table */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-extrabold text-stone-900">
          Rincian Laporan Laba Rugi Komprehensif
        </h2>

        <div className="divide-y divide-stone-100 text-xs">
          <div className="flex justify-between py-2 font-semibold text-stone-700">
            <span>Penjualan Bruto (Gross Sales)</span>
            <span>{formatRupiah(summary.gross_sales)}</span>
          </div>

          <div className="flex justify-between py-2 text-amber-800">
            <span>(-) Diskon Penjualan & Promosi</span>
            <span>-{formatRupiah(summary.discounts)}</span>
          </div>

          <div className="flex justify-between py-2.5 font-bold text-stone-900 bg-stone-50 px-2 rounded-lg">
            <span>(=) PENJUALAN BERSIH (NET SALES)</span>
            <span>{formatRupiah(summary.net_sales)}</span>
          </div>

          <div className="flex justify-between py-2 text-stone-600">
            <span>(-) Harga Pokok Penjualan (HPP / Biaya Bahan Baku Terjual)</span>
            <span className="font-semibold text-red-700">-{formatRupiah(summary.cogs)}</span>
          </div>

          <div className="flex justify-between py-2.5 font-bold text-emerald-800 bg-emerald-50/70 px-2 rounded-lg">
            <span>(=) LABA KOTOR (GROSS PROFIT)</span>
            <span>{formatRupiah(summary.gross_profit)}</span>
          </div>

          <div className="flex justify-between py-2 text-stone-600">
            <span>(-) Total Biaya Operasional (Listrik, Sewa, Gaji, dll.)</span>
            <span className="font-semibold text-red-700">-{formatRupiah(summary.expenses)}</span>
          </div>

          <div className="flex justify-between py-3 font-black text-sm text-stone-900 bg-amber-50 px-3 rounded-xl border border-amber-200">
            <span>(=) LABA BERSIH OPERASIONAL (NET PROFIT)</span>
            <span className="text-amber-950 text-base">{formatRupiah(summary.net_profit)}</span>
          </div>

          <div className="pt-4 text-[11px] text-stone-500 space-y-1">
            <div className="font-bold text-stone-700">Pajak &amp; Biaya Layanan (Dilaporkan Terpisah):</div>
            <div className="flex justify-between">
              <span>• Pajak Ritel (PPN) Terkumpul:</span>
              <span className="font-bold text-stone-800">{formatRupiah(summary.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span>• Biaya Layanan Terkumpul:</span>
              <span className="font-bold text-stone-800">{formatRupiah(summary.service_charge)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Best Sellers & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500">
            Produk Terlaris (Best Sellers)
          </h3>
          <div className="space-y-2">
            {sortedBestSellers.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">Belum ada data penjualan.</p>
            ) : (
              sortedBestSellers.slice(0, 5).map((prod, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-stone-800">{prod.name}</div>
                      <div className="text-[10px] text-stone-400">{prod.qty} pcs terjual</div>
                    </div>
                  </div>
                  <div className="font-bold text-amber-950">{formatRupiah(prod.revenue)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500">
            Rekap Berdasarkan Metode Pembayaran
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="font-bold text-emerald-900">Uang Tunai (Cash)</span>
              <span className="font-extrabold text-emerald-900">{formatRupiah(summary.cash_sales)}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <span className="font-bold text-indigo-900">QRIS (Statis & Dinamis)</span>
              <span className="font-extrabold text-indigo-900">{formatRupiah(summary.qris_sales)}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="font-bold text-stone-800">Kartu Debit & Transfer</span>
              <span className="font-extrabold text-stone-800">{formatRupiah(summary.other_sales)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
