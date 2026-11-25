import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  User as UserIcon,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Search,
  UserCheck,
  Activity,
  Trash2,
  RotateCcw,
  CalendarPlus,
  LogOut,
  Eye,
  Zap,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  User,
  AppLicense,
  LicenseType,
  CustomerRegistration,
} from '../types';
import {
  verifySuperAdminCredentials,
  getSuperadminSession,
  setSuperadminSession,
  createSuperadminSessionUser,
} from '../services/auth';
import { licenseManager } from '../services/license';
import { db } from '../services/db';
import { formatDateTime } from '../services/printer';
import { SuperadminMFAModal } from '../components/auth/SuperadminMFAModal';
import { RegistrationDetailModal } from '../components/setup/RegistrationDetailModal';
import { useDialog } from '../contexts/DialogContext';

interface StandaloneSuperadminPageProps {
  onExitPortal: () => void;
}

export const StandaloneSuperadminPage: React.FC<StandaloneSuperadminPageProps> = ({
  onExitPortal,
}) => {
  const [superUser, setSuperUser] = useState<User | null>(() => getSuperadminSession());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);

  // License Portal Tabs & Data
  const [activeTab, setActiveTab] = useState<'licenses' | 'registrations' | 'audit'>('licenses');
  const [activeLicense, setActiveLicense] = useState<AppLicense>(licenseManager.getActiveLicense());
  const [licenses, setLicenses] = useState<AppLicense[]>(licenseManager.getAllLicenses());
  const [registrations, setRegistrations] = useState<CustomerRegistration[]>(db.getRegistrations());

  // Filters
  const [licSearch, setLicSearch] = useState('');
  const [licTypeFilter, setLicTypeFilter] = useState<string>('ALL');
  const [licStatusFilter, setLicStatusFilter] = useState<string>('ALL');
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('ALL');

  // Generator Form
  const [genType, setGenType] = useState<LicenseType>('MONTHLY');
  const [genClientName, setGenClientName] = useState('');
  const [genClientEmail, setGenClientEmail] = useState('');
  const [genCustomDays, setGenCustomDays] = useState<number>(30);
  const [genMaxTx, setGenMaxTx] = useState<number>(50);
  const [genResult, setGenResult] = useState<AppLicense | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Registration Detail Modal
  const [selectedReg, setSelectedReg] = useState<CustomerRegistration | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);

  const { confirmAction, toast } = useDialog();

  const refreshAll = () => {
    setActiveLicense(licenseManager.getActiveLicense());
    setLicenses(licenseManager.getAllLicenses());
    setRegistrations(db.getRegistrations());
  };

  useEffect(() => {
    if (superUser) {
      refreshAll();
    }
  }, [superUser]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setLoginError(null);

    const valid = await verifySuperAdminCredentials(username, password);
    setIsChecking(false);

    if (valid) {
      setShowMFAModal(true);
    } else {
      setLoginError('Username atau Kata Sandi Superadmin tidak valid.');
      db.addAuditLog({
        log_id: 'log_' + Date.now(),
        user_id: 'unknown',
        user_name: username.trim() || 'Unknown',
        action: 'SUPERADMIN_LOGIN_FAILED',
        entity_type: 'SECURITY',
        entity_id: 'standalone_superadmin_portal',
        timestamp: new Date().toISOString(),
        details: 'Percobaan masuk Portal Lisensi Superadmin gagal: kredensial salah.',
      });
    }
  };

  const handleMFASuccess = () => {
    setShowMFAModal(false);
    const sessionUser = createSuperadminSessionUser();
    setSuperadminSession(sessionUser);
    setSuperUser(sessionUser);
    setPassword('');
    toast('Autentikasi OTP WhatsApp berhasil. Selamat datang di Portal Lisensi Superadmin.', 'success');
  };

  const handleLogoutPortal = () => {
    setSuperadminSession(null);
    setSuperUser(null);
    setUsername('');
    setPassword('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genClientName.trim() || !genClientEmail.trim()) {
      toast('Nama klien/toko dan email wajib diisi.', 'error');
      return;
    }

    const created = licenseManager.generateLicenseKey(
      genType,
      genClientName,
      genClientEmail,
      genType === 'DEMO' ? genCustomDays || 14 : genType === 'FULL' ? undefined : genCustomDays,
      genType === 'DEMO' ? genMaxTx : undefined
    );
    setGenResult(created);
    setGenClientName('');
    setGenClientEmail('');
    refreshAll();
    toast(`Kode lisensi ${created.license_key} berhasil diterbitkan!`, 'success');
  };

  const handleQuickSwitch = (type: LicenseType) => {
    const settings = db.getSettings();
    const created = licenseManager.generateLicenseKey(
      type,
      settings.cafe_name,
      settings.email,
      type === 'DEMO' ? 14 : type === 'MONTHLY' ? 30 : type === 'ANNUAL' ? 365 : undefined,
      type === 'DEMO' ? 50 : undefined
    );
    licenseManager.setDirectLicense(created);
    refreshAll();
    toast(`Lisensi perangkat aktif diubah ke mode ${type}.`, 'success');
  };

  const handleApplyToApp = (lic: AppLicense) => {
    licenseManager.setDirectLicense(lic);
    refreshAll();
    toast(`Kode ${lic.license_key} diterapkan sebagai lisensi aktif aplikasi.`, 'success');
  };

  const handleExtend = (key: string, days: number | null) => {
    licenseManager.extendLicense(key, days);
    refreshAll();
    toast(
      days === null ? `Lisensi ${key} di-upgrade ke FULL Lifetime.` : `Lisensi ${key} diperpanjang +${days} hari.`,
      'success'
    );
  };

  const handleRevoke = async (key: string) => {
    const ok = await confirmAction({
      title: 'Cabut / Nonaktifkan Lisensi',
      message: `Yakin ingin mencabut akses lisensi ${key}?`,
      confirmLabel: 'Ya, Cabut',
      variant: 'danger',
    });
    if (ok) {
      licenseManager.revokeLicense(key);
      refreshAll();
      toast(`Lisensi ${key} dicabut.`, 'success');
    }
  };

  const handleReactivate = (key: string) => {
    licenseManager.reactivateLicense(key);
    refreshAll();
    toast(`Lisensi ${key} diaktifkan kembali.`, 'success');
  };

  const handleDeleteLicense = async (key: string) => {
    const ok = await confirmAction({
      title: 'Hapus Permanen Kode Lisensi',
      message: `Hapus kode lisensi "${key}" dari daftar? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (ok) {
      licenseManager.deleteLicense(key);
      refreshAll();
      toast(`Lisensi ${key} dihapus permanen.`, 'success');
    }
  };

  // Filtered Lists
  const filteredLicenses = licenses.filter(l => {
    if (licTypeFilter !== 'ALL' && l.license_type !== licTypeFilter) return false;
    if (licStatusFilter !== 'ALL' && l.status !== licStatusFilter) return false;
    if (!licSearch.trim()) return true;
    const s = licSearch.toLowerCase();
    return (
      l.license_key.toLowerCase().includes(s) ||
      l.client_name.toLowerCase().includes(s) ||
      l.client_email.toLowerCase().includes(s)
    );
  });

  const filteredRegistrations = registrations.filter(r => {
    if (regStatusFilter !== 'ALL' && r.status !== regStatusFilter) return false;
    if (!regSearch.trim()) return true;
    const s = regSearch.toLowerCase();
    return (
      r.registration_id.toLowerCase().includes(s) ||
      r.business_name.toLowerCase().includes(s) ||
      r.owner_name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s)
    );
  });

  const licenseAuditLogs = db
    .getAuditLog()
    .filter(l => l.entity_type === 'LICENSE' || l.entity_type === 'REGISTRATION' || l.entity_type === 'SECURITY');

  const pendingRegsCount = registrations.filter(r => r.status === 'MENUNGGU_PERSETUJUAN').length;

  // 1. STANDALONE SUPERADMIN LOGIN GATE
  if (!superUser) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-purple-200/30 p-7 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onExitPortal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Aplikasi Kasir</span>
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-black uppercase tracking-wider border border-purple-200">
              Portal Terpisah
            </span>
          </div>

          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center shadow-lg">
              <KeyRound className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Portal Lisensi Superadmin
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Halaman khusus pengelola lisensi aplikasi. Terpisah dari sistem kasir & operasional toko, dilengkapi verifikasi OTP WhatsApp.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username Superadmin</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan username otoritas"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-purple-700"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-purple-700"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-900 hover:bg-purple-950 text-white py-3 text-xs font-black shadow-lg transition active:scale-98 cursor-pointer"
            >
              <span>{isChecking ? 'Memeriksa Kredensial...' : 'Lanjut Verifikasi OTP WhatsApp'}</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Akses terisolasi — Kredensial Superadmin tidak ditampilkan di aplikasi kasir.
          </div>
        </div>

        <SuperadminMFAModal
          isOpen={showMFAModal}
          onClose={() => setShowMFAModal(false)}
          onVerifiedSuccess={handleMFASuccess}
          username={username || 'DiVailean'}
        />
      </div>
    );
  }

  // 2. STANDALONE LICENSE MANAGEMENT CONSOLE (ONLY LICENSE MANAGEMENT)
  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Standalone Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-purple-800/40 px-4 sm:px-8 h-16 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-700 to-amber-600 flex items-center justify-center shadow-md">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                Superadmin License Manager
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                PORTAL KHUSUS LISENSI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Terpisah dari operasional kasir & toko • Login: {superUser.username} (MFA Aktif)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExitPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aplikasi Kasir</span>
          </button>

          <button
            type="button"
            onClick={handleLogoutPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-700/50 text-xs font-bold text-red-200 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Portal</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950 to-slate-900 text-white shadow-md space-y-1">
            <div className="text-[10px] font-bold uppercase text-amber-300">Lisensi Perangkat Saat Ini</div>
            <div className="text-lg font-black">{activeLicense.license_type} • {activeLicense.status}</div>
            <div className="text-[11px] font-mono text-slate-300 truncate">{activeLicense.license_key}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Lisensi Diterbitkan</div>
            <div className="text-2xl font-black text-slate-900">{licenses.length}</div>
            <div className="text-[11px] text-emerald-700 font-semibold">
              {licenses.filter(l => l.status === 'ACTIVE').length} Aktif • {licenses.filter(l => l.status === 'REVOKED').length} Dicabut
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold uppercase text-slate-400">Permohonan Lisensi Baru</div>
            <div className="text-2xl font-black text-amber-700">{registrations.length}</div>
            <div className="text-[11px] text-amber-800 font-bold">
              {pendingRegsCount} Menunggu Persetujuan
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-bold uppercase text-slate-400">Distribusi Paket</div>
            <div className="text-sm font-black text-slate-800 pt-1">
              Full: {licenses.filter(l => l.license_type === 'FULL').length} • Thn: {licenses.filter(l => l.license_type === 'ANNUAL').length}
            </div>
            <div className="text-[11px] text-slate-500">
              Bln: {licenses.filter(l => l.license_type === 'MONTHLY').length} • Demo: {licenses.filter(l => l.license_type === 'DEMO').length}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('licenses')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'licenses'
                ? 'border-purple-800 text-purple-950 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Manajemen & Generator Lisensi ({licenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'registrations'
                ? 'border-purple-800 text-purple-950 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Permohonan Registrasi ({registrations.length})</span>
            {pendingRegsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {pendingRegsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-purple-800 text-purple-950 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Log Aktivitas Lisensi ({licenseAuditLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: LICENSE MANAGEMENT */}
        {activeTab === 'licenses' && (
          <div className="space-y-6">
            {/* Quick Mode Switcher for Active Device */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Ubah Cepat Mode Lisensi Aplikasi Perangkat Ini:</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-purple-800">
                  Aktif: {activeLicense.license_key}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['DEMO', 'MONTHLY', 'ANNUAL', 'FULL'] as LicenseType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleQuickSwitch(type)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      activeLicense.license_type === type
                        ? 'bg-purple-900 text-white border-purple-900 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {type === 'DEMO'
                      ? 'Demo (14 Hari / 50 Tx)'
                      : type === 'MONTHLY'
                      ? 'Bulanan (30 Hari)'
                      : type === 'ANNUAL'
                      ? 'Tahunan (365 Hari)'
                      : 'Full Lifetime'}
                  </button>
                ))}
              </div>
            </div>

            {/* License Generator Form */}
            <div className="p-6 rounded-2xl bg-white border border-purple-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <div>
                  <h2 className="text-sm font-black text-slate-900">Terbitkan Kode Pemakaian Lisensi Baru</h2>
                  <p className="text-[11px] text-slate-500">
                    Buat kode aktivasi resmi untuk pelanggan toko baru atau perpanjangan langganan.
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerateLicense} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Paket Lisensi *</label>
                    <select
                      value={genType}
                      onChange={e => {
                        const t = e.target.value as LicenseType;
                        setGenType(t);
                        if (t === 'DEMO') setGenCustomDays(14);
                        if (t === 'MONTHLY') setGenCustomDays(30);
                        if (t === 'ANNUAL') setGenCustomDays(365);
                      }}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-700 cursor-pointer"
                    >
                      <option value="DEMO">Demo (Trial Terbatas)</option>
                      <option value="MONTHLY">Bulanan (Monthly)</option>
                      <option value="ANNUAL">Tahunan (Annual)</option>
                      <option value="FULL">Full Lifetime (Permanen)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Klien / Toko *</label>
                    <input
                      type="text"
                      value={genClientName}
                      onChange={e => setGenClientName(e.target.value)}
                      placeholder="Contoh: Swalayan Maju Jaya"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-purple-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Klien *</label>
                    <input
                      type="email"
                      value={genClientEmail}
                      onChange={e => setGenClientEmail(e.target.value)}
                      placeholder="owner@toko.id"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-purple-700"
                      required
                    />
                  </div>
                </div>

                {genType !== 'FULL' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi Masa Aktif (Hari)</label>
                      <input
                        type="number"
                        min={1}
                        value={genCustomDays}
                        onChange={e => setGenCustomDays(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold bg-white"
                      />
                    </div>
                    {genType === 'DEMO' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Maksimal Transaksi</label>
                        <input
                          type="number"
                          min={1}
                          value={genMaxTx}
                          onChange={e => setGenMaxTx(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-xs font-black shadow-sm transition cursor-pointer"
                >
                  Terbitkan Kode Lisensi
                </button>
              </form>

              {genResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-800">
                      Kode Baru Siap Dikirim ke {genResult.client_name} ({genResult.license_type}):
                    </div>
                    <div className="font-mono text-base font-black text-slate-900">{genResult.license_key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(genResult.license_key)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-bold text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === genResult.license_key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === genResult.license_key ? 'Tersalin' : 'Salin'}</span>
                    </button>
                    <button
                      onClick={() => handleApplyToApp(genResult)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                    >
                      Terapkan ke Perangkat Ini
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* All Licenses Registry */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={licSearch}
                    onChange={e => setLicSearch(e.target.value)}
                    placeholder="Cari Kode Lisensi, Nama Klien, atau Email..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:bg-white focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={licTypeFilter}
                    onChange={e => setLicTypeFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <option value="ALL">Semua Paket</option>
                    <option value="DEMO">DEMO</option>
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="ANNUAL">ANNUAL</option>
                    <option value="FULL">FULL</option>
                  </select>
                  <select
                    value={licStatusFilter}
                    onChange={e => setLicStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="REVOKED">REVOKED</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">Kode Lisensi</th>
                      <th className="px-4 py-3">Paket</th>
                      <th className="px-4 py-3">Klien / Toko</th>
                      <th className="px-4 py-3">Masa Berlaku</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Kelola Lisensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLicenses.map(l => {
                      const isCurrent = l.license_key === activeLicense.license_key;
                      return (
                        <tr key={l.license_key} className="hover:bg-purple-50/40 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            <div>{l.license_key}</div>
                            {isCurrent && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                AKTIF DI PERANGKAT INI
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px] text-slate-800">
                              {l.license_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{l.client_name}</div>
                            <div className="text-[10px] text-slate-400">{l.client_email}</div>
                          </td>
                          <td className="px-4 py-3 text-[11px]">
                            {l.expires_at ? formatDateTime(l.expires_at) : 'Lifetime (Selamanya)'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                l.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : l.status === 'EXPIRED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {l.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              <button
                                onClick={() => handleCopy(l.license_key)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                                title="Salin Kode"
                              >
                                {copiedKey === l.license_key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleApplyToApp(l)}
                                className="px-2 py-1 rounded-lg bg-purple-900 hover:bg-purple-950 text-white text-[10px] font-bold cursor-pointer"
                                title="Terapkan ke Perangkat"
                              >
                                Terapkan
                              </button>
                              {l.license_type !== 'FULL' && (
                                <button
                                  onClick={() => handleExtend(l.license_key, 30)}
                                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Perpanjang +30 Hari"
                                >
                                  <CalendarPlus className="w-3 h-3" /> +30h
                                </button>
                              )}
                              {l.license_type !== 'FULL' && (
                                <button
                                  onClick={() => handleExtend(l.license_key, null)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold cursor-pointer"
                                  title="Upgrade ke Full Lifetime"
                                >
                                  Full
                                </button>
                              )}
                              {l.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleRevoke(l.license_key)}
                                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold cursor-pointer"
                                  title="Cabut Lisensi"
                                >
                                  Cabut
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(l.license_key)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Aktifkan Kembali"
                                >
                                  <RotateCcw className="w-3 h-3" /> Aktifkan
                                </button>
                              )}
                              {!isCurrent && (
                                <button
                                  onClick={() => handleDeleteLicense(l.license_key)}
                                  className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                                  title="Hapus Kode Lisensi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMER LICENSE REGISTRATIONS */}
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={regSearch}
                  onChange={e => setRegSearch(e.target.value)}
                  placeholder="Cari ID Registrasi, Nama Toko, Pemilik, atau Email..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:bg-white focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'MENUNGGU_PERSETUJUAN', label: 'Menunggu' },
                  { id: 'DIPROSES', label: 'Diproses' },
                  { id: 'DISETUJUI', label: 'Disetujui' },
                  { id: 'DITOLAK', label: 'Ditolak' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setRegStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      regStatusFilter === f.id
                        ? 'bg-purple-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3">ID & Tanggal</th>
                      <th className="px-4 py-3">Nama Usaha</th>
                      <th className="px-4 py-3">Pemilik & Kontak</th>
                      <th className="px-4 py-3">Platform / Outlet</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Tidak ada permohonan registrasi lisensi yang cocok.
                        </td>
                      </tr>
                    ) : (
                      filteredRegistrations.map(r => (
                        <tr key={r.registration_id} className="hover:bg-purple-50/40">
                          <td className="px-4 py-3 font-mono">
                            <div className="font-bold text-purple-900">{r.registration_id}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(r.submitted_at).toLocaleDateString('id-ID')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{r.business_name}</div>
                            <div className="text-[10px] text-slate-500">{r.business_type}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{r.owner_name}</div>
                            <div className="text-[10px] text-slate-400">{r.email} • {r.whatsapp}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div>{r.city || 'Indonesia'}</div>
                            <div className="text-[10px] text-slate-400">{r.outlets_count} Outlet ({r.platform})</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                r.status === 'DISETUJUI'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'DITOLAK'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedReg(r);
                                setShowRegModal(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Proses Lisensi</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LICENSE AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aktor</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Detail Aktivitas Lisensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {licenseAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        Belum ada log aktivitas lisensi.
                      </td>
                    </tr>
                  ) : (
                    licenseAuditLogs.map(log => (
                      <tr key={log.log_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{log.user_name}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <RegistrationDetailModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
        registration={selectedReg}
        onUpdated={refreshAll}
        superadminUserId={superUser.user_id}
        superadminName={superUser.full_name}
      />
    </div>
  );
};
