import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  FileSpreadsheet,
  QrCode,
  ShieldCheck,
  Download,
  Upload,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  Mail,
  Archive,
  Gauge,
  Eye,
  PlusCircle,
  DownloadCloud,
  UploadCloud,
  LogOut,
} from 'lucide-react';
import { CafeSettings, SpreadsheetVolume } from '../types';
import { db } from '../services/db';
import {
  ALL_21_SHEETS,
  exportAllSheetsAsJSON,
} from '../services/googleSheetsAuto';
import {
  autoRotateSpreadsheetIfNeeded,
  measureSpreadsheetCapacity,
  SpreadsheetCapacityReport,
} from '../services/googleWorkspaceProvisioner';
import { getAccessToken, googleSignIn, googleSignOut } from '../services/googleAuth';
import { syncManager } from '../services/offlineSync';
import { formatDateTime } from '../services/printer';
import { GoogleWorkspaceSetupModal } from '../components/setup/GoogleWorkspaceSetupModal';
import { SpreadsheetArchiveModal } from '../components/setup/SpreadsheetArchiveModal';
import { useDialog } from '../contexts/DialogContext';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CafeSettings>(db.getSettings());
  const [googleEmail, setGoogleEmail] = useState(settings.google_account_email || '');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [provisionSuccessMsg, setProvisionSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [restoreJson, setRestoreJson] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [capacityReport, setCapacityReport] = useState<SpreadsheetCapacityReport | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [selectedArchiveVolume, setSelectedArchiveVolume] = useState<SpreadsheetVolume | null>(null);
  const { showAlert, confirmAction, toast } = useDialog();

  const refreshCapacity = async () => {
    const token = await getAccessToken();
    const report = await measureSpreadsheetCapacity(token);
    setCapacityReport(report);
  };

  React.useEffect(() => {
    refreshCapacity();
    const onDataUpdated = () => {
      const updated = db.getSettings();
      setSettings(updated);
      setGoogleEmail(updated.google_account_email || '');
      refreshCapacity();
    };
    window.addEventListener('martvai:data-updated', onDataUpdated);
    return () => window.removeEventListener('martvai:data-updated', onDataUpdated);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateSettings({ ...settings, google_account_email: googleEmail });
    refreshCapacity();
    toast('Pengaturan swalayan & ambang rotasi spreadsheet berhasil disimpan!', 'success');
  };

  const handleAutoProvisionGoogle = () => {
    setShowGoogleModal(true);
  };

  const handlePullFromSheets = async () => {
    if (!settings.google_sheet_id || settings.google_sheet_id.startsWith('1vai_')) {
      setShowGoogleModal(true);
      return;
    }

    const ok = await confirmAction({
      title: 'Tarik Data Terbaru dari Google Spreadsheet',
      message:
        'Data produk, kategori, stok, pengguna, & transaksi lokal pada perangkat ini akan disinkronkan dari Google Spreadsheet terhubung. Lanjutkan?',
      confirmLabel: 'Ya, Tarik Data',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSyncingCloud(true);
    setProvisionSuccessMsg(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }
      if (!token) throw new Error('Otorisasi Google dibatalkan.');
      const res = await syncManager.pullFromSpreadsheet(token);
      setSettings(db.getSettings());
      await refreshCapacity();
      setProvisionSuccessMsg(
        `Berhasil menarik data "${res.spreadsheetTitle}" (${res.productsCount} produk, ${res.transactionsCount} transaksi).`
      );
      toast('Data terbaru dari Google Sheets berhasil dimuat!', 'success');
    } catch (err: any) {
      await showAlert(`Gagal menarik data: ${err.message}`, 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handlePushAllToSheets = async () => {
    if (!settings.google_sheet_id || settings.google_sheet_id.startsWith('1vai_')) {
      setShowGoogleModal(true);
      return;
    }

    const ok = await confirmAction({
      title: 'Upload Semua Data Lokal ke Google Sheets',
      message:
        'Seluruh 21 sheet di Google Spreadsheet akan diperbarui sesuai data terbaru di perangkat ini (termasuk perubahan produk, pengguna, stok, pengaturan, & item yang dihapus). Lanjutkan?',
      confirmLabel: 'Ya, Upload ke Sheets',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSyncingCloud(true);
    setProvisionSuccessMsg(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      }
      if (!token) throw new Error('Otorisasi Google dibatalkan.');
      const res = await syncManager.pushFullDatabase(token);
      setSettings(db.getSettings());
      await refreshCapacity();
      setProvisionSuccessMsg(
        `Push penuh berhasil! ${res.totalRowsWritten} baris data master & transaksi berhasil diperbarui di Google Sheets.`
      );
      toast('Semua perubahan berhasil disimpan ke Google Sheets!', 'success');
    } catch (err: any) {
      await showAlert(`Gagal mengunggah data: ${err.message}`, 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleDisconnectAndReset = async () => {
    const ok = await confirmAction({
      title: 'Putus Koneksi Google & Ganti Toko / Akun',
      message:
        'Koneksi ke Google Spreadsheet saat ini akan diputuskan dan cache data toko di perangkat ini dikembalikan ke kondisi awal (data di Google Spreadsheet Anda tetap aman di Google Drive). Lanjutkan?',
      confirmLabel: 'Ya, Putus & Reset Perangkat',
      variant: 'danger',
    });
    if (!ok) return;

    await googleSignOut();
    db.resetWorkspaceToDefaults();
    setSettings(db.getSettings());
    setGoogleEmail('');
    setProvisionSuccessMsg(null);
    await refreshCapacity();
    toast('Koneksi diputuskan. Anda dapat menghubungkan Akun Google atau Spreadsheet lain sekarang.', 'info');
  };

  const handleCheckAndRotate = async (simulate80 = false) => {
    if (simulate80) {
      const confirmed = await confirmAction({
        title: 'Simulasi Spreadsheet Mencapai 80%',
        message:
          'Sistem akan mengarsipkan spreadsheet aktif saat ini sebagai Volume lama (tetap dapat dibaca di seluruh laporan & riwayat), lalu otomatis membuat dan mengaktifkan Spreadsheet baru (Vol. berikutnya). Lanjutkan?',
        confirmLabel: 'Ya, Buat Spreadsheet Baru',
        variant: 'warning',
      });
      if (!confirmed) return;
    }

    setIsRotating(true);
    try {
      const token = await getAccessToken();
      const res = await autoRotateSpreadsheetIfNeeded(
        token,
        simulate80 ? { simulatedPercent: 80 } : undefined
      );
      setSettings(db.getSettings());
      setCapacityReport(res.report);
      if (res.rotated) {
        setProvisionSuccessMsg(res.message);
        toast(res.message, 'success');
      } else {
        toast(res.message, 'info');
      }
    } catch (err) {
      await showAlert(`Gagal memeriksa/merotasi spreadsheet: ${(err as Error).message}`, 'error');
    } finally {
      setIsRotating(false);
    }
  };

  const handleCopySpreadsheetId = () => {
    if (settings.google_sheet_id) {
      navigator.clipboard.writeText(settings.google_sheet_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleExportBackup = () => {
    const backupStr = db.exportFullBackup();
    const blob = new Blob([backupStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MartVai_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload21SheetsJSON = () => {
    const sheetsData = exportAllSheetsAsJSON();
    const blob = new Blob([sheetsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MartVai_21Sheets_Database_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = async () => {
    if (!restoreJson.trim()) {
      toast('Tempelkan teks data backup JSON pada kolom yang tersedia.', 'warning');
      return;
    }
    const res = db.importFullBackup(restoreJson);
    if (res.success) {
      await showAlert('Pemulihan data backup berhasil! Halaman akan memuat ulang data.', 'success');
      window.location.reload();
    } else {
      await showAlert(`Gagal memulihkan data: ${res.error}`, 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-stone-900 tracking-tight">Pengaturan Sistem & Database</h1>
        <p className="text-xs text-stone-500">
          Otomatisasi pembuatan Google Spreadsheet & Folder Drive, konfigurasi PPN / pajak ritel, dan identitas swalayan.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* GOOGLE SPREADSHEET & DRIVE AUTOMATION (KEY USER REQUIREMENT) */}
        <div className="p-6 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <span>Google Spreadsheet & Drive (Otomatis 21 Sheet)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Tanpa Deploy Manual
                  </span>
                </h2>
                <p className="text-xs text-stone-500">
                  Cukup masukkan Akun Google Anda. Sistem otomatis membuat Folder Drive, File Spreadsheet, dan menghubungkan 21 tabel.
                </p>
              </div>
            </div>

            {settings.google_auto_synced && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Terhubung Otomatis</span>
              </span>
            )}
          </div>

          {/* Official Google OAuth 2.0 Integration Banner */}
          <div className="rounded-2xl border border-emerald-300 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 shadow-2xs">
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                    <span>Instalasi Otomatis Google Workspace (OAuth 2.0)</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Rekomendasi Utama
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {settings.google_oauth_connected
                      ? `Terhubung ke Google: ${settings.google_account_email} (${settings.google_connected_user_name || 'Owner'})`
                      : 'Hubungkan Akun Google untuk membuat Folder Drive & 21 Sheet Spreadsheet otomatis tanpa setup manual.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{settings.google_oauth_connected ? 'Kelola / Uji Database Google' : 'Mulai Auto Setup Google'}</span>
              </button>
            </div>
          </div>

          {/* Form Input Alamat Akun Google & OAuth 2.0 Controls */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-700" />
                <span>Akun Google Terhubung (Opsional / Otomatis Terisi via OAuth)</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={googleEmail}
                  onChange={e => setGoogleEmail(e.target.value)}
                  placeholder="Klik Hubungkan Akun Google atau isi email toko..."
                  className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-900 focus:border-emerald-600 focus:outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleAutoProvisionGoogle}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Pindai / Buat Spreadsheet Google (OAuth 2.0)</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Sistem menggunakan Google OAuth 2.0 resmi untuk mendeteksi Spreadsheet toko yang sudah ada di perangkat lain atau membuat Database 21 Sheet baru otomatis.
              </p>
            </div>

            {provisionSuccessMsg && (
              <div className="p-3 bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{provisionSuccessMsg}</span>
              </div>
            )}

            {/* Status Hasil Pembuatan Otomatis */}
            {settings.google_sheet_id && (
              <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                      Google Spreadsheet ID
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-stone-800 font-bold bg-stone-100 px-2.5 py-1 rounded-lg truncate flex-1 text-[11px]">
                        {settings.google_sheet_id}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySpreadsheetId}
                        className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition"
                        title="Salin ID"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                      Folder Google Drive Media
                    </div>
                    <div className="font-mono text-stone-800 font-semibold bg-stone-100 px-2.5 py-1 rounded-lg truncate text-[11px]">
                      {settings.google_drive_folder_id || 'folder_vai_media_auto'}
                    </div>
                  </div>
                </div>

                {/* Direct Action Links & 2-Way Sync */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={handlePullFromSheets}
                    disabled={isSyncingCloud}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <DownloadCloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-pulse' : ''}`} />
                    <span>Tarik Data Terbaru (Pull)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushAllToSheets}
                    disabled={isSyncingCloud}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-pulse' : ''}`} />
                    <span>Push Semua Data ke Sheets</span>
                  </button>

                  <a
                    href={settings.google_spreadsheet_url || `https://docs.google.com/spreadsheets/d/${settings.google_sheet_id}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Google Spreadsheet</span>
                  </a>

                  <a
                    href={settings.google_drive_folder_url || `https://drive.google.com/drive/folders/${settings.google_drive_folder_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-xs transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Buka Folder Drive</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleDownload21SheetsJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor 21 Sheet (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectAndReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Putus Koneksi &amp; Ganti Toko</span>
                  </button>
                </div>

                {/* 21 Sheets Indicator Badges */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-stone-600 mb-1.5">
                    Daftar 21 Sheet Terpasang Otomatis:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ALL_21_SHEETS.map(sheet => (
                      <span
                        key={sheet}
                        className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 font-mono text-[9px] font-semibold text-stone-700"
                      >
                        ✓ {sheet}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Kapasitas Spreadsheet 80% & Auto-Rotasi */}
            {(() => {
              const activeVolume = db.getActiveVolume();
              const archivedVolumes = db.getArchivedVolumes();
              const usedCells = capacityReport?.usedCells ?? activeVolume?.used_cells ?? 0;
              const maxCells = capacityReport?.maxCells ?? settings.spreadsheet_cell_limit ?? 10000000;
              const thresholdPct = capacityReport?.thresholdPercent ?? settings.spreadsheet_rotation_threshold ?? 80;
              const usagePct = capacityReport?.usagePercent ?? activeVolume?.usage_percent ?? 0;
              const barColor =
                usagePct >= thresholdPct
                  ? 'bg-red-600'
                  : usagePct >= 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-600';

              return (
                <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-amber-800" />
                      <div>
                        <div className="text-xs font-extrabold text-stone-900">
                          Kapasitas Spreadsheet Aktif {activeVolume ? `(Vol. ${activeVolume.volume_number})` : ''} & Auto-Rotasi {thresholdPct}%
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Ketika pemakaian sel mencapai ≥ {thresholdPct}% kapasitas, sistem otomatis membuat Spreadsheet baru dan tetap menjaga data lama terbaca.
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border shrink-0 ${
                        usagePct >= thresholdPct
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {usagePct.toFixed(2)}% Terpakai
                    </span>
                  </div>

                  {/* Usage Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3 rounded-full bg-stone-100 border border-stone-200 overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.min(100, Math.max(2, usagePct))}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600">
                      <span>
                        Estimasi Sel Terpakai: <strong className="font-mono text-stone-900">{usedCells.toLocaleString('id-ID')}</strong> / {maxCells.toLocaleString('id-ID')} sel ({capacityReport?.totalRows?.toLocaleString('id-ID') ?? 0} baris)
                      </span>
                      <span className="font-semibold text-amber-800">
                        Batas Auto-Create Spreadsheet Baru: {thresholdPct}%
                      </span>
                    </div>
                  </div>

                  {/* Threshold & Limit Config */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Ambang Auto-Rotasi (%)
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={99}
                        value={settings.spreadsheet_rotation_threshold ?? 80}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            spreadsheet_rotation_threshold: Math.max(50, Math.min(99, Number(e.target.value) || 80)),
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-amber-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Kapasitas Maksimal Sel per Spreadsheet
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={settings.spreadsheet_cell_limit ?? 10000000}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            spreadsheet_cell_limit: Math.max(1000, Number(e.target.value) || 10000000),
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:border-amber-700"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCheckAndRotate(false)}
                      disabled={isRotating}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                      <span>Periksa Kapasitas & Rotasi Sekarang</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCheckAndRotate(true)}
                      disabled={isRotating}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                      <span>Simulasi Capai 80% (Buat Spreadsheet Baru)</span>
                    </button>
                  </div>

                  {/* Arsip Spreadsheet Lama */}
                  <div className="pt-3 border-t border-stone-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-800">
                        <Archive className="w-4 h-4 text-amber-800" />
                        <span>Arsip Spreadsheet Lama (Tetap Dapat Dibaca)</span>
                      </div>
                      <span className="text-[11px] font-bold text-stone-500">
                        {archivedVolumes.length} volume arsip
                      </span>
                    </div>

                    {archivedVolumes.length === 0 ? (
                      <div className="p-3 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-[11px] text-stone-500">
                        Belum ada spreadsheet yang diarsipkan. Saat spreadsheet aktif mencapai {thresholdPct}%, file lama otomatis tersimpan di sini agar tetap dapat dibaca kapan saja.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {archivedVolumes.map(vol => (
                          <div
                            key={vol.volume_id}
                            className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-amber-900 text-white text-[10px] font-bold">
                                  Vol. {vol.volume_number}
                                </span>
                                <span className="font-bold text-stone-900 truncate">{vol.title}</span>
                                <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
                                  ARSIP ({vol.usage_percent.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-500">
                                {vol.transaction_count} transaksi • Periode: {vol.date_range_start || '-'} s.d. {vol.date_range_end || '-'} • Diarsipkan: {vol.archived_at ? formatDateTime(vol.archived_at) : '-'}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedArchiveVolume(vol)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-bold transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Baca Data</span>
                              </button>
                              <a
                                href={vol.spreadsheet_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-bold transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Sheets</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Identitas Bisnis */}
        <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-4">
          <h2 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-2">
            Profil &amp; Identitas Supermarket / Swalayan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Nama Swalayan / Toko *</label>
              <input
                type="text"
                value={settings.cafe_name}
                onChange={e => setSettings({ ...settings, cafe_name: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Nama Pemilik</label>
              <input
                type="text"
                value={settings.owner_name}
                onChange={e => setSettings({ ...settings, owner_name: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => setSettings({ ...settings, address: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={settings.phone}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Email Bisnis</label>
              <input
                type="email"
                value={settings.email}
                onChange={e => setSettings({ ...settings, email: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Pajak & Service Charge */}
        <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-4">
          <h2 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-2">
            Pengaturan Pajak PPN Ritel &amp; Biaya Layanan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tax_enabled}
                  onChange={e => setSettings({ ...settings, tax_enabled: e.target.checked })}
                  className="rounded text-amber-800"
                />
                <span>Aktifkan Pajak Ritel (PPN)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.tax_percentage}
                  onChange={e => setSettings({ ...settings, tax_percentage: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-stone-300 p-1.5 text-xs font-bold focus:outline-none"
                />
                <span className="text-xs text-stone-500">% per transaksi</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.service_charge_enabled}
                  onChange={e => setSettings({ ...settings, service_charge_enabled: e.target.checked })}
                  className="rounded text-amber-800"
                />
                <span>Aktifkan Biaya Layanan (Service Charge)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.service_charge_percentage}
                  onChange={e => setSettings({ ...settings, service_charge_percentage: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-stone-300 p-1.5 text-xs font-bold focus:outline-none"
                />
                <span className="text-xs text-stone-500">% per transaksi</span>
              </div>
            </div>
          </div>
        </div>

        {/* QRIS Configuration */}
        <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <QrCode className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-extrabold text-stone-900">
              Pengaturan QRIS Merchant
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Nama Merchant QRIS</label>
              <input
                type="text"
                value={settings.qris_merchant_name || ''}
                onChange={e => setSettings({ ...settings, qris_merchant_name: e.target.value })}
                placeholder="Contoh: MARTVAI SWALAYAN JAKARTA"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">NMID (National Merchant ID)</label>
              <input
                type="text"
                value={settings.qris_nmid || ''}
                onChange={e => setSettings({ ...settings, qris_nmid: e.target.value })}
                placeholder="Contoh: ID1020030040050"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-4">
          <h2 className="text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-2">
            Cadangkan (Backup) & Pulihkan (Restore) Data
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <div className="text-xs font-bold text-stone-700">Ekspor Backup Lengkap</div>
              <p className="text-[11px] text-stone-500">
                Unduh seluruh data produk, transaksi, resep, pengeluaran, dan audit log dalam file JSON aman.
              </p>
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Backup JSON</span>
              </button>
            </div>

            <div className="flex-1 space-y-2 border-t sm:border-t-0 sm:border-l border-stone-200 pt-4 sm:pt-0 sm:pl-4">
              <div className="text-xs font-bold text-stone-700">Pulihkan dari JSON</div>
              <textarea
                rows={2}
                value={restoreJson}
                onChange={e => setRestoreJson(e.target.value)}
                placeholder="Tempelkan teks JSON backup di sini..."
                className="w-full rounded-xl border border-stone-300 p-2 text-xs font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={handleImportBackup}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition"
              >
                <Upload className="w-4 h-4" />
                <span>Pulihkan Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-extrabold shadow-md transition active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Seluruh Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Google Workspace Setup Modal */}
      <GoogleWorkspaceSetupModal
        isOpen={showGoogleModal}
        onClose={() => {
          setShowGoogleModal(false);
          setSettings(db.getSettings());
          refreshCapacity();
        }}
        onSuccess={() => {
          setSettings(db.getSettings());
          refreshCapacity();
        }}
      />

      {/* Archived Spreadsheet Reader Modal */}
      <SpreadsheetArchiveModal
        volume={selectedArchiveVolume}
        onClose={() => setSelectedArchiveVolume(null)}
      />
    </div>
  );
};
