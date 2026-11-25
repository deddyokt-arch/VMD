import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Lock,
} from 'lucide-react';
import { AppLicense, LicenseType, User } from '../types';
import { licenseManager } from '../services/license';
import { db } from '../services/db';
import { formatDateTime } from '../services/printer';
import { useDialog } from '../contexts/DialogContext';

interface LicensePageProps {
  currentUser: User;
}

export const LicensePage: React.FC<LicensePageProps> = ({ currentUser }) => {
  const [activeLicense, setActiveLicense] = useState<AppLicense>(licenseManager.getActiveLicense());
  const [licenses, setLicenses] = useState<AppLicense[]>(licenseManager.getAllLicenses());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New Code Generator Form State
  const [genType, setGenType] = useState<LicenseType>('MONTHLY');
  const [genClientName, setGenClientName] = useState('MartVai Swalayan');
  const [genClientEmail, setGenClientEmail] = useState('owner@martvai.id');
  const [genCustomDays, setGenCustomDays] = useState<number>(30);
  const [genMaxTx, setGenMaxTx] = useState<number>(50);
  const [generatedResult, setGeneratedResult] = useState<AppLicense | null>(null);

  // Manual Activate Input
  const [inputCode, setInputCode] = useState('');
  const [activateMsg, setActivateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { confirmAction, toast } = useDialog();

  const refresh = () => {
    setActiveLicense(licenseManager.getActiveLicense());
    setLicenses(licenseManager.getAllLicenses());
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genClientName.trim() || !genClientEmail.trim()) {
      toast('Nama dan email klien wajib diisi.', 'error');
      return;
    }

    const newLic = licenseManager.generateLicenseKey(
      genType,
      genClientName,
      genClientEmail,
      genType === 'DEMO' ? 14 : genCustomDays,
      genMaxTx
    );

    setGeneratedResult(newLic);
    refresh();
  };

  const handleApplyDirect = (license: AppLicense) => {
    licenseManager.setDirectLicense(license);
    refresh();
    toast(`Kode ${license.license_key} (${license.license_type}) berhasil diaktifkan ke sistem!`, 'success');
  };

  const handleManualActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setActivateMsg(null);
    const res = licenseManager.activateLicense(inputCode);
    if (res.success) {
      setActivateMsg({ type: 'success', text: res.message });
      setInputCode('');
      refresh();
    } else {
      setActivateMsg({ type: 'error', text: res.message });
    }
  };

  const handleQuickSwitchMode = (type: LicenseType) => {
    const newLic = licenseManager.generateLicenseKey(
      type,
      db.getSettings().cafe_name,
      db.getSettings().email,
      type === 'DEMO' ? 14 : type === 'MONTHLY' ? 30 : type === 'ANNUAL' ? 365 : undefined,
      type === 'DEMO' ? 50 : undefined
    );
    licenseManager.setDirectLicense(newLic);
    refresh();
    toast(`Mode aplikasi berhasil diubah ke versi: ${type}!`, 'success');
  };

  const handleRevoke = async (key: string) => {
    const confirmed = await confirmAction({
      title: 'Cabut Lisensi',
      message: `Yakin ingin mencabut lisensi ${key}?`,
      confirmLabel: 'Ya, Cabut',
      variant: 'danger',
    });
    if (confirmed) {
      licenseManager.revokeLicense(key);
      refresh();
      toast(`Lisensi ${key} berhasil dicabut.`, 'success');
    }
  };

  // Remaining days calculation
  const getRemainingDays = (expiresAt: string | null) => {
    if (!expiresAt) return 'Selamanya (Lifetime)';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Kedaluwarsa';
    const days = Math.ceil(diff / 86400000);
    return `${days} Hari Tersisa`;
  };

  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const txCount = db.getTransactions().length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-stone-900 tracking-tight">
              Manajemen Lisensi & Kode Pemakaian
            </h1>
            <span className="rounded-full bg-amber-500/20 text-amber-900 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
              {isSuperAdmin ? 'SUPERADMIN EXCLUSIVE' : 'STATUS LISENSI'}
            </span>
          </div>
          <p className="text-xs text-stone-500">
            Pengaturan versi aplikasi (Demo, Perbulan, Pertahun, Full Lifetime) dan penerbitan Kode Pemakaian resmi.
          </p>
        </div>
      </div>

      {/* Active License Overview Card */}
      <div className="p-6 rounded-3xl bg-linear-to-br from-[#2D1B14] via-[#45271D] to-[#1E0F0A] text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-black">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">
                Status Lisensi Aktif Saat Ini
              </div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <span>Versi: {activeLicense.license_type}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    activeLicense.status === 'ACTIVE'
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                      : 'bg-red-500/30 border-red-400 text-red-200'
                  }`}
                >
                  {activeLicense.status}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-3.5 py-2 rounded-xl border border-white/10">
            <div className="text-right">
              <div className="text-[10px] text-stone-400">Kode Pemakaian Aktif</div>
              <div className="font-mono text-xs font-bold text-amber-300">{activeLicense.license_key}</div>
            </div>
            <button
              onClick={() => handleCopy(activeLicense.license_key)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="Salin Kode"
            >
              {copiedKey === activeLicense.license_key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* License Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-0.5">
            <div className="text-stone-400 text-[10px]">Masa Berlaku</div>
            <div className="font-extrabold text-white">{getRemainingDays(activeLicense.expires_at)}</div>
            {activeLicense.expires_at && (
              <div className="text-[10px] text-amber-200/80">Hingga: {formatDateTime(activeLicense.expires_at)}</div>
            )}
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-0.5">
            <div className="text-stone-400 text-[10px]">Transaksi Tercatat</div>
            <div className="font-extrabold text-white">
              {txCount} Transaksi
              {activeLicense.max_transactions ? ` / ${activeLicense.max_transactions} max` : ' (Unlimited)'}
            </div>
            <div className="text-[10px] text-emerald-300">
              {activeLicense.max_transactions ? `${Math.max(0, activeLicense.max_transactions - txCount)} sisa kuota` : 'Tanpa batas kuota'}
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-0.5">
            <div className="text-stone-400 text-[10px]">Nama Klien / Toko</div>
            <div className="font-bold text-white truncate">{activeLicense.client_name}</div>
            <div className="text-[10px] text-stone-400 truncate">{activeLicense.client_email}</div>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-0.5">
            <div className="text-stone-400 text-[10px]">Diterbitkan Oleh</div>
            <div className="font-bold text-amber-300">{activeLicense.created_by}</div>
            <div className="text-[10px] text-stone-400">Aktif: {formatDateTime(activeLicense.activated_at)}</div>
          </div>
        </div>

        {/* SuperAdmin Quick Switcher */}
        {isSuperAdmin && (
          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>SuperAdmin Quick Switch — Ubah Mode Aplikasi Seketika:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSwitchMode('DEMO')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeLicense.license_type === 'DEMO'
                    ? 'bg-amber-500 text-stone-950 border-amber-400'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
              >
                <span>Versi Demo (Trial)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSwitchMode('MONTHLY')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeLicense.license_type === 'MONTHLY'
                    ? 'bg-amber-500 text-stone-950 border-amber-400'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
              >
                <span>Versi Perbulan (30 Hari)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSwitchMode('ANNUAL')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeLicense.license_type === 'ANNUAL'
                    ? 'bg-amber-500 text-stone-950 border-amber-400'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
              >
                <span>Versi Pertahun (365 Hari)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSwitchMode('FULL')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeLicense.license_type === 'FULL'
                    ? 'bg-amber-500 text-stone-950 border-amber-400'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
              >
                <span>Versi Full (Lifetime)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Activation Input Form */}
      <div className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
          <KeyRound className="w-4 h-4 text-amber-700" />
          <span>Aktivasi / Perpanjang dengan Kode Pemakaian</span>
        </div>
        <p className="text-xs text-stone-500">
          Masukkan Kode Pemakaian resmi yang diberikan oleh SuperAdmin untuk memperpanjang langganan atau mengaktifkan versi Full.
        </p>

        {activateMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              activateMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {activateMsg.text}
          </div>
        )}

        <form onSubmit={handleManualActivate} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={e => setInputCode(e.target.value)}
            placeholder="Contoh: VAI-FULL-XXXX-XXXX atau VAI-MTH-XXXX-XXXX"
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-mono font-bold uppercase focus:border-amber-600 focus:outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Aktifkan Sekarang
          </button>
        </form>
      </div>

      {/* SuperAdmin Generator Section */}
      {isSuperAdmin ? (
        <div className="p-6 rounded-2xl border border-amber-200 bg-white shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-extrabold text-stone-900">
                Penerbitan Kode Pemakaian Baru (SuperAdmin Generator)
              </h2>
              <p className="text-[11px] text-stone-500">
                Buat kode lisensi khusus untuk klien swalayan/supermarket dengan parameter masa aktif yang Anda tentukan.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Tipe Lisensi *</label>
                <select
                  value={genType}
                  onChange={e => {
                    const t = e.target.value as LicenseType;
                    setGenType(t);
                    if (t === 'MONTHLY') setGenCustomDays(30);
                    if (t === 'ANNUAL') setGenCustomDays(365);
                    if (t === 'DEMO') {
                      setGenCustomDays(14);
                      setGenMaxTx(50);
                    }
                  }}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="DEMO">Demo (Trial Uji Coba)</option>
                  <option value="MONTHLY">Perbulan (Langganan Bulanan)</option>
                  <option value="ANNUAL">Pertahun (Langganan Tahunan)</option>
                  <option value="FULL">Full / Lifetime (Permanen)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nama Klien / Swalayan *</label>
                <input
                  type="text"
                  value={genClientName}
                  onChange={e => setGenClientName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Email Klien *</label>
                <input
                  type="email"
                  value={genClientEmail}
                  onChange={e => setGenClientEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>
            </div>

            {genType !== 'FULL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Durasi Masa Aktif (Hari)
                  </label>
                  <input
                    type="number"
                    value={genCustomDays}
                    onChange={e => setGenCustomDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold focus:outline-none"
                  />
                </div>

                {genType === 'DEMO' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Batas Maksimal Transaksi (Demo)
                    </label>
                    <input
                      type="number"
                      value={genMaxTx}
                      onChange={e => setGenMaxTx(Number(e.target.value))}
                      className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Terbitkan Kode Pemakaian
            </button>
          </form>

          {/* Generated Result Highlight */}
          {generatedResult && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">Kode Berhasil Diterbitkan:</span>
                <span className="text-[10px] bg-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  {generatedResult.license_type}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-300">
                <span className="font-mono text-base font-extrabold text-stone-900">
                  {generatedResult.license_key}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleCopy(generatedResult.license_key)}
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin
                  </button>
                  <button
                    onClick={() => handleApplyDirect(generatedResult)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                  >
                    Terapkan ke Aplikasi Ini
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50 text-stone-600 text-xs space-y-1">
          <div className="font-bold text-stone-800 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-stone-400" />
            <span>Penerbitan Kode Pemakaian Dikelola di Portal Superadmin Terpisah</span>
          </div>
          <p>
            Penerbitan, perpanjangan, pencabutan, dan persetujuan lisensi aplikasi hanya dilakukan melalui <strong>Portal Khusus Lisensi Superadmin</strong> yang terpisah dari sistem kasir & admin toko. Masukkan Kode Pemakaian yang Anda terima pada kolom di atas untuk mengaktifkan atau memperpanjang lisensi toko ini.
          </p>
        </div>
      )}

      {/* Licenses Registry Table (Visible for SuperAdmin) */}
      {isSuperAdmin && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-2">
          <div className="px-5 py-3 border-b border-stone-100 font-bold text-xs text-stone-800 flex justify-between items-center">
            <span>Daftar Seluruh Kode Pemakaian Terdaftar</span>
            <span className="text-[11px] text-stone-400">{licenses.length} kode tercatat</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">Kode Pemakaian</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Klien</th>
                  <th className="px-4 py-3">Masa Berlaku</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {licenses.map(l => (
                  <tr key={l.license_key} className="hover:bg-amber-50/40">
                    <td className="px-4 py-3 font-mono font-bold text-stone-900">
                      {l.license_key}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 font-bold text-[10px] text-stone-800">
                        {l.license_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-800">{l.client_name}</div>
                      <div className="text-[10px] text-stone-400">{l.client_email}</div>
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      {l.expires_at ? formatDateTime(l.expires_at) : 'Lifetime (Selamanya)'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopy(l.license_key)}
                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs"
                          title="Salin Kode"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleApplyDirect(l)}
                          className="px-2 py-1 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-[10px] font-bold"
                          title="Aktifkan ke Aplikasi"
                        >
                          Terapkan
                        </button>
                        {l.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRevoke(l.license_key)}
                            className="p-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs"
                            title="Cabut Lisensi"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
