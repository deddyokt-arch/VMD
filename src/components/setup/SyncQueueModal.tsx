import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Trash2,
  ShoppingBag,
  Clock,
  ArrowRight,
  Database,
  X,
  Lock,
  DownloadCloud,
  UploadCloud,
} from 'lucide-react';
import { db } from '../../services/db';
import { syncManager, SyncStatus } from '../../services/offlineSync';
import { googleSignIn, getAccessToken } from '../../services/googleAuth';
import { formatRupiah, formatDateTime } from '../../services/printer';
import { Transaction } from '../../types';
import { useDialog } from '../../contexts/DialogContext';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus());
  const [queueItems, setQueueItems] = useState(db.getSyncQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const { confirmAction, toast } = useDialog();

  useEffect(() => {
    if (isOpen) {
      setQueueItems(db.getSyncQueue());
      setSyncResult(null);
    }
    const unsub = syncManager.subscribe(status => {
      setSyncStatus(status);
      setQueueItems(db.getSyncQueue());
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const settings = db.getSettings();
  const pendingQueue = queueItems.filter(q => q.status === 'PENDING');

  const ensureOAuthAccess = async (): Promise<string | null> => {
    let token = await getAccessToken();
    if (!token) {
      const authRes = await googleSignIn();
      token = authRes?.accessToken || null;
    }
    return token;
  };

  const handleStartSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      await ensureOAuthAccess();

      const res = await syncManager.syncPendingTransactions();
      const updatedQueue = db.getSyncQueue().filter(q => q.status === 'PENDING');
      setQueueItems(db.getSyncQueue());

      if (res.synced > 0) {
        setSyncResult({
          success: true,
          message: `${res.synced} transaksi offline berhasil disinkronkan langsung ke Google Spreadsheet!`,
        });
        if (onSyncSuccess) onSyncSuccess();
      } else if (updatedQueue.length === 0) {
        setSyncResult({
          success: true,
          message: 'Semua transaksi offline sudah tersinkronisasi penuh dengan Google Spreadsheet.',
        });
      } else {
        setSyncResult({
          success: false,
          message: syncStatus.lastError || 'Sebagian transaksi belum dapat disinkronkan. Pastikan akun Google terhubung.',
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Gagal memproses sinkronisasi ke Google Sheets.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    const activeSettings = db.getSettings();
    if (!activeSettings.google_sheet_id || activeSettings.google_sheet_id.startsWith('1vai_')) {
      toast('Hubungkan Akun Google & Spreadsheet terlebih dahulu di Pengaturan.', 'warning');
      return;
    }

    const ok = await confirmAction({
      title: 'Tarik Data Terbaru dari Google Sheets',
      message:
        'Data produk, kategori, stok, pengguna, dan riwayat transaksi pada perangkat ini akan diperbarui dari Google Spreadsheet aktif. Lanjutkan?',
      confirmLabel: 'Ya, Tarik Data',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSyncing(true);
    setSyncResult(null);
    try {
      const token = await ensureOAuthAccess();
      if (!token) throw new Error('Otorisasi Google dibatalkan.');
      const res = await syncManager.pullFromSpreadsheet(token);
      setQueueItems(db.getSyncQueue());
      setSyncResult({
        success: true,
        message: `Berhasil menarik "${res.spreadsheetTitle}": ${res.productsCount} produk & ${res.transactionsCount} transaksi dimuat.`,
      });
      toast('Data terbaru berhasil ditarik dari Google Spreadsheet!', 'success');
      if (onSyncSuccess) onSyncSuccess();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Gagal menarik data dari Google Spreadsheet.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushFullDatabase = async () => {
    const activeSettings = db.getSettings();
    if (!activeSettings.google_sheet_id || activeSettings.google_sheet_id.startsWith('1vai_')) {
      toast('Hubungkan Akun Google & Spreadsheet terlebih dahulu di Pengaturan.', 'warning');
      return;
    }

    const ok = await confirmAction({
      title: 'Push Penuh Seluruh Data ke Google Sheets',
      message:
        'Aksi ini akan memperbarui seluruh 21 sheet di Google Spreadsheet (Produk, Kategori, Stok, Pengguna, Pengaturan, Penghapusan, & Transaksi) sesuai kondisi di perangkat ini. Lanjutkan?',
      confirmLabel: 'Ya, Upload Semua Data',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSyncing(true);
    setSyncResult(null);
    try {
      const token = await ensureOAuthAccess();
      if (!token) throw new Error('Otorisasi Google dibatalkan.');
      const res = await syncManager.pushFullDatabase(token);
      setQueueItems(db.getSyncQueue());
      setSyncResult({
        success: true,
        message: `Push penuh berhasil! ${res.totalRowsWritten} baris master data & transaksi tersimpan ke Google Spreadsheet.`,
      });
      toast('Semua perubahan lokal berhasil diunggah ke Google Spreadsheet!', 'success');
      if (onSyncSuccess) onSyncSuccess();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Gagal mengirim data penuh ke Google Spreadsheet.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearQueueItem = async (opId: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Antrean Offline',
      message: 'Hapus item ini dari antrean sinkronisasi offline?',
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.removeSyncQueueItem(opId);
      setQueueItems(db.getSyncQueue());
      toast('Item antrean offline berhasil dihapus.', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-8 text-stone-800 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-[#2D1B14] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-black shadow-md">
              <RefreshCw className={`w-5 h-5 text-stone-950 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Antrean Sinkronisasi Offline
                </h3>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  {pendingQueue.length} Transaksi
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Data transaksi disimpan aman di lokal saat offline & siap dikirim ke Google Sheets
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
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Sync Status Banner */}
          <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${syncStatus.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900">
                  Status Koneksi: <span className={syncStatus.isOnline ? 'text-emerald-700 font-extrabold' : 'text-red-700 font-extrabold'}>
                    {syncStatus.isOnline ? 'Online (Terhubung Internet)' : 'Offline (Mode Lokal)'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500">
                  Spreadsheet: <strong>{settings.google_sheet_id ? `ID: ${settings.google_sheet_id.slice(0, 14)}...` : 'Belum Terhubung'}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartSync}
              disabled={isSyncing || pendingQueue.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:opacity-40 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyingkronkan...' : 'Kirim Transaksi'}</span>
            </button>
          </div>

          {/* Master Data & 2-Way Pull/Push Actions */}
          <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800">Sinkronisasi 2 Arah (Master Data &amp; Stok)</span>
              {syncStatus.pendingCloudPush ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                  Perubahan Belum Di-Push
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                  Master Sinkron
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePullFromCloud}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-950 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4 text-blue-700" />
                <span>Tarik Data Terbaru (Pull)</span>
              </button>
              <button
                type="button"
                onClick={handlePushFullDatabase}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Push Penuh Semua Data</span>
              </button>
            </div>
          </div>

          {/* Sync Result Toast Alert */}
          {syncResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                syncResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-red-50 text-red-900 border-red-300'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium leading-relaxed">{syncResult.message}</div>
            </div>
          )}

          {/* Queue List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span>Daftar Transaksi Menunggu Sinkronisasi</span>
              <span className="text-stone-400 font-normal">{pendingQueue.length} items</span>
            </div>

            {pendingQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-stone-400 space-y-2 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-80" />
                <div className="text-xs font-bold text-stone-700">Antrean Kosong / Tersinkronisasi Penuh!</div>
                <p className="text-[11px] text-stone-500 max-w-xs">
                  Seluruh transaksi kasir telah berhasil tersimpan ke 21 Sheet Google Spreadsheet bisnis Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {pendingQueue.map(item => {
                  let tx: Transaction | null = null;
                  try {
                    tx = JSON.parse(item.payload_json);
                  } catch {}

                  return (
                    <div
                      key={item.operation_id}
                      className="p-3.5 rounded-2xl border border-stone-200 bg-white hover:border-amber-300 transition shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-amber-800 shrink-0" />
                          <span className="font-extrabold font-mono text-stone-900">
                            {tx?.invoice_number || item.local_transaction_id}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px]">
                            {tx?.payment_method || 'PENDING'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleClearQueueItem(item.operation_id)}
                          className="p-1 rounded-lg text-stone-400 hover:text-red-500 transition cursor-pointer"
                          title="Hapus dari antrean"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {tx && (
                        <div className="flex items-center justify-between text-[11px] text-stone-600 bg-stone-50 p-2 rounded-xl">
                          <div className="truncate pr-2">
                            <span className="font-semibold text-stone-800">{tx.cashier_name}</span> • {tx.items.length} produk ({tx.order_type})
                          </div>
                          <div className="font-extrabold text-amber-950 shrink-0">
                            {formatRupiah(tx.total)}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-stone-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>Dibuat: {formatDateTime(item.created_at)}</span>
                        </div>
                        <span className="font-semibold text-amber-800">Menunggu Sinkronisasi</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-100 p-4 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition cursor-pointer"
          >
            Tutup
          </button>

          {pendingQueue.length > 0 && (
            <button
              onClick={handleStartSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <span>Proses {pendingQueue.length} Transaksi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
