// License & "Kode Pemakaian" Management Service
import { AppLicense, LicenseType, LicenseStatus } from '../types';
import { db } from './db';

const STORAGE_KEY_LICENSES = 'vaicafe_licenses';
const STORAGE_KEY_ACTIVE_LICENSE = 'vaicafe_active_license';

// Default initial active license (Lifetime Full Edition for smooth testing, easily modifiable by SuperAdmin)
export const DEFAULT_ACTIVE_LICENSE: AppLicense = {
  license_key: 'VAI-FULL-2026-MART',
  license_type: 'FULL',
  client_name: 'MartVai Supermarket & Swalayan',
  client_email: 'owner@martvai.id',
  activated_at: new Date().toISOString(),
  expires_at: null, // lifetime
  max_transactions: null,
  status: 'ACTIVE',
  created_by: 'SuperAdmin',
  created_at: new Date().toISOString(),
  notes: 'Lisensi Resmi Full Lifetime — Semua Fitur Kasir Swalayan Aktif Tanpa Batas Waktu',
};

// Seed licenses list for SuperAdmin
export const SEED_LICENSES: AppLicense[] = [
  DEFAULT_ACTIVE_LICENSE,
  {
    license_key: 'VAI-DEMO-TRIAL-001',
    license_type: 'DEMO',
    client_name: 'Swalayan Uji Coba',
    client_email: 'trial@martvai.id',
    activated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString(), // 14 days
    max_transactions: 50,
    status: 'ACTIVE',
    created_by: 'SuperAdmin',
    created_at: new Date().toISOString(),
    notes: 'Versi Demo Uji Coba: 14 Hari & Maksimal 50 Transaksi Kasir',
  },
  {
    license_key: 'VAI-MTH-BULAN-2026',
    license_type: 'MONTHLY',
    client_name: 'Sentosa Mart & Swalayan',
    client_email: 'sentosa@gmail.com',
    activated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days
    max_transactions: null,
    status: 'ACTIVE',
    created_by: 'SuperAdmin',
    created_at: new Date().toISOString(),
    notes: 'Langganan Bulanan (30 Hari)',
  },
  {
    license_key: 'VAI-YEA-TAHUN-2026',
    license_type: 'ANNUAL',
    client_name: 'Mart Nusantara Minimarket',
    client_email: 'admin@martnusantara.id',
    activated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(), // 1 year
    max_transactions: null,
    status: 'ACTIVE',
    created_by: 'SuperAdmin',
    created_at: new Date().toISOString(),
    notes: 'Langganan Tahunan (365 Hari)',
  },
];

