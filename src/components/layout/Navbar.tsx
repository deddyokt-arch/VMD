import React, { useState, useEffect } from 'react';
import {
  Store,
  ShoppingCart,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  UserCheck,
  Clock,
  DollarSign,
  Menu,
  KeyRound,
  ShieldCheck,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  Calculator,
} from 'lucide-react';
import { User, CafeSettings, CashSession, AppLicense } from '../../types';
import { db } from '../../services/db';
import { syncManager, SyncStatus } from '../../services/offlineSync';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { licenseManager } from '../../services/license';
import { ShiftModal } from '../shifts/ShiftModal';
import { SyncQueueModal } from '../setup/SyncQueueModal';
import { CalculatorModal } from '../calculator/CalculatorModal';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
  currentPage: string;
  onSelectPage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onToggleSidebar,
  currentPage,
  onSelectPage,
}) => {
  const [settings, setSettings] = useState<CafeSettings>(db.getSettings());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus());
  const [currentTime, setCurrentTime] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeLicense, setActiveLicense] = useState<AppLicense>(licenseManager.getActiveLicense());
  const [activeSession, setActiveSession] = useState<CashSession | null>(
    db.getActiveCashSession(currentUser.role === 'KASIR' ? currentUser.user_id : undefined)
  );

  useEffect(() => {
    // Keep license state refreshed
    const interval = setInterval(() => {
      setActiveLicense(licenseManager.getActiveLicense());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const unsub = syncManager.subscribe(setSyncStatus);
    const onDataUpdated = () => {
      setSettings(db.getSettings());
      refreshShift();
    };
    window.addEventListener('martvai:data-updated', onDataUpdated);

    const timeInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    }, 1000);

    return () => {
      unsub();
      window.removeEventListener('martvai:data-updated', onDataUpdated);
      clearInterval(timeInterval);
    };
  }, []);

  const refreshShift = () => {
    setActiveSession(
      db.getActiveCashSession(currentUser.role === 'KASIR' ? currentUser.user_id : undefined)
    );
  };

  const handleManualSync = async () => {
    setShowSyncModal(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-700 bg-[#1E293B] px-3 sm:px-6 text-white shadow-md shrink-0">
        {/* Left Side */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            title="Buka / Tutup Sidebar Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 shadow-sm text-slate-950 font-black">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-base font-extrabold tracking-tight text-white truncate max-w-[120px] sm:max-w-none">
                  {settings.cafe_name || 'VaiMart Swalayan'}
                </h1>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30 shrink-0">
                  MartVai Pro
                </span>
              </div>
              <p className="text-[10px] text-emerald-200/80 hidden md:block">
                Kasir Supermarket & Swalayan Barcode Terintegrasi
              </p>
            </div>
          </div>
        </div>


        {/* Right Side */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Quick Calculator Button */}
          <button
            onClick={() => setShowCalculatorModal(true)}
            title="Kalkulator Cepat (Hitung Kembalian & Matatika)"
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-white hover:bg-stone-800 transition cursor-pointer border border-amber-600/40 bg-amber-950/40"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline text-[11px] font-bold">Kalkulator</span>
          </button>

          {/* Fullscreen Mode Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh Kiosk (Tablet & Laptop)'}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition cursor-pointer border border-stone-700/80 bg-stone-900/60"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span className="hidden xl:inline text-[11px] font-medium">
              {isFullscreen ? 'Layar Biasa' : 'Full Screen'}
            </span>
          </button>

          {/* License Status Badge */}
          <button
            onClick={() => onSelectPage('license')}
            title={`Kode Pemakaian: ${activeLicense.license_key} (${activeLicense.license_type}). Klik untuk mengelola lisensi.`}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold border transition cursor-pointer shadow-xs ${
              activeLicense.status === 'EXPIRED' || activeLicense.status === 'REVOKED'
                ? 'bg-red-950/80 border-red-500/80 text-red-300 animate-pulse'
                : activeLicense.license_type === 'FULL'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                : activeLicense.license_type === 'ANNUAL'
                ? 'bg-purple-950/70 border-purple-500/50 text-purple-300 hover:bg-purple-900/60'
                : activeLicense.license_type === 'MONTHLY'
                ? 'bg-blue-950/70 border-blue-500/50 text-blue-300 hover:bg-blue-900/60'
                : 'bg-amber-950/70 border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {activeLicense.status === 'EXPIRED'
                ? 'Lisensi Habis'
                : activeLicense.status === 'REVOKED'
                ? 'Lisensi Dicabut'
                : activeLicense.license_type === 'FULL'
                ? 'Full Lifetime'
                : activeLicense.license_type === 'ANNUAL'
                ? 'Tahunan'
                : activeLicense.license_type === 'MONTHLY'
                ? 'Bulanan'
                : 'Versi Demo'}
            </span>
          </button>

          {/* Live Clock */}
          <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-stone-900/60 px-2.5 py-1 text-xs font-mono text-stone-300 border border-stone-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTime || 'Loading...'}</span>
          </div>

          {/* Shift Button / Status */}
          <button
            onClick={() => setShowShiftModal(true)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeSession
                ? 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/40'
                : 'bg-amber-600/30 border border-amber-500/40 text-amber-300 hover:bg-amber-600/40'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeSession ? 'Shift Kasir Aktif' : 'Buka Shift'}
            </span>
          </button>

          {/* Google Workspace Database Status Pill */}
          <button
            onClick={() => onSelectPage('settings')}
            title={
              settings.google_oauth_connected
                ? `Google Workspace: ${settings.google_account_email} (21 Sheet & Folder Drive Aktif)`
                : 'Google Workspace: Setup otomatis 21 Sheet & Drive'
            }
            className={`hidden sm:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer border ${
              settings.google_oauth_connected
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline text-[11px]">
              {settings.google_oauth_connected ? 'Sheets 21' : 'Google Setup'}
            </span>
          </button>

          {/* Online/Offline Status & Queue */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleManualSync}
              title={
                syncStatus.isOnline
                  ? `Online (${syncStatus.pendingCount} antrean transaksi${syncStatus.pendingCloudPush ? ' + perubahan master belum di-push' : ''}). Klik untuk sinkronisasi 2 arah.`
                  : 'Offline (Data tersimpan di perangkat lokal)'
              }
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition cursor-pointer border ${
                syncStatus.isOnline
                  ? syncStatus.pendingCount > 0 || syncStatus.pendingCloudPush
                    ? 'border-amber-500/50 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60'
                    : 'border-stone-700 bg-stone-800/80 text-emerald-400'
                  : 'border-red-500/50 bg-red-950/40 text-red-300'
              }`}
            >
              {syncStatus.isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
              )}
              {syncStatus.pendingCount > 0 ? (
                <span className="flex items-center gap-1 font-mono text-[11px] font-bold">
                  <RefreshCw
                    className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`}
                  />
                  <span>{syncStatus.pendingCount} Offline</span>
                </span>
              ) : syncStatus.pendingCloudPush ? (
                <span className="flex items-center gap-1 text-[11px] font-bold">
                  <RefreshCw
                    className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`}
                  />
                  <span className="hidden lg:inline">Perlu Push</span>
                </span>
              ) : (
                <span className="hidden lg:inline text-[11px]">Tersinkron</span>
              )}
            </button>
          </div>

          {/* PWA Install */}
          <PWAInstallButton />

          {/* User Profile & Role */}
          <div className="flex items-center gap-2 pl-1 border-l border-stone-700">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold leading-tight truncate max-w-[130px]">
                {currentUser.full_name}
              </div>
              <div className="text-[10px] text-amber-300 font-semibold tracking-wide">
                {currentUser.role}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="rounded-xl p-2 text-stone-300 hover:bg-stone-800 hover:text-red-400 transition cursor-pointer"
              title="Keluar / Ganti Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Shift Modal */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        currentUser={currentUser}
        onShiftUpdated={refreshShift}
      />

      {/* Sync Queue Modal */}
      <SyncQueueModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />

      {/* Calculator Quick Modal */}
      <CalculatorModal
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />
    </>
  );
};
