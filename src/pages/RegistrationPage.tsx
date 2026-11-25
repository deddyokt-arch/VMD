import React, { useState } from 'react';
import {
  ShoppingBag,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { CustomerRegistration, RegistrationStatus } from '../types';
import { db } from '../services/db';
import { useDialog } from '../contexts/DialogContext';

interface RegistrationPageProps {
  onBackToLogin: () => void;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({ onBackToLogin }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'check'>('form');

  // Form Fields
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Indonesia');
  const [businessType, setBusinessType] = useState('Supermarket & Swalayan');
  const [outletsCount, setOutletsCount] = useState<number>(1);
  const [devicesCount, setDevicesCount] = useState<number>(1);
  const [platform, setPlatform] = useState<'Android' | 'Windows' | 'Both'>('Both');
  const [notes, setNotes] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Status Check State
  const [searchRegId, setSearchRegId] = useState('');
  const [foundReg, setFoundReg] = useState<CustomerRegistration | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Success State
  const [submittedReg, setSubmittedReg] = useState<CustomerRegistration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useDialog();

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownerName.trim() || !businessName.trim() || !email.trim() || !whatsapp.trim()) {
      toast('Mohon lengkapi semua data wajib (Nama Pemilik, Nama Bisnis, Email, dan WhatsApp).', 'error');
      return;
    }

    if (!agreedTerms) {
      toast('Anda harus menyetujui syarat penggunaan & kebijakan privasi.', 'error');
      return;
    }

    setIsSubmitting(true);

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const regId = `REG-VAI-${dateCode}-${randomNum}`;

    const newReg: CustomerRegistration = {
      registration_id: regId,
      owner_name: ownerName,
      business_name: businessName,
      email: email,
      whatsapp: whatsapp,
      address: address,
      city: city,
      country: country || 'Indonesia',
      business_type: businessType,
      outlets_count: outletsCount || 1,
      devices_count: devicesCount || 1,
      platform: platform,
      notes: notes,
      agreed_terms: agreedTerms,
      status: 'MENUNGGU_PERSETUJUAN',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveRegistration(newReg);

    db.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: 'guest_registration',
      user_name: ownerName,
      action: 'CUSTOMER_REGISTRATION_SUBMITTED',
      entity_type: 'REGISTRATION',
      entity_id: regId,
      timestamp: new Date().toISOString(),
      details: `Permohonan registrasi MartVai Pro baru dikirim oleh ${businessName} (${email})`,
    });

    setIsSubmitting(false);
    setSubmittedReg(newReg);
  };

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckError(null);
    if (!searchRegId.trim()) return;

    const reg = db.getRegistrationById(searchRegId.trim());
    if (reg) {
      setFoundReg(reg);
    } else {
      setFoundReg(null);
      setCheckError(`Nomor Registrasi "${searchRegId}" tidak ditemukan dalam database pusat.`);
    }
  };

  const getStatusBadge = (status: RegistrationStatus) => {
    switch (status) {
      case 'MENUNGGU_PERSETUJUAN':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 inline-flex">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span>MENUNGGU PERSETUJUAN SUPERADMIN</span>
          </span>
        );
      case 'DIPROSES':
        return (
          <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold flex items-center gap-1.5 inline-flex">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>SEDANG DIPROSES & SETUP DATABASE</span>
          </span>
        );
      case 'DISETUJUI':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5 inline-flex">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>DISETUJUI & LISENSI AKTIF</span>
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="px-3 py-1 rounded-full bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-1.5 inline-flex">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>DITOLAK / DIBATALKAN</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold inline-flex">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#2D1B14] via-[#3E251B] to-[#1F120D] p-4 sm:p-6 text-stone-800 flex flex-col justify-center items-center">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-700 shadow-md text-white font-black shrink-0">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                <span>Formulir Registrasi MartVai Pro</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300 font-bold">
                  Lisensi Resmi
                </span>
              </h1>
              <p className="text-xs text-stone-500">
                Pendaftaran Lisensi Kasir Supermarket &amp; Swalayan Otomatis Terintegrasi Google Workspace.
              </p>
            </div>
          </div>

          <button
            onClick={onBackToLogin}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition cursor-pointer shrink-0"
          >
            ← Kembali ke Login
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('form')}
            className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'form' ? 'bg-amber-800 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Formulir Pengajuan Baru</span>
          </button>

          <button
            onClick={() => setActiveTab('check')}
            className={`py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'check' ? 'bg-amber-800 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Cek Status Permohonan</span>
          </button>
        </div>

        {/* TAB 1: FORMULIR PENGAJUAN */}
        {activeTab === 'form' && (
          <>
            {submittedReg ? (
              <div className="p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-emerald-950">
                      Permohonan Registrasi Berhasil Terkirim!
                    </h2>
                    <p className="text-xs text-emerald-800">
                      Permohonan lisensi MartVai Pro Anda sedang ditinjau oleh Superadmin Pusat.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                  <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    Nomor ID Registrasi Anda (Simpan Nomor Ini):
                  </div>
                  <div className="font-mono text-lg font-black text-stone-900 bg-stone-100 p-3 rounded-xl border border-stone-200 select-all">
                    {submittedReg.registration_id}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-stone-600">
                    <div><strong>Bisnis:</strong> {submittedReg.business_name}</div>
                    <div><strong>Pemilik:</strong> {submittedReg.owner_name}</div>
                    <div><strong>Email:</strong> {submittedReg.email}</div>
                    <div><strong>WhatsApp:</strong> {submittedReg.whatsapp}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setSearchRegId(submittedReg.registration_id);
                      setFoundReg(submittedReg);
                      setActiveTab('check');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm cursor-pointer text-center"
                  >
                    Pantau Status Permohonan
                  </button>
                  <button
                    onClick={() => setSubmittedReg(null)}
                    className="py-2.5 px-4 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
                  >
                    Buat Pengajuan Lain
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRegistration} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Nama Pemilik / Penanggung Jawab *
                    </label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={e => setOwnerName(e.target.value)}
                      placeholder="Contoh: Budi Kurniawan"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">
                      Nama Swalayan / Supermarket *
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="Contoh: Berkah Mart Swalayan"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Email Aktif *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="owner@berkahmart.id"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Nomor WhatsApp *</label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={e => setWhatsapp(e.target.value)}
                      placeholder="081234567890"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-800 mb-1">Alamat Bisnis</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Jl. Pemuda No. 45, Kebayoran Baru"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Kota / Kabupaten</label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Jakarta Selatan"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Jenis Usaha</label>
                    <select
                      value={businessType}
                      onChange={e => setBusinessType(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="Supermarket & Swalayan">Supermarket &amp; Swalayan</option>
                      <option value="Minimarket & Retail">Minimarket &amp; Retail</option>
                      <option value="Toko Kelontong Modern">Toko Kelontong Modern</option>
                      <option value="Grosir & Sembako">Grosir &amp; Sembako</option>
                      <option value="Toserba & Bahan Pokok">Toserba &amp; Bahan Pokok</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Jumlah Outlet</label>
                    <input
                      type="number"
                      min={1}
                      value={outletsCount}
                      onChange={e => setOutletsCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 mb-1">Target Perangkat POS</label>
                    <input
                      type="number"
                      min={1}
                      value={devicesCount}
                      onChange={e => setDevicesCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-800 mb-1">Platform Perangkat</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Android', 'Windows', 'Both'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPlatform(p)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            platform === p
                              ? 'bg-amber-800 text-white border-amber-800'
                              : 'bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {p === 'Both' ? 'Android & Windows' : p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-800 mb-1">Catatan Tambahan</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Kebutuhan khusus atau catatan permohonan lisensi..."
                      className="w-full rounded-xl border border-stone-300 p-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={e => setAgreedTerms(e.target.checked)}
                      className="rounded text-amber-800"
                    />
                    <span>
                      Saya menyetujui Syarat Penggunaan &amp; Kebijakan Privasi MartVai Pro.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-black shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Kirim Permohonan Registrasi Lisensi</span>
                </button>
              </form>
            )}
          </>
        )}

        {/* TAB 2: CEK STATUS PERMOHONAN */}
        {activeTab === 'check' && (
          <div className="space-y-4">
            <form onSubmit={handleCheckStatus} className="flex gap-2">
              <input
                type="text"
                value={searchRegId}
                onChange={e => setSearchRegId(e.target.value)}
                placeholder="Masukkan Nomor Registrasi (Contoh: REG-VAI-20261027-101)"
                className="flex-1 rounded-2xl border border-stone-300 px-4 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-600"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Cek Status</span>
              </button>
            </form>

            {checkError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{checkError}</span>
              </div>
            )}

            {foundReg && (
              <div className="p-6 rounded-3xl border border-stone-200 bg-stone-50 space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
                  <div>
                    <div className="text-[10px] text-stone-400 font-mono font-bold">
                      {foundReg.registration_id}
                    </div>
                    <h3 className="text-base font-black text-stone-900">
                      {foundReg.business_name}
                    </h3>
                  </div>

                  <div>{getStatusBadge(foundReg.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><strong>Pemilik:</strong> {foundReg.owner_name}</div>
                  <div><strong>Email:</strong> {foundReg.email}</div>
                  <div><strong>WhatsApp:</strong> {foundReg.whatsapp}</div>
                  <div><strong>Kota:</strong> {foundReg.city || 'Indonesia'}</div>
                  <div><strong>Jumlah Outlet:</strong> {foundReg.outlets_count} Outlet</div>
                  <div><strong>Pengajuan:</strong> {new Date(foundReg.submitted_at).toLocaleDateString('id-ID')}</div>
                </div>

                {foundReg.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium">
                    <strong>Catatan Superadmin:</strong> {foundReg.rejection_reason}
                  </div>
                )}

                {foundReg.status === 'DISETUJUI' && (
                  <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs rounded-2xl space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>Registrasi Telah Disetujui Superadmin!</span>
                    </div>
                    <p>
                      Tenant dan Google Spreadsheet 21 Sheet telah dipasang. Anda dapat langsung login menggunakan email admin Anda.
                    </p>
                    <button
                      onClick={onBackToLogin}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold transition text-xs shadow-xs"
                    >
                      Masuk ke Aplikasi MartVai Pro
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
