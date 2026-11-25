import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Building2,
  Mail,
  Phone,
  MapPin,
  Package,
  Calendar,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { CustomerRegistration, RegistrationStatus, LicenseType } from '../../types';
import { db } from '../../services/db';
import { licenseManager } from '../../services/license';
import { autoProvisionGoogleDatabase } from '../../services/googleSheetsAuto';
import { useDialog } from '../../contexts/DialogContext';

interface RegistrationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: CustomerRegistration | null;
  onUpdated: () => void;
  superadminUserId: string;
  superadminName: string;
}

export const RegistrationDetailModal: React.FC<RegistrationDetailModalProps> = ({
  isOpen,
  onClose,
  registration,
  onUpdated,
  superadminUserId,
  superadminName,
}) => {
  const [selectedPkg, setSelectedPkg] = useState<LicenseType>('MONTHLY');
  const [customDays, setCustomDays] = useState<number>(30);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { showAlert, toast } = useDialog();

  if (!isOpen || !registration) return null;

  // Handle Approve Registration and Auto-Provision Tenant & Google Spreadsheet 21 Sheet
  const handleApprove = async () => {
    setIsProcessing(true);
    setMsg(null);

    const tenantId = `tenant_${registration.business_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const ownerUserId = `user_admin_${Date.now().toString().slice(-4)}`;

    try {
      // 1. Auto Provision 21-Sheet Google Spreadsheet
      const sheetRes = await autoProvisionGoogleDatabase(
        registration.email,
        registration.business_name
      );

      // 2. Save Tenant
      db.saveTenant({
        tenant_id: tenantId,
        business_name: registration.business_name,
        owner_user_id: ownerUserId,
        owner_name: registration.owner_name,
        owner_email: registration.email,
        spreadsheet_id: sheetRes.spreadsheet_id || '',
        drive_folder_id: sheetRes.folder_id || '',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: `Disetujui dari registrasi ID ${registration.registration_id}`,
      });

      // 3. Create Tenant Admin User
      db.saveUser({
        user_id: ownerUserId,
        username: registration.email.split('@')[0],
        password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
        full_name: `${registration.owner_name} (${registration.business_name})`,
        role: 'ADMIN',
        active: true,
        tenant_id: tenantId,
        pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // 1234
        created_at: new Date().toISOString(),
      });

      // 4. Issue License Key
      const newLicense = licenseManager.generateLicenseKey(
        selectedPkg,
        registration.business_name,
        registration.email,
        selectedPkg === 'DEMO' ? 14 : customDays,
        selectedPkg === 'DEMO' ? 50 : undefined
      );

      // 5. Update Registration Status
      db.updateRegistrationStatus(
        registration.registration_id,
        'DISETUJUI',
        undefined,
        selectedPkg,
        customDays
      );

      // 6. Audit Log
      db.addAuditLog({
        log_id: 'log_' + Date.now(),
        user_id: superadminUserId,
        user_name: superadminName,
        action: 'REGISTRATION_APPROVED',
        entity_type: 'REGISTRATION',
        entity_id: registration.registration_id,
        timestamp: new Date().toISOString(),
        details: `Superadmin menyetujui registrasi "${registration.business_name}" (${selectedPkg}). Tenant ID: ${tenantId}, Kode: ${newLicense.license_key}`,
      });

      setMsg(`Registrasi disetujui! Tenant ${tenantId} & Kode ${newLicense.license_key} telah aktif.`);
      setIsProcessing(false);
      onUpdated();
    } catch (err) {
      await showAlert(`Gagal memproses persetujuan: ${(err as Error).message}`, 'error');
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast('Mohon masukkan alasan penolakan registrasi.', 'error');
      return;
    }

    db.updateRegistrationStatus(registration.registration_id, 'DITOLAK', rejectionReason);

    db.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: superadminUserId,
      user_name: superadminName,
      action: 'REGISTRATION_REJECTED',
      entity_type: 'REGISTRATION',
      entity_id: registration.registration_id,
      timestamp: new Date().toISOString(),
      details: `Registrasi ${registration.business_name} ditolak. Alasan: ${rejectionReason}`,
    });

    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <div className="text-[10px] font-mono font-bold text-purple-800">
              {registration.registration_id}
            </div>
            <h2 className="text-lg font-black text-stone-900">
              Detail Permohonan Registrasi Lisensi
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-stone-400 hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{msg}</span>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-stone-50 rounded-2xl text-xs">
          <div><strong>Nama Bisnis:</strong> {registration.business_name}</div>
          <div><strong>Pemilik:</strong> {registration.owner_name}</div>
          <div><strong>Email:</strong> {registration.email}</div>
          <div><strong>WhatsApp:</strong> {registration.whatsapp}</div>
          <div><strong>Alamat:</strong> {registration.address || '-'}</div>
          <div><strong>Kota:</strong> {registration.city || 'Indonesia'}</div>
          <div><strong>Jenis Usaha:</strong> {registration.business_type}</div>
          <div><strong>Jumlah Outlet / Perangkat:</strong> {registration.outlets_count} Outlet / {registration.devices_count} Perangkat</div>
          <div><strong>Platform Target:</strong> {registration.platform}</div>
          <div><strong>Pengajuan:</strong> {new Date(registration.submitted_at).toLocaleString('id-ID')}</div>
        </div>

        {registration.notes && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl">
            <strong>Catatan Pelanggan:</strong> {registration.notes}
          </div>
        )}

        {/* Approval Package Selector */}
        {registration.status !== 'DISETUJUI' && (
          <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-3">
            <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-700" />
              <span>Konfigurasi Paket Lisensi Sebelum Persetujuan:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['DEMO', 'MONTHLY', 'ANNUAL', 'FULL'] as const).map(pkg => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => {
                    setSelectedPkg(pkg);
                    if (pkg === 'DEMO') setCustomDays(14);
                    if (pkg === 'MONTHLY') setCustomDays(30);
                    if (pkg === 'ANNUAL') setCustomDays(365);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    selectedPkg === pkg
                      ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                      : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {pkg === 'DEMO' ? 'Demo (14 Hari)' : pkg === 'MONTHLY' ? 'Bulanan (30 Hari)' : pkg === 'ANNUAL' ? 'Tahunan (365 Hari)' : 'Full Lifetime'}
                </button>
              ))}
            </div>

            {selectedPkg !== 'FULL' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="font-semibold text-stone-700">Masa Aktif Hari:</span>
                <input
                  type="number"
                  value={customDays}
                  onChange={e => setCustomDays(Number(e.target.value))}
                  className="w-24 rounded-lg border border-stone-300 bg-white px-3 py-1 font-bold text-xs"
                />
                <span className="text-stone-500">Hari</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {registration.status !== 'DISETUJUI' ? (
          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membuat Tenant & Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Setujui Registrasi & Pasang Database Tenant</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-stone-100 space-y-2">
              <div className="text-[11px] font-bold text-stone-500">Opsi Penolakan:</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Alasan penolakan jika permohonan ditolak..."
                  className="flex-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs"
                />
                <button
                  onClick={handleReject}
                  className="px-4 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition"
                >
                  Tolak Registrasi
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl text-center">
            Permohonan Registrasi Ini Telah Disetujui & Aktif
          </div>
        )}
      </div>
    </div>
  );
};
