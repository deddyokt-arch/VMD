import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  FileSpreadsheet,
  AlertTriangle,
  Plus,
  RefreshCw,
  Sparkles,
  KeyRound,
  Download,
  Lock,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Smartphone,
  Laptop,
  Check,
  Copy,
  Zap,
  UserCheck,
  Clock,
  Search,
  Eye,
} from 'lucide-react';
import { Tenant, TenantStatus, User, AppLicense, LicenseType, CustomerRegistration, RegistrationStatus } from '../types';
import { db } from '../services/db';
import { licenseManager } from '../services/license';
import { autoProvisionGoogleDatabase } from '../services/googleSheetsAuto';
import { formatDateTime } from '../services/printer';
import { RegistrationDetailModal } from '../components/setup/RegistrationDetailModal';
import { useDialog } from '../contexts/DialogContext';

interface SuperadminDashboardPageProps {
  currentUser: User;
}

export const SuperadminDashboardPage: React.FC<SuperadminDashboardPageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'registrations' | 'tenants' | 'audit' | 'license' | 'builds'>('registrations');
  const [tenants, setTenants] = useState<Tenant[]>(db.getTenants());
  const [licenses, setLicenses] = useState<AppLicense[]>(licenseManager.getAllLicenses());
  const [registrations, setRegistrations] = useState<CustomerRegistration[]>(db.getRegistrations());

  // Registration modal state
  const [selectedReg, setSelectedReg] = useState<CustomerRegistration | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  const [regFilterStatus, setRegFilterStatus] = useState<string>('ALL');
  const [regSearch, setRegSearch] = useState('');

  // New Tenant Provisioning Form State
  const [newBizName, setNewBizName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState<string | null>(null);

  // License Generator State
  const [genType, setGenType] = useState<LicenseType>('MONTHLY');
  const [genClientName, setGenClientName] = useState('Klien Swalayan Baru');
  const [genClientEmail, setGenClientEmail] = useState('owner@martvai.id');
  const [genCustomDays, setGenCustomDays] = useState<number>(30);
  const [genMaxTx, setGenMaxTx] = useState<number>(50);
  const [genResult, setGenResult] = useState<AppLicense | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { confirmAction, showAlert, toast } = useDialog();

  const refreshData = () => {
    setTenants(db.getTenants());
    setLicenses(licenseManager.getAllLicenses());
    setRegistrations(db.getRegistrations());
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const allAuditLogs = db.getAuditLog();

  // Create New Tenant with Automatic Google Spreadsheet Setup
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newOwnerEmail.trim()) {
      toast('Nama bisnis dan email pemilik wajib diisi.', 'error');
      return;
    }

    setIsProvisioning(true);
    setProvisionMsg(null);

    const tenantId = `tenant_${newBizName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const ownerUserId = `user_admin_${Date.now().toString().slice(-4)}`;

    try {
      // Auto provision 21-sheet database for this tenant
      const sheetRes = await autoProvisionGoogleDatabase(newOwnerEmail, newBizName);

      const newTenant: Tenant = {
        tenant_id: tenantId,
        business_name: newBizName,
        owner_user_id: ownerUserId,
        owner_name: newOwnerName || 'Pemilik Swalayan',
        owner_email: newOwnerEmail,
        spreadsheet_id: sheetRes.spreadsheet_id || '',
        drive_folder_id: sheetRes.folder_id || '',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: 'Dibuat melalui Superadmin Pusat DiVailean',
      };

      db.saveTenant(newTenant);

      // Create Admin user for tenant
      db.saveUser({
        user_id: ownerUserId,
        username: newOwnerEmail.split('@')[0],
        password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
        full_name: `${newOwnerName || 'Admin'} (${newBizName})`,
        role: 'ADMIN',
        active: true,
        tenant_id: tenantId,
        pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // 1234
        created_at: new Date().toISOString(),
      });

      db.addAuditLog({
        log_id: 'log_' + Date.now(),
        user_id: currentUser.user_id,
        user_name: currentUser.full_name,
        action: 'TENANT_PROVISION_SUCCESS',
        entity_type: 'TENANT',
        entity_id: tenantId,
        timestamp: new Date().toISOString(),
        details: `Tenant "${newBizName}" berhasil dibuat dengan Google Spreadsheet ID: ${sheetRes.spreadsheet_id}`,
      });

      setProvisionMsg(`Tenant "${newBizName}" berhasil dibuat! ID: ${tenantId}`);
      setNewBizName('');
      setNewOwnerName('');
      setNewOwnerEmail('');
      refreshData();
    } catch (err) {
      await showAlert(`Gagal membuat tenant: ${(err as Error).message}`, 'error');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleToggleTenantStatus = async (tenant: Tenant) => {
    const nextStatus: TenantStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmed = await confirmAction({
      title: 'Ubah Status Tenant',
      message: `Ubah status tenant "${tenant.business_name}" menjadi ${nextStatus}?`,
      confirmLabel: 'Ya, Ubah Status',
      variant: nextStatus === 'SUSPENDED' ? 'danger' : 'warning',
    });
    if (confirmed) {
      db.updateTenantStatus(tenant.tenant_id, nextStatus);
      db.addAuditLog({
        log_id: 'log_' + Date.now(),
        user_id: currentUser.user_id,
        user_name: currentUser.full_name,
        action: 'TENANT_STATUS_CHANGE',
        entity_type: 'TENANT',
        entity_id: tenant.tenant_id,
        timestamp: new Date().toISOString(),
        details: `Status tenant ${tenant.business_name} diubah menjadi ${nextStatus}`,
      });
      refreshData();
      toast(`Status tenant ${tenant.business_name} diubah menjadi ${nextStatus}.`, 'success');
    }
  };

  const handleGenerateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    const newLic = licenseManager.generateLicenseKey(
      genType,
      genClientName,
      genClientEmail,
      genType === 'DEMO' ? 14 : genCustomDays,
      genMaxTx
    );
    setGenResult(newLic);
    db.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: currentUser.user_id,
      user_name: currentUser.full_name,
      action: 'LICENSE_GENERATED',
      entity_type: 'LICENSE',
      entity_id: newLic.license_key,
      timestamp: new Date().toISOString(),
      details: `Superadmin DiVailean menerbitkan Kode Pemakaian ${newLic.license_type} untuk ${genClientName}`,
    });
    refreshData();
  };

  // Filter Registrations
  const pendingRegsCount = registrations.filter(r => r.status === 'MENUNGGU_PERSETUJUAN').length;

  const filteredRegistrations = registrations.filter(r => {
    if (regFilterStatus !== 'ALL' && r.status !== regFilterStatus) return false;
    if (!regSearch.trim()) return true;
    const s = regSearch.toLowerCase();
    return (
      r.registration_id.toLowerCase().includes(s) ||
      r.business_name.toLowerCase().includes(s) ||
      r.owner_name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      r.city.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Superadmin Center Header */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-purple-950 via-stone-900 to-amber-950 text-white shadow-xl space-y-4 border border-purple-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-amber-300 font-black shadow-inner">
              <ShieldCheck className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-2">
                <span>DiVailean Pusat Control Center</span>
                <span className="bg-emerald-500 text-stone-950 px-2 py-0.5 rounded-full text-[9px] font-black">
                  MFA VERIFIED
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Multi-Tenant MartVai Pro Security Platform</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/40 px-3.5 py-2 rounded-xl border border-white/10 text-xs font-mono">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-stone-400">Sistem Autentikasi Superadmin</div>
              <div className="font-bold text-amber-300">User: DiVailean • ID: user_superadmin_01</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[10px] text-stone-400 font-bold uppercase">Registrasi Pelanggan</div>
            <div className="text-2xl font-black text-amber-300 flex items-center gap-2">
              <span>{registrations.length} Pengajuan</span>
            </div>
            <div className="text-[10px] text-amber-200 font-bold">
              {pendingRegsCount} Menunggu Persetujuan
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[10px] text-stone-400 font-bold uppercase">Total Tenant Swalayan</div>
            <div className="text-2xl font-black text-white">{tenants.length} Tenant</div>
            <div className="text-[10px] text-emerald-400">{tenants.filter(t => t.status === 'ACTIVE').length} Aktif</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[10px] text-stone-400 font-bold uppercase">Isolasi Database</div>
            <div className="text-lg font-black text-amber-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Google Sheets 21</span>
            </div>
            <div className="text-[10px] text-stone-300">Database terpisah per tenant</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[10px] text-stone-400 font-bold uppercase">Keamanan MFA</div>
            <div className="text-lg font-black text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>2FA Aktif</span>
            </div>
            <div className="text-[10px] text-stone-300">DiVailean Superadmin</div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('registrations')}
          className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'registrations'
              ? 'border-purple-800 text-purple-900 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-700" />
          <span>Registrasi Pelanggan ({registrations.length})</span>
          {pendingRegsCount > 0 && (
            <span className="bg-amber-500 text-stone-950 text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
              {pendingRegsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tenants')}
          className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tenants'
              ? 'border-purple-800 text-purple-900 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Kelola Tenant Swalayan ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-purple-800 text-purple-900 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Log ({allAuditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('license')}
          className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'license'
              ? 'border-purple-800 text-purple-900 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Kode Pemakaian & Lisensi ({licenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('builds')}
          className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'builds'
              ? 'border-purple-800 text-purple-900 bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Android APK & Windows</span>
        </button>
      </div>

      {/* TAB 0: CUSTOMER REGISTRATIONS MANAGEMENT */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-800" />
                <span>Permohonan Registrasi Lisensi MartVai Pro</span>
              </h2>
              <p className="text-xs text-stone-500">
                Persetujuan registrasi pelanggan baru secara otomatis membuat Tenant dan database Google Spreadsheet 21 Sheet.
              </p>
            </div>

            {/* Filter Status Buttons */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'MENUNGGU_PERSETUJUAN', label: 'Menunggu' },
                { id: 'DIPROSES', label: 'Diproses' },
                { id: 'DISETUJUI', label: 'Disetujui' },
                { id: 'DITOLAK', label: 'Ditolak' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setRegFilterStatus(f.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    regFilterStatus === f.id
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={regSearch}
                onChange={e => setRegSearch(e.target.value)}
                placeholder="Cari ID Registrasi, Nama Bisnis, Pemilik, Email, atau Kota..."
                className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Registrations Table */}
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">ID & Tanggal</th>
                    <th className="px-4 py-3">Bisnis & Jenis Usaha</th>
                    <th className="px-4 py-3">Pemilik & Kontak</th>
                    <th className="px-4 py-3">Kota & Outlet</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-stone-400">
                        Belum ada permohonan registrasi pelanggan yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map(r => (
                      <tr key={r.registration_id} className="hover:bg-purple-50/30">
                        <td className="px-4 py-3 font-mono">
                          <div className="font-bold text-purple-900">{r.registration_id}</div>
                          <div className="text-[10px] text-stone-400">
                            {new Date(r.submitted_at).toLocaleDateString('id-ID')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900">{r.business_name}</div>
                          <div className="text-[10px] text-stone-500">{r.business_type}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-stone-800">{r.owner_name}</div>
                          <div className="text-[10px] text-stone-400">{r.email} • {r.whatsapp}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{r.city || 'Indonesia'}</div>
                          <div className="text-[10px] text-stone-400">{r.outlets_count} Outlet ({r.platform})</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              r.status === 'DISETUJUI'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'DIPROSES'
                                ? 'bg-blue-100 text-blue-800'
                                : r.status === 'DITOLAK'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-900 animate-pulse'
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
                            className="px-3 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail & Proses</span>
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

      {/* TAB 1: TENANTS MANAGEMENT */}
      {activeTab === 'tenants' && (
        <div className="space-y-6">
          {/* New Tenant Auto-Provisioning Form */}
          <div className="p-6 rounded-3xl border-2 border-purple-300 bg-linear-to-br from-purple-50/50 via-white to-amber-50/30 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
              <Plus className="w-5 h-5 text-purple-800" />
              <div>
                <h2 className="text-sm font-extrabold text-stone-900">
                  Registrasi Tenant Swalayan Baru (Auto Google Workspace Setup)
                </h2>
                <p className="text-xs text-stone-500">
                  Setiap tenant baru secara otomatis mendapatkan `tenant_id` unik dan Google Spreadsheet 21 Sheet terpisah.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Nama Bisnis / Swalayan *</label>
                  <input
                    type="text"
                    value={newBizName}
                    onChange={e => setNewBizName(e.target.value)}
                    placeholder="Contoh: Berkah Mart Surabaya"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs focus:outline-none focus:border-purple-600 font-bold text-stone-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Nama Pemilik (Owner)</label>
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={e => setNewOwnerName(e.target.value)}
                    placeholder="Contoh: Budi Prasetyo"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Email Google Akun Owner *</label>
                  <input
                    type="email"
                    value={newOwnerEmail}
                    onChange={e => setNewOwnerEmail(e.target.value)}
                    placeholder="owner@swalayan.id"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              {provisionMsg && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>{provisionMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isProvisioning}
                className="px-6 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-xs font-black shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProvisioning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membuat Tenant & Spreadsheet 21 Sheet...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Buat Tenant Baru & Pasang Database</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tenants Registry Table */}
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-2">
            <div className="px-5 py-3 border-b border-stone-100 font-bold text-xs text-stone-800 flex justify-between items-center bg-stone-50">
              <span>Daftar Seluruh Tenant Terdaftar</span>
              <span className="text-[11px] text-stone-500">{tenants.length} Tenant Terdaftar</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Tenant ID & Bisnis</th>
                    <th className="px-4 py-3">Pemilik (Owner)</th>
                    <th className="px-4 py-3">Google Spreadsheet ID</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {tenants.map(t => (
                    <tr key={t.tenant_id} className="hover:bg-purple-50/30">
                      <td className="px-4 py-3">
                        <div className="font-bold text-stone-900">{t.business_name}</div>
                        <div className="text-[10px] font-mono text-purple-800">{t.tenant_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-800">{t.owner_name}</div>
                        <div className="text-[10px] text-stone-400">{t.owner_email}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {t.spreadsheet_id ? (
                          <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-800 font-bold truncate inline-block max-w-[200px]">
                            {t.spreadsheet_id}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold text-[10px]">Otomatis Terhubung</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            t.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800 animate-pulse'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleTenantStatus(t)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                            t.status === 'ACTIVE'
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                        >
                          {t.status === 'ACTIVE' ? 'Bekukan Tenant' : 'Aktifkan Kembali'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG & SECURITY */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-800" />
              <span>Audit Log & Catatan Aktivitas Pusat Superadmin</span>
            </h2>
            <p className="text-xs text-stone-500">
              Pencatatan real-time untuk verifikasi MFA, percobaan login gagal, dan perubahan tenant.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Pengguna / Aktor</th>
                    <th className="px-4 py-3">Jenis Aksi</th>
                    <th className="px-4 py-3">Rincian Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {allAuditLogs.map(l => (
                    <tr key={l.log_id} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-stone-400">
                        {formatDateTime(l.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-stone-800">{l.user_name}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-purple-100 text-purple-900 px-2 py-0.5 text-[10px] font-bold">
                          {l.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-stone-700">{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LICENSE GENERATOR */}
      {activeTab === 'license' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-amber-200 bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-extrabold text-stone-900">
                  Generator Kode Pemakaian Resmi (Pusat Superadmin)
                </h2>
                <p className="text-[11px] text-stone-500">
                  Penerbitan lisensi Demo, Perbulan, Pertahun, dan Full Lifetime untuk tenant.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateLicense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Tipe Lisensi *</label>
                  <select
                    value={genType}
                    onChange={e => setGenType(e.target.value as LicenseType)}
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

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Terbitkan Kode Pemakaian
              </button>
            </form>

            {genResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                <div className="font-bold text-xs">Kode Berhasil Diterbitkan:</div>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-300">
                  <span className="font-mono text-base font-extrabold text-stone-900">
                    {genResult.license_key}
                  </span>
                  <button
                    onClick={() => handleCopy(genResult.license_key)}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> {copiedKey === genResult.license_key ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BUILDS GUIDE */}
      {activeTab === 'builds' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-stone-200 bg-white shadow-2xs space-y-4">
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-700" />
              <span>Panduan Build APK Android & Windows App</span>
            </h2>
            <p className="text-xs text-stone-600">
              MartVai Pro menggunakan arsitektur web PWA & Capacitor yang dapat langsung dikompilasi menjadi aplikasi APK Android maupun installer Windows.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Langkah Build Android APK (Capacitor / PWA)</span>
                </div>
                <ol className="list-decimal list-inside text-xs text-stone-600 space-y-1 font-mono text-[11px]">
                  <li>Jalankan <code className="bg-stone-200 px-1 rounded">npm run build</code></li>
                  <li>Jalankan <code className="bg-stone-200 px-1 rounded">npx cap add android</code></li>
                  <li>Jalankan <code className="bg-stone-200 px-1 rounded">npx cap open android</code></li>
                  <li>Build APK via Android Studio Studio Project</li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-purple-600" />
                  <span>Langkah Build Windows Application</span>
                </div>
                <ol className="list-decimal list-inside text-xs text-stone-600 space-y-1 font-mono text-[11px]">
                  <li>Aplikasi web PWA dapat diinstall langsung di Windows (Chrome/Edge)</li>
                  <li>Untuk installer desktop native, gunakan Tauri / Electron wrapper</li>
                  <li>Driver printer USB/Thermal didukung secara native</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Detail Modal */}
      <RegistrationDetailModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
        registration={selectedReg}
        onUpdated={refreshData}
        superadminUserId={currentUser.user_id}
        superadminName={currentUser.full_name}
      />
    </div>
  );
};
