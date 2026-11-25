import React, { useEffect, useState } from 'react';
import {
  Archive,
  Download,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SpreadsheetVolume } from '../../types';
import { ALL_21_SHEETS } from '../../services/googleSheetsAuto';
import {
  ArchiveSheetReadResult,
  readArchivedSpreadsheetSheet,
} from '../../services/googleWorkspaceProvisioner';
import { getAccessToken } from '../../services/googleAuth';

interface SpreadsheetArchiveModalProps {
  volume: SpreadsheetVolume | null;
  onClose: () => void;
}

export const SpreadsheetArchiveModal: React.FC<SpreadsheetArchiveModalProps> = ({
  volume,
  onClose,
}) => {
  const [selectedSheet, setSelectedSheet] = useState<string>('TRANSACTIONS');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sheetData, setSheetData] = useState<ArchiveSheetReadResult | null>(null);

  useEffect(() => {
    if (!volume) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const token = await getAccessToken();
        const res = await readArchivedSpreadsheetSheet(volume, selectedSheet, token);
        if (!cancelled) {
          setSheetData(res);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [volume, selectedSheet]);

  if (!volume) return null;

  const filteredRows = (sheetData?.rows || []).filter(row => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return row.some(cell => String(cell ?? '').toLowerCase().includes(q));
  });

  const handleExportSheetExcel = () => {
    if (!sheetData) return;
    const aoa = [sheetData.headers, ...filteredRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedSheet.slice(0, 31));
    XLSX.writeFile(wb, `Arsip_Vol${volume.volume_number}_${selectedSheet}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="bg-[#2D1B14] px-6 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black truncate">
                  Pembaca Arsip Spreadsheet Vol. {volume.volume_number}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30 shrink-0">
                  READ-ONLY
                </span>
              </div>
              <p className="text-[11px] text-stone-300 truncate">
                {volume.title} • {volume.transaction_count} transaksi tercatat ({volume.usage_percent.toFixed(1)}% terpakai)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-bold text-stone-700">Pilih Sheet:</label>
            <select
              value={selectedSheet}
              onChange={e => setSelectedSheet(e.target.value)}
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-700 cursor-pointer"
            >
              {ALL_21_SHEETS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {sheetData && (
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  sheetData.source === 'google_api'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}
              >
                {sheetData.source === 'google_api'
                  ? 'Sumber: Live Google Sheets API'
                  : 'Sumber: Snapshot Arsip Lokal'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari isi sheet..."
                className="w-full rounded-xl border border-stone-300 bg-white pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-700"
              />
            </div>

            <button
              type="button"
              onClick={handleExportSheetExcel}
              disabled={!sheetData || filteredRows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>

            <a
              href={volume.spreadsheet_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold transition shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Sheets</span>
            </a>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-700" />
              <span>Membaca data sheet {selectedSheet} dari arsip Vol. {volume.volume_number}...</span>
            </div>
          ) : !sheetData || filteredRows.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-400 text-xs">
              <FileSpreadsheet className="w-8 h-8 text-stone-300" />
              <span>
                Tidak ada baris data pada sheet <strong>{selectedSheet}</strong> untuk arsip ini.
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-100 text-stone-700 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-3 py-2.5 border-b border-stone-200">#</th>
                    {sheetData.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2.5 border-b border-stone-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {filteredRows.slice(0, 500).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-amber-50/40">
                      <td className="px-3 py-2 font-mono text-[10px] text-stone-400">
                        {rIdx + 1}
                      </td>
                      {sheetData.headers.map((_, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 whitespace-nowrap max-w-xs truncate">
                          {row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>
            Menampilkan {filteredRows.length} baris pada sheet <strong>{selectedSheet}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
