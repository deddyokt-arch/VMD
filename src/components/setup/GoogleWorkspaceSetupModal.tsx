import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Database,
  Layers,
  Check,
  X,
  Gauge,
  Archive,
  DownloadCloud,
  UploadCloud,
  Search,
  Link2,
  LogOut,
  PlusCircle,
} from 'lucide-react';
import {
  googleSignIn,
  googleSignOut,
  getCurrentGoogleUser,
  getAccessToken,
} from '../../services/googleAuth';
import {
  runGoogleWorkspaceAutoSetup,
  testSpreadsheetConnection,
  discoverMartVaiSpreadsheets,
  pullDatabaseFromSpreadsheet,
  pushAllDataToSpreadsheet,
  extractSpreadsheetId,
  DiscoveredSpreadsheet,
  SetupStepProgress,
  ProvisioningSuccess,
} from '../../services/googleWorkspaceProvisioner';
import { db } from '../../services/db';
import { CafeSettings } from '../../types';
import { ALL_21_SHEETS } from '../../services/googleSheetsAuto';
import { useDialog } from '../../contexts/DialogContext';
import { formatDateTime } from '../../services/printer';

interface GoogleWorkspaceSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GoogleWorkspaceSetupModal: React.FC<GoogleWorkspaceSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [settings, setSettings] = useState<CafeSettings>(db.getSettings());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<SetupStepProgress | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<ProvisioningSuccess | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingDiag, setIsTestingDiag] = useState(false);

  // Multi-device / Multi-user discovery states
  const [discoveredList, setDiscoveredList] = useState<DiscoveredSpreadsheet[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [manualLinkOrId, setManualLinkOrId] = useState('');
  const [signedInEmail, setSignedInEmail] = useState<string>('');
  const [signedInName, setSignedInName] = useState<string>('');

  const { confirmAction, toast } = useDialog();

  const ensureOAuthToken = async (): Promise<{
    token: string;
    email: string;
    name: string;
  }> => {
    const existingToken = await getAccessToken();
    const existingUser = getCurrentGoogleUser();
    if (existingToken && existingUser?.email) {
      setSignedInEmail(existingUser.email);
      setSignedInName(existingUser.displayName || 'Pemilik Swalayan');
      return {
        token: existingToken,
        email: existingUser.email,
        name: existingUser.displayName || 'Pemilik Swalayan',
      };
    }

    const authResult = await googleSignIn();
    if (!authResult) {
      throw new Error('Autentikasi Google dibatalkan.');
    }
    const email = authResult.user.email || '';
    const name = authResult.user.displayName || 'Pemilik Swalayan';
    setSignedInEmail(email);
    setSignedInName(name);
    return { token: authResult.accessToken, email, name };
  };

  const refreshDiscoveredList = async (token?: string) => {
    const activeToken = token || (await getAccessToken());
    if (!activeToken) return;
    setIsDiscovering(true);
    try {
      const files = await discoverMartVaiSpreadsheets(activeToken);
      setDiscoveredList(files);
    } finally {
      setIsDiscovering(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const s = db.getSettings();
      setSettings(s);
      setErrorMessage(null);
      setStatusMessage(null);
      setCurrentProgress(null);
      const gUser = getCurrentGoogleUser();
      setSignedInEmail(gUser?.email || s.google_account_email || '');
      setSignedInName(gUser?.displayName || s.google_connected_user_name || '');
      refreshDiscoveredList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAlreadySetup = !!(settings.google_sheet_id && settings.google_oauth_connected);

  // Auto setup / Auto-discover existing or create new
  const handleStartGoogleSetup = async (mode: 'auto' | 'create_new' = 'auto') => {
    if (mode === 'create_new') {
      const ok = await confirmAction({
        title: 'Buat Database Spreadsheet Baru',
        message:
          'Sistem akan membuat file Google Spreadsheet 21 Sheet baru di Google Drive akun yang dipilih. Lanjutkan?',
        confirmLabel: 'Ya, Buat Baru',
        variant: 'warning',
      });
      if (!ok) return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setProvisionSuccess(null);

    try {
      setCurrentProgress({
        step: 0,
        totalSteps: 5,
        label: 'Menghubungkan Akun Google Resmi...',
        status: 'in_progress',
        detail: 'Membuka jendela autentikasi resmi Google OAuth 2.0...',
      });

      const { token, email, name } = await ensureOAuthToken();
      await refreshDiscoveredList(token);

      const result = await runGoogleWorkspaceAutoSetup(
        token,
        email,
        name,
        progress => setCurrentProgress(progress),
        { mode }
      );

      setProvisionSuccess(result);
      setSettings(db.getSettings());
      setStatusMessage(
        result.pulledFromCloud
          ? `Berhasil menemukan database existing di Google Drive (${email}) dan menarik datanya ke perangkat ini.`
          : 'Database Google Spreadsheet 21 Sheet berhasil disiapkan.'
      );
      toast('Database Google Spreadsheet siap digunakan!', 'success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Auto setup error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses setup Google Workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  // Scan Google Drive for existing spreadsheets
  const handleScanGoogleDrive = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const { token } = await ensureOAuthToken();
      await refreshDiscoveredList(token);
      toast('Daftar Spreadsheet dari Google Drive diperbarui.', 'info');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memindai Google Drive.');
    }
  };

  // Connect & Pull a specific existing Spreadsheet (Auto-Discovered or Manual URL/ID)
  const handleConnectAndPullSpreadsheet = async (rawIdOrUrl: string, titleHint?: string) => {
    const cleanId = extractSpreadsheetId(rawIdOrUrl);
    if (!cleanId || cleanId.length < 10) {
      toast('Masukkan ID atau Link Google Spreadsheet yang valid.', 'warning');
      return;
    }

    const ok = await confirmAction({
      title: 'Tarik & Hubungkan Database Cloud',
      message: `Data lokal pada perangkat ini akan disinkronkan dan diperbarui dari Spreadsheet "${
        titleHint || cleanId
      }". Pastikan transaksi offline yang penting sudah di-push jika masih diperlukan. Lanjutkan?`,
      confirmLabel: 'Ya, Hubungkan & Tarik Data',
      variant: 'warning',
    });
    if (!ok) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setProvisionSuccess(null);

    try {
      const { token, email, name } = await ensureOAuthToken();
      const pullRes = await pullDatabaseFromSpreadsheet(
        token,
        cleanId,
        email,
        name,
        progress => setCurrentProgress(progress)
      );

      setSettings(db.getSettings());
      setProvisionSuccess({
        spreadsheetId: pullRes.spreadsheetId,
        spreadsheetUrl: pullRes.spreadsheetUrl,
        folderId: db.getSettings().google_drive_folder_id || '',
        folderUrl: db.getSettings().google_drive_folder_url || '',
        email,
        isExistingReused: true,
        pulledFromCloud: true,
        sheetsCreated: ALL_21_SHEETS,
      });
      setStatusMessage(
        `Berhasil memuat "${pullRes.spreadsheetTitle}": ${pullRes.productsCount} produk, ${pullRes.categoriesCount} kategori, & ${pullRes.transactionsCount} transaksi.`
      );
      setManualLinkOrId('');
      toast('Data dari Google Spreadsheet berhasil dimuat ke perangkat ini!', 'success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghubungkan & menarik data spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull latest from currently connected spreadsheet
  const handlePullCurrent = async () => {
    if (!settings.google_sheet_id) return;
    await handleConnectAndPullSpreadsheet(settings.google_sheet_id, 'Spreadsheet Aktif Saat Ini');
  };

  // Push full local database to currently connected spreadsheet
  const handlePushAllCurrent = async () => {
    if (!settings.google_sheet_id) {
      toast('Hubungkan Spreadsheet terlebih dahulu.', 'warning');
      return;
    }

    const ok = await confirmAction({
      title: 'Unggah Semua Data Lokal ke Google Sheets',
      message:
        'Aksi ini akan memperbarui seluruh 21 sheet di Google Spreadsheet (Produk, Kategori, Pengguna, Pengaturan, Transaksi, Kas, & Penghapusan) sesuai kondisi terbaru di perangkat ini. Lanjutkan?',
      confirmLabel: 'Ya, Upload ke Sheets',
      variant: 'warning',
    });
    if (!ok) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { token } = await ensureOAuthToken();
      const pushRes = await pushAllDataToSpreadsheet(
        token,
        settings.google_sheet_id,
        progress => setCurrentProgress(progress)
      );
      setSettings(db.getSettings());
      setStatusMessage(
        `Push penuh berhasil! ${pushRes.totalRowsWritten} baris data master & operasional telah diperbarui ke Google Spreadsheet.`
      );
      toast('Seluruh data berhasil diunggah ke Google Spreadsheet!', 'success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunggah data ke Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Google Account cleanly
  const handleSwitchGoogleAccount = async () => {
    const ok = await confirmAction({
      title: 'Ganti Akun Google / Toko',
      message:
        'Anda akan keluar dari sesi Akun Google saat ini dan dapat memilih Akun Google lain beserta database Spreadsheet-nya. Lanjutkan?',
      confirmLabel: 'Ya, Ganti Akun',
      variant: 'warning',
    });
    if (!ok) return;

    setErrorMessage(null);
    setStatusMessage(null);
    await googleSignOut();
    setDiscoveredList([]);
    setSignedInEmail('');
    setSignedInName('');

    try {
      const authResult = await googleSignIn();
      if (authResult) {
        const email = authResult.user.email || '';
        const name = authResult.user.displayName || 'Pemilik Swalayan';
        setSignedInEmail(email);
        setSignedInName(name);
        await refreshDiscoveredList(authResult.accessToken);
        toast(`Terhubung sebagai ${email}. Pilih Spreadsheet tujuan di daftar di bawah.`, 'info');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengganti akun Google.');
    }
  };

  const handleRunDiagnostic = async () => {
    setIsTestingDiag(true);
    setDiagnosticResult(null);
    try {
      const { token } = await ensureOAuthToken();
      if (!settings.google_sheet_id) {
        throw new Error('ID Spreadsheet belum tersedia.');
      }

      const res = await testSpreadsheetConnection(token, settings.google_sheet_id);
      setDiagnosticResult(res);
    } catch (err: any) {
      setDiagnosticResult({
        success: false,
        message: err.message || 'Gagal menjalankan uji koneksi database.',
      });
    } finally {
      setIsTestingDiag(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#2D1B14] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-black shadow-md">
              <Database className="w-6 h-6 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Sinkronisasi & Database Google Workspace
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  OAuth 2.0 Multi-Device
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Hubungkan, cari database lama di Google Drive, serta Tarik (Pull) & Upload (Push) 21 Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Permission & Security Notice */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-stone-700 space-y-1">
                <div className="font-bold text-emerald-950">Multi-Pengguna & Multi-Perangkat Aman:</div>
                <p className="text-stone-600 leading-relaxed">
                  Setiap pemilik toko menggunakan akun Google &amp; Spreadsheet masing-masing. Saat membuka MartVai Pro di perangkat baru, cukup masuk dengan Akun Google yang sama (atau tempel link Spreadsheet) untuk memuat seluruh data toko otomatis tanpa menimpa data cloud.
                </p>
              </div>
            </div>
          </div>

          {/* Setup State: Connected Banner & 2-Way Controls */}
          {(provisionSuccess || isAlreadySetup) && !isLoading && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-sm font-black text-emerald-950">
                      {provisionSuccess?.isExistingReused
                        ? 'Database Google Spreadsheet Terhubung & Tersinkron!'
                        : 'Google Spreadsheet 21 Sheet Aktif Terhubung!'}
                    </div>
                    <div className="text-xs text-emerald-800">
                      Akun Google: <strong>{signedInEmail || settings.google_account_email || provisionSuccess?.email}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSwitchGoogleAccount}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-[11px] font-bold transition cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-stone-500" />
                  <span>Ganti Akun Google</span>
                </button>
              </div>

              {/* 2-Way Pull & Push Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handlePullCurrent}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-950 text-xs font-extrabold transition cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4 text-blue-700" />
                  <span>Tarik Data Terbaru (Pull dari Sheets)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePushAllCurrent}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-extrabold transition cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-amber-800" />
                  <span>Upload Semua Data (Push ke Sheets)</span>
                </button>
              </div>

              {/* Links to Google Spreadsheet and Drive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={settings.google_spreadsheet_url || provisionSuccess?.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-400 transition group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="truncate text-left">
                      <div className="text-xs font-bold text-stone-900 group-hover:text-emerald-950">
                        Buka Google Spreadsheet
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">
                        ID: {settings.google_sheet_id || provisionSuccess?.spreadsheetId}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-emerald-700" />
                </a>

                {(settings.google_drive_folder_url || provisionSuccess?.folderUrl) && (
                  <a
                    href={settings.google_drive_folder_url || provisionSuccess?.folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-400 transition group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FolderPlus className="w-5 h-5 text-amber-700 shrink-0" />
                      <div className="truncate text-left">
                        <div className="text-xs font-bold text-stone-900 group-hover:text-amber-950">
                          Buka Folder Drive
                        </div>
                        <div className="text-[10px] text-stone-500">
                          Database 21 Sheet &amp; Bukti Struk
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-amber-700" />
                  </a>
                )}
              </div>

              {/* Diagnostic Button & Result */}
              <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-stone-600" />
                    <span>Uji Diagnostik Akses Database</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunDiagnostic}
                    disabled={isTestingDiag}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingDiag ? 'animate-spin' : ''}`} />
                    <span>{isTestingDiag ? 'Menguji...' : 'Uji Koneksi Baca/Tulis'}</span>
                  </button>
                </div>

                {diagnosticResult && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      diagnosticResult.success
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-red-100 text-red-900 border border-red-300'
                    }`}
                  >
                    {diagnosticResult.success ? (
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                    )}
                    <span>{diagnosticResult.message}</span>
                  </div>
                )}
              </div>

              {/* Multi-Volume Capacity & Auto-Rotate Status */}
              {(() => {
                const activeVol = db.getActiveVolume();
                const archivedVols = db.getArchivedVolumes();
                const est = db.estimateLocalCellUsage();
                const maxCells = settings.spreadsheet_cell_limit || 10000000;
                const thresholdPct = settings.spreadsheet_rotation_threshold || 80;
                const pct = Math.min(100, Number(((est.usedCells / maxCells) * 100).toFixed(2)));
                return (
                  <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-stone-800">
                      <span className="flex items-center gap-1.5">
                        <Gauge className="w-4 h-4 text-amber-800" />
                        <span>
                          Volume Aktif: Vol. {activeVol?.volume_number || 1} ({pct}% terpakai)
                        </span>
                      </span>
                      <span className="text-[11px] text-amber-900">
                        Auto-Create Baru @ {thresholdPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white border border-amber-200 overflow-hidden">
                      <div
                        className={`h-full ${pct >= thresholdPct ? 'bg-red-600' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-600">
                      <span>{est.usedCells.toLocaleString('id-ID')} / {maxCells.toLocaleString('id-ID')} sel</span>
                      <span className="flex items-center gap-1 font-semibold text-stone-700">
                        <Archive className="w-3.5 h-3.5 text-amber-800" />
                        {archivedVols.length} Spreadsheet Lama Terarsip
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Auto-Discovery & Existing Spreadsheets Section (Multi-Device Selector) */}
          {!isLoading && (
            <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-amber-800" />
                    <span>Pilih / Pindai Spreadsheet di Akun Google (Buka di Perangkat Lain)</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {signedInEmail
                      ? `Menampilkan spreadsheet pada akun ${signedInEmail}`
                      : 'Klik pindai untuk login Akun Google dan menampilkan daftar database toko Anda'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleScanGoogleDrive}
                  disabled={isDiscovering}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-300 hover:border-amber-600 text-xs font-bold text-stone-800 transition cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                  <span>{isDiscovering ? 'Memindai...' : 'Pindai Google Drive'}</span>
                </button>
              </div>

              {discoveredList.length > 0 && (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {discoveredList.map(file => {
                    const isCurrent = file.spreadsheetId === settings.google_sheet_id;
                    return (
                      <div
                        key={file.spreadsheetId}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-400'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 truncate flex items-center gap-1.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="truncate">{file.title}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold shrink-0">
                                AKTIF
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-500 font-mono truncate pl-5">
                            ID: {file.spreadsheetId}
                            {file.modifiedTime ? ` • Update: ${formatDateTime(file.modifiedTime)}` : ''}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleConnectAndPullSpreadsheet(file.spreadsheetId, file.title)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-bold transition cursor-pointer shrink-0"
                        >
                          <DownloadCloud className="w-3.5 h-3.5" />
                          <span>{isCurrent ? 'Tarik Ulang' : 'Muat Database Ini'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Manual Spreadsheet ID / Link Connector */}
              <div className="pt-2 border-t border-stone-200 space-y-1.5">
                <label className="block text-[11px] font-bold text-stone-700 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Atau Hubungkan via Link / ID Spreadsheet Tertentu (Contoh: Perangkat Kasir 2)</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualLinkOrId}
                    onChange={e => setManualLinkOrId(e.target.value)}
                    placeholder="Tempel link https://docs.google.com/spreadsheets/d/... atau ID"
                    className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleConnectAndPullSpreadsheet(manualLinkOrId)}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    Tarik &amp; Hubungkan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* In-Progress Progress Bar & Stepper */}
          {isLoading && currentProgress && (
            <div className="space-y-4 p-5 rounded-2xl bg-amber-50/60 border border-amber-200">
              <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                <span>{currentProgress.label}</span>
                <span>
                  Langkah {currentProgress.step} dari {currentProgress.totalSteps}
                </span>
              </div>

              <div className="w-full bg-amber-200/60 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-800 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.max(15, (currentProgress.step / currentProgress.totalSteps) * 100)}%`,
                  }}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-800">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span className="leading-tight">{currentProgress.detail}</span>
              </div>
            </div>
          )}

          {/* Status Message Alert */}
          {statusMessage && !errorMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{statusMessage}</div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Kendala Koneksi Google Workspace:</div>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Primary Google Sign-In / Setup Buttons */}
          {!isLoading && (
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleStartGoogleSetup('auto')}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-white border border-stone-300 shadow-sm hover:shadow-md hover:bg-stone-50 transition active:scale-98 cursor-pointer text-xs sm:text-sm font-bold text-stone-800"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>
                  {isAlreadySetup
                    ? 'Sinkronisasi Otomatis Akun Google'
                    : 'Hubungkan Google & Deteksi Database Otomatis'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStartGoogleSetup('create_new')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat Database Toko Baru</span>
              </button>
            </div>
          )}

          {/* 21 Sheets Summary Footer */}
          {!isLoading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-800" />
                  Skema Database: 21 Sheet Terstandarisasi
                </span>
                <span className="text-emerald-700">2-Way Pull &amp; Push Ready</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 p-4 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition cursor-pointer"
          >
            Tutup
          </button>

          {(provisionSuccess || isAlreadySetup) && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <span>Mulai Menggunakan Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
