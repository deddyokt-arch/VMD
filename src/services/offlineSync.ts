import { db } from './db';
import { getAccessToken, getCurrentGoogleUser } from './googleAuth';
import {
  autoRotateSpreadsheetIfNeeded,
  pullDatabaseFromSpreadsheet,
  pushAllDataToSpreadsheet,
  PullDatabaseResult,
  PushDatabaseResult,
} from './googleWorkspaceProvisioner';

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  pendingCloudPush: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  lastRotationMessage?: string | null;
}

class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private lastRotationMessage: string | null = null;
  private listeners: ((status: SyncStatus) => void)[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notify();
        this.syncPendingTransactions();
      });
      window.addEventListener('offline', () => {
        this.notify();
      });
      window.addEventListener('martvai:local-mutation', () => {
        this.notify();
      });
      window.addEventListener('martvai:data-updated', () => {
        this.notify();
      });
    }
  }

  public static getInstance(): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager();
    }
    return OfflineSyncManager.instance;
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getStatus(): SyncStatus {
    const queue = db.getSyncQueue().filter(q => q.status === 'PENDING');
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingCount: queue.length,
      pendingCloudPush: db.getPendingCloudPush(),
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      lastRotationMessage: this.lastRotationMessage,
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(l => l(status));
  }

  public async syncPendingTransactions(): Promise<{ synced: number; errors: number }> {
    if (this.isSyncing) return { synced: 0, errors: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.lastError = 'Perangkat sedang offline';
      this.notify();
      return { synced: 0, errors: 0 };
    }

    const settings = db.getSettings();
    const queue = db.getSyncQueue().filter(q => q.status === 'PENDING');

    if (queue.length === 0) {
      this.notify();
      return { synced: 0, errors: 0 };
    }

    // 1. Prefer Direct Google Sheets REST API v4 sync if OAuth token & spreadsheetId are available
    let token = await getAccessToken();
    if (token && settings.google_sheet_id) {
      this.isSyncing = true;
      this.lastError = null;
      this.notify();

      // Check 80% spreadsheet capacity before appending batch; auto-rotate if needed
      try {
        const preCheck = await autoRotateSpreadsheetIfNeeded(token);
        if (preCheck.rotated) {
          this.lastRotationMessage = preCheck.message;
        }
      } catch (rotErr) {
        console.warn('Pre-sync capacity check warning:', rotErr);
      }

      let synced = 0;
      let errors = 0;

      for (const item of queue) {
        if (item.operation_type === 'CREATE_TRANSACTION') {
          try {
            const tx = JSON.parse(item.payload_json);
            const activeSettings = db.getSettings();
            const spreadsheetId = activeSettings.google_sheet_id || settings.google_sheet_id;

            // Append to TRANSACTIONS (21 columns aligned)
            const txRow = [
              tx.transaction_id,
              tx.invoice_number,
              tx.business_date,
              tx.cashier_id,
              tx.subtotal,
              tx.discount,
              tx.tax,
              tx.service_charge,
              tx.total,
              tx.paid_amount,
              tx.change_amount,
              tx.payment_method,
              tx.payment_status,
              tx.transaction_status,
              tx.notes || '',
              tx.created_at,
              new Date().toISOString(),
              tx.cashier_name || '',
              tx.order_type || 'Belanja Reguler',
              tx.table_number || '',
              tx.customer_name || '',
            ];

            const txRes = await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TRANSACTIONS!A1:append?valueInputOption=USER_ENTERED`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values: [txRow] }),
              }
            );

            if (!txRes.ok) {
              const errBody = await txRes.text();
              throw new Error(`Gagal menulis TRANSACTIONS (HTTP ${txRes.status}): ${errBody}`);
            }

            // Append items to TRANSACTION_ITEMS if present
            if (tx.items && tx.items.length > 0) {
              const itemRows = tx.items.map((i: any) => [
                i.item_id || 'item_' + Date.now(),
                tx.transaction_id,
                i.product_id,
                i.product_name_snapshot,
                i.sku_snapshot || '',
                i.quantity,
                i.unit_price,
                i.discount || 0,
                i.tax || 0,
                i.cost_snapshot || 0,
                i.line_total,
                i.notes || '',
                i.variant_snapshot || '',
              ]);

              await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/TRANSACTION_ITEMS!A1:append?valueInputOption=USER_ENTERED`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ values: itemRows }),
                }
              );
            }

            // Append to PAYMENTS
            const payRow = [
              'pay_' + Date.now(),
              tx.transaction_id,
              tx.payment_method,
              tx.payment_method,
              tx.total,
              tx.invoice_number,
              'PAID',
              tx.created_at,
              tx.cashier_id,
              tx.transaction_id,
              new Date().toISOString(),
            ];

            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/PAYMENTS!A1:append?valueInputOption=USER_ENTERED`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values: [payRow] }),
              }
            );

            // Successfully synced item!
            db.removeSyncQueueItem(item.operation_id);
            synced++;
          } catch (err: any) {
            console.error('Direct REST API sync item error:', err);
            errors++;
            this.lastError = err.message || 'Gagal menyinkronkan transaksi ke Google Sheets';
          }
        }
      }

      // Check capacity after sync in case this batch crossed 80% threshold
      try {
        const postCheck = await autoRotateSpreadsheetIfNeeded(token);
        if (postCheck.rotated) {
          this.lastRotationMessage = postCheck.message;
        }
      } catch (rotErr) {
        console.warn('Post-sync capacity check warning:', rotErr);
      }

      this.isSyncing = false;
      this.lastSyncedAt = new Date().toISOString();
      this.notify();
      return { synced, errors };
    }

    // Also run local 80% capacity auto-rotation check even if OAuth is offline
    try {
      const localCheck = await autoRotateSpreadsheetIfNeeded(null);
      if (localCheck.rotated) {
        this.lastRotationMessage = localCheck.message;
        this.notify();
      }
    } catch {
      // ignore non-fatal local check error
    }

    // 2. Fall back to Google Apps Script Web App sync if configured
    if (settings.google_script_url && settings.google_script_url.startsWith('https://script.google.com/macros/s/')) {
      this.isSyncing = true;
      this.lastError = null;
      this.notify();

      let synced = 0;
      let errors = 0;

      try {
        const response = await fetch(settings.google_script_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'syncBatch',
            spreadsheet_id: settings.google_sheet_id,
            queue_items: queue,
          }),
        });

        const res = await response.json();
        if (res.success) {
          for (const item of queue) {
            db.removeSyncQueueItem(item.operation_id);
          }
          synced = queue.length;
          this.lastSyncedAt = new Date().toISOString();
        } else {
          this.lastError = res.error || 'Sinkronisasi Apps Script gagal';
          errors = queue.length;
        }
      } catch (err) {
        this.lastError = (err as Error).message || 'Gagal menghubungi Google Apps Script';
        errors = queue.length;
      } finally {
        this.isSyncing = false;
        this.notify();
      }

      return { synced, errors };
    }

    this.lastError = 'Memerlukan otorisasi Google OAuth atau URL Apps Script resmi';
    this.notify();
    return { synced: 0, errors: 0 };
  }

  public async pullFromSpreadsheet(
    accessToken: string,
    targetSpreadsheetId?: string
  ): Promise<PullDatabaseResult> {
    if (this.isSyncing) {
      throw new Error('Proses sinkronisasi lain sedang berjalan.');
    }
    const settings = db.getSettings();
    const spreadsheetId = targetSpreadsheetId || settings.google_sheet_id || '';
    if (!spreadsheetId) {
      throw new Error('ID Spreadsheet belum ditentukan.');
    }

    const gUser = getCurrentGoogleUser();
    const email = gUser?.email || settings.google_account_email || '';
    const displayName = gUser?.displayName || settings.google_connected_user_name || 'Pemilik Swalayan';

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    try {
      const res = await pullDatabaseFromSpreadsheet(accessToken, spreadsheetId, email, displayName);
      this.lastSyncedAt = new Date().toISOString();
      return res;
    } catch (err: any) {
      this.lastError = err.message || 'Gagal menarik data dari Google Spreadsheet.';
      throw err;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  public async pushFullDatabase(
    accessToken: string,
    targetSpreadsheetId?: string
  ): Promise<PushDatabaseResult> {
    if (this.isSyncing) {
      throw new Error('Proses sinkronisasi lain sedang berjalan.');
    }
    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    try {
      const res = await pushAllDataToSpreadsheet(accessToken, targetSpreadsheetId);
      try {
        const rot = await autoRotateSpreadsheetIfNeeded(accessToken);
        if (rot.rotated) {
          this.lastRotationMessage = rot.message;
        }
      } catch {
        // non-fatal capacity check
      }
      this.lastSyncedAt = new Date().toISOString();
      return res;
    } catch (err: any) {
      this.lastError = err.message || 'Gagal mengirim data penuh ke Google Spreadsheet.';
      throw err;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const syncManager = OfflineSyncManager.getInstance();