class LicenseManager {
  private static instance: LicenseManager;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  private ensureInitialized(): void {
    if (!localStorage.getItem(STORAGE_KEY_LICENSES)) {
      localStorage.setItem(STORAGE_KEY_LICENSES, JSON.stringify(SEED_LICENSES));
    }
    if (!localStorage.getItem(STORAGE_KEY_ACTIVE_LICENSE)) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_LICENSE, JSON.stringify(DEFAULT_ACTIVE_LICENSE));
    }
  }

  public getAllLicenses(): AppLicense[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LICENSES);
      if (!raw) return SEED_LICENSES;
      return JSON.parse(raw);
    } catch {
      return SEED_LICENSES;
    }
  }

  public getActiveLicense(): AppLicense {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_LICENSE);
      if (!raw) return DEFAULT_ACTIVE_LICENSE;
      const license: AppLicense = JSON.parse(raw);

      // Check expiry dynamically
      if (license.expires_at) {
        const expTime = new Date(license.expires_at).getTime();
        if (Date.now() > expTime) {
          license.status = 'EXPIRED';
        }
      }

      // Check max transactions for demo
      if (license.license_type === 'DEMO' && license.max_transactions) {
        const txCount = db.getTransactions().length;
        if (txCount >= license.max_transactions) {
          license.status = 'EXPIRED';
        }
      }

      return license;
    } catch {
      return DEFAULT_ACTIVE_LICENSE;
    }
  }

  public generateLicenseKey(
    type: LicenseType,
    clientName: string,
    clientEmail: string,
    customDays?: number,
    customMaxTx?: number
  ): AppLicense {
    const random1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const random2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = type === 'FULL' ? 'FULL' : type === 'ANNUAL' ? 'YEA' : type === 'MONTHLY' ? 'MTH' : 'DEMO';
    const key = `VAI-${prefix}-${random1}-${random2}`;

    let expiresAt: string | null = null;
    let maxTx: number | null = null;

    if (type === 'DEMO') {
      const days = customDays || 14;
      expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      maxTx = customMaxTx || 50;
    } else if (type === 'MONTHLY') {
      const days = customDays || 30;
      expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    } else if (type === 'ANNUAL') {
      const days = customDays || 365;
      expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    }

    const newLicense: AppLicense = {
      license_key: key,
      license_type: type,
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      activated_at: new Date().toISOString(),
      expires_at: expiresAt,
      max_transactions: maxTx,
      status: 'ACTIVE',
      created_by: 'SuperAdmin',
      created_at: new Date().toISOString(),
      notes: `Kode Pemakaian ${type} dibuat oleh SuperAdmin`,
    };

    const all = this.getAllLicenses();
    all.unshift(newLicense);
    localStorage.setItem(STORAGE_KEY_LICENSES, JSON.stringify(all));

    // Audit log
    db.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: 'SUPERADMIN',
      user_name: 'SuperAdmin',
      action: 'BUAT_KODE_PEMAKAIAN',
      entity_type: 'LICENSE',
      entity_id: key,
      timestamp: new Date().toISOString(),
      details: `Tipe: ${type}, Klien: ${clientName} (${clientEmail}), Expired: ${expiresAt || 'Lifetime'}`,
    });

    return newLicense;
  }

  public activateLicense(licenseKey: string): { success: boolean; message: string; license?: AppLicense } {
    const key = licenseKey.trim().toUpperCase();
    const all = this.getAllLicenses();
    const found = all.find(l => l.license_key.toUpperCase() === key);

    if (!found) {
      return {
        success: false,
        message: 'Kode Pemakaian tidak valid. Pastikan format penulisan benar (contoh: VAI-FULL-XXXX-XXXX).',
      };
    }

    if (found.status === 'REVOKED') {
      return {
        success: false,
        message: 'Kode Pemakaian ini telah dicabut atau dinonaktifkan oleh SuperAdmin.',
      };
    }

    // Check expiry
    if (found.expires_at && new Date(found.expires_at).getTime() < Date.now()) {
      return {
        success: false,
        message: 'Kode Pemakaian ini sudah kedaluwarsa.',
      };
    }

    found.status = 'ACTIVE';
    found.activated_at = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY_ACTIVE_LICENSE, JSON.stringify(found));
    localStorage.setItem(STORAGE_KEY_LICENSES, JSON.stringify(all));

    db.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: 'CURRENT_USER',
      user_name: 'Aplikasi Swalayan',
      action: 'AKTIVASI_LISENSI',
      entity_type: 'LICENSE',
      entity_id: found.license_key,
      timestamp: new Date().toISOString(),
      details: `Aplikasi berhasil diaktivasi dengan kode: ${found.license_key} (${found.license_type})`,
    });

    return {
      success: true,
      message: `Aplikasi berhasil diaktivasi sebagai Versi ${found.license_type}!`,
      license: found,
    };
  }

  public setDirectLicense(license: AppLicense): void {
    localStorage.setItem(STORAGE_KEY_ACTIVE_LICENSE, JSON.stringify(license));
  }

  public revokeLicense(licenseKey: string): void {
    const all = this.getAllLicenses();
    const found = all.find(l => l.license_key === licenseKey);
    if (found) {
      found.status = 'REVOKED';
      localStorage.setItem(STORAGE_KEY_LICENSES, JSON.stringify(all));

      const active = this.getActiveLicense();
      if (active.license_key === licenseKey) {
        active.status = 'REVOKED';
        localStorage.setItem(STORAGE_KEY_ACTIVE_LICENSE, JSON.stringify(active));
      }
    }
  }

  public reactivateLicense(licenseKey: string): void {
    const all = this.getAllLicenses();
    const found = all.find(l => l.license_key === licenseKey);
    if (found) {
      found.status = 'ACTIVE';
      if (found.expires_at && new Date(found.expires_at).getTime() < Date.now()) {
        found.expires_at = new Date(Date.now() + 30 * 86400000).toISOString();
      }
      localStorage.setItem(STORAGE_KEY_LICENSES, JSON.stringify(all));

      const active = this.getActiveLicense();
      if (active.license_key === licenseKey) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_LICENSE, JSON.stringify(found));
      }
    }
  }

  public extendLicense(licenseKey: string, addDays: number | null): void {
    const all = this.getAllLicenses();
    const found = all.find(l => l.license_key === licenseKey);
    if (found) {
      if (addDays === null) {
        found.license_type = 'FULL';
        found.expires_at = null;
        found.max_transactions = null;
        found.status = 'ACTIVE';
      } else {
        const baseTime = found.expires_at
          ? Math.max(Date.now(), new Date(found.expires_at).getTime())
          : Date.now();
        found.expires_at = new Date(baseTime + addDays * 86400000).toISOString();
        found.status = 'ACTIVE';
      }
      localStorage.setItem(STORAGE_KEY_LICENSES, JSON.stringify(all));

      const active = this.getActiveLicense();
      if (active.license_key === licenseKey) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_LICENSE, JSON.stringify(found));
      }

      db.addAuditLog({
        log_id: 'log_' + Date.now(),
        user_id: 'SUPERADMIN',
        user_name: 'DiVailean (Superadmin)',
        action: 'PERPANJANG_LISENSI',
        entity_type: 'LICENSE',
        entity_id: licenseKey,
        timestamp: new Date().toISOString(),
        details: addDays === null ? `Upgrade lisensi ${licenseKey} ke FULL Lifetime` : `Perpanjang lisensi ${licenseKey} +${addDays} hari`,
      });
    }
  }

  public deleteLicense(licenseKey: string): void {
    const all = this.getAllLicenses().filter(l => l.license_key !== licenseKey);
    localStorage.setItem(STORAGE_KEY_LICENSES, JSON.stringify(all));

    db.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: 'SUPERADMIN',
      user_name: 'DiVailean (Superadmin)',
      action: 'HAPUS_LISENSI',
      entity_type: 'LICENSE',
      entity_id: licenseKey,
      timestamp: new Date().toISOString(),
      details: `Hapus permanen kode lisensi ${licenseKey}`,
    });
  }

  public checkCanProcessTransaction(): { allowed: boolean; reason?: string } {
    const lic = this.getActiveLicense();
    if (lic.status === 'REVOKED') {
      return {
        allowed: false,
        reason: 'Lisensi aplikasi telah dicabut oleh SuperAdmin. Hubungi pengembang untuk aktivasi kembali.',
      };
    }

    if (lic.status === 'EXPIRED') {
      return {
        allowed: false,
        reason: 'Masa berlaku lisensi / versi Demo telah habis. Silakan masukkan Kode Pemakaian baru.',
      };
    }

    if (lic.license_type === 'DEMO' && lic.max_transactions) {
      const txCount = db.getTransactions().length;
      if (txCount >= lic.max_transactions) {
        return {
          allowed: false,
          reason: `Batas transaksi Versi Demo (${lic.max_transactions} transaksi) telah tercapai. Harap upgrade ke Versi Full/Langganan.`,
        };
      }
    }

    return { allowed: true };
  }
}

export const licenseManager = LicenseManager.getInstance();
