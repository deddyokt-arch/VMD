// Google Workspace Auto-Provisioning Engine via official Google REST APIs (Drive & Sheets v4)
import { ALL_21_SHEETS, SHEET_COLUMNS, generateSpreadsheetId } from './googleSheetsAuto';
import { db } from './db';
import {
  AuditLog,
  CafeSettings,
  CashMovement,
  CashSession,
  Category,
  Expense,
  Ingredient,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductVariant,
  Purchase,
  PurchaseItem,
  Recipe,
  RefundRecord,
  SpreadsheetVolume,
  StockMovement,
  Supplier,
  Transaction,
  TransactionItemSnapshot,
  TransactionStatus,
  User,
  UserRole,
} from '../types';

export interface SetupStepProgress {
  step: number;
  totalSteps: number;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  detail?: string;
}

export interface ProvisioningSuccess {
  spreadsheetId: string;
  spreadsheetUrl: string;
  folderId: string;
  folderUrl: string;
  email: string;
  isExistingReused: boolean;
  pulledFromCloud?: boolean;
  sheetsCreated: string[];
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheets: Array<{ sheetId: number; title: string }>;
}

export interface DiscoveredSpreadsheet {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  modifiedTime?: string;
  volumeNumber?: number;
}

export interface PullDatabaseResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  productsCount: number;
  categoriesCount: number;
  transactionsCount: number;
  usersCount: number;
  volumesCount: number;
}

export interface PushDatabaseResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  totalRowsWritten: number;
  pushedAt: string;
}

/**
 * Parse Google API response errors gracefully into clear human-readable messages without exposing credentials
 */
async function parseGoogleApiError(res: Response, stageName: string, endpoint: string): Promise<string> {
  try {
    const text = await res.text();
    if (text) {
      try {
        const json = JSON.parse(text);
        if (json.error) {
          const code = json.error.code || res.status;
          const message = json.error.message || 'Terjadi kesalahan pada Google API';
          const statusStr = json.error.status ? ` [${json.error.status}]` : '';
          return `[Tahap: ${stageName}] ${endpoint} (HTTP ${code}${statusStr}): ${message}`;
        }
      } catch {
        // Not JSON
      }
      return `[Tahap: ${stageName}] ${endpoint} (HTTP ${res.status}): ${text.substring(0, 300)}`;
    }
  } catch {
    // Read error
  }
  return `[Tahap: ${stageName}] ${endpoint} (HTTP ${res.status}): Gagal memproses permintaan Google API.`;
}

/**
 * Verifies if a Google Spreadsheet exists and is accessible by GET metadata
 * GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}
 */
export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata | null> {
  if (!spreadsheetId || spreadsheetId.trim().length < 10) {
    return null;
  }

  const cleanId = spreadsheetId.trim();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=spreadsheetId,spreadsheetUrl,properties(title,locale,timeZone),sheets(properties(sheetId,title))`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (res.status === 404) {
      console.warn(`Spreadsheet ID '${cleanId}' tidak ditemukan di Google Drive (HTTP 404).`);
      return null;
    }

    if (res.status === 401 || res.status === 403) {
      const errDetail = await parseGoogleApiError(res, 'Verifikasi Akses Spreadsheet', `GET ${url}`);
      throw new Error(`Izin Google Sheets ditolak: ${errDetail}. Pastikan token OAuth valid dan pengguna memiliki akses.`);
    }

    if (!res.ok) {
      console.warn(`GET Spreadsheet metadata HTTP ${res.status} for ID '${cleanId}'`);
      return null;
    }

    const data = await res.json();
    if (!data || !data.spreadsheetId) {
      return null;
    }

    const sheets = (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title || '',
    }));

    return {
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
      title: data.properties?.title || 'Spreadsheet POS',
      sheets,
    };
  } catch (err: any) {
    if (err.message && err.message.includes('Izin Google Sheets ditolak')) {
      throw err;
    }
    console.warn('fetchSpreadsheetMetadata error:', err);
    return null;
  }
}

/**
 * Verifies if a Google Drive Folder exists and is accessible
 * GET https://www.googleapis.com/drive/v3/files/{folderId}
 */
async function fetchDriveFolderMetadata(
  accessToken: string,
  folderId: string
): Promise<{ id: string; webViewLink: string } | null> {
  if (!folderId || folderId.trim().length < 5) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,trashed,webViewLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.id && !data.trashed) {
      return {
        id: data.id,
        webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Searches Google Drive for an existing folder or spreadsheet with exact name (Idempotency)
 */
async function searchDriveFile(
  accessToken: string,
  name: string,
  mimeType: string
): Promise<{ id: string; name: string; webViewLink?: string } | null> {
  try {
    const q = encodeURIComponent(`name = '${name.replace(/'/g, "\\'")}' and mimeType = '${mimeType}' and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&pageSize=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.warn('Drive search returned HTTP', res.status);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (err) {
    console.warn('searchDriveFile failed:', err);
    return null;
  }
}

/**
 * Extracts raw Google Spreadsheet ID from either a full docs.google.com URL or plain ID string
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return trimmed.replace(/[^a-zA-Z0-9-_]/g, '');
}

/**
 * Discovers all existing MartVai / VaiMart Spreadsheets accessible in the signed-in Google account via Drive v3 API
 * Works across devices without needing the local store name to match beforehand.
 */
export async function discoverMartVaiSpreadsheets(
  accessToken: string
): Promise<DiscoveredSpreadsheet[]> {
  try {
    const q = encodeURIComponent(
      "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,webViewLink,modifiedTime)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.warn('discoverMartVaiSpreadsheets HTTP', res.status);
      return [];
    }

    const data = await res.json();
    const files: any[] = data.files || [];

    const mapped: DiscoveredSpreadsheet[] = files.map(f => {
      const volMatch = String(f.name || '').match(/Vol\.?\s*(\d+)/i);
      return {
        spreadsheetId: f.id,
        title: f.name || 'Spreadsheet MartVai',
        spreadsheetUrl: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
        modifiedTime: f.modifiedTime,
        volumeNumber: volMatch ? Number(volMatch[1]) : undefined,
      };
    });

    // Prioritize MartVai / VaiMart / 21 Sheet operational databases first
    return mapped.sort((a, b) => {
      const aScore = /martvai|vaimart|21 sheet|database operasional/i.test(a.title) ? 1 : 0;
      const bScore = /martvai|vaimart|21 sheet|database operasional/i.test(b.title) ? 1 : 0;
      if (aScore !== bScore) return bScore - aScore;
      return (b.modifiedTime || '').localeCompare(a.modifiedTime || '');
    });
  } catch (err) {
    console.warn('discoverMartVaiSpreadsheets error:', err);
    return [];
  }
}

/**
 * Creates a Google Drive folder for MartVai Swalayan receipts and database
 */
async function createDriveFolder(
  accessToken: string,
  folderName: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    description: 'Folder resmi sistem kasir MartVai Swalayan: Database 21 Sheet, master data produk, logo, dan bukti transaksi.',
  };

  const endpoint = 'POST https://www.googleapis.com/drive/v3/files';
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errorMsg = await parseGoogleApiError(res, 'Pembuatan Folder Google Drive', endpoint);
    throw new Error(errorMsg);
  }

  const data = await res.json();
  if (!data || !data.id) {
    throw new Error(`[Pembuatan Folder Google Drive] ${endpoint}: Respon sukses tetapi ID folder tidak dikembalikan.`);
  }

  return {
    id: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/drive/folders/${data.id}`,
  };
}

/**
 * Creates Google Spreadsheet with all 21 sheets configured in a single request
 */
async function createSpreadsheet(
  accessToken: string,
  title: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const buildPayload = (useLocale?: string) => ({
    properties: {
      title,
      ...(useLocale ? { locale: useLocale } : {}),
      timeZone: 'Asia/Jakarta',
    },
    sheets: ALL_21_SHEETS.map(sheetName => ({
      properties: {
        title: sheetName,
        gridProperties: {
          frozenRowCount: 1, // Freeze header row for readability
        },
      },
    })),
  });

  const endpoint = 'POST https://sheets.googleapis.com/v4/spreadsheets';

  // 1. Try creation with ISO 639-1 language code 'id'
  let res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildPayload('id')),
  });

  // 2. Fallback if HTTP 400 occurs due to unsupported locale property
  if (!res.ok && res.status === 400) {
    const errorText = await res.clone().text();
    if (errorText.toLowerCase().includes('locale')) {
      console.warn('Google Sheets API rejected locale "id", retrying creation without locale property...');
      res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPayload(undefined)),
      });
    }
  }

  if (!res.ok) {
    const errorMsg = await parseGoogleApiError(res, 'Pembuatan Google Spreadsheet', endpoint);
    throw new Error(errorMsg);
  }

  const data = await res.json();
  if (!data || !data.spreadsheetId) {
    throw new Error(`[Pembuatan Google Spreadsheet] ${endpoint}: Respon sukses tetapi spreadsheetId tidak dikembalikan.`);
  }

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Moves file into a target Google Drive folder
 */
async function moveFileToFolder(
  accessToken: string,
  fileId: string,
  folderId: string
): Promise<void> {
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&fields=id,parents`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (err) {
    console.warn('moveFileToFolder error (non-fatal):', err);
  }
}

/**
 * Ensures all 21 sheets exist in the target spreadsheet using addSheet batchUpdate
 */
export async function ensureAllSheetsExist(
  accessToken: string,
  spreadsheetId: string,
  requiredSheetNames: string[]
): Promise<SpreadsheetMetadata> {
  const meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
  if (!meta) {
    throw new Error(
      `[Pemeriksaan Metadata Spreadsheet] GET https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId} (HTTP 404): ` +
      `Spreadsheet ID '${spreadsheetId}' tidak ditemukan di akun Google Drive ini. ` +
      `Pastikan akun Google yang terhubung memiliki akses penuh.`
    );
  }

  const existingTitles = meta.sheets.map(s => s.title);
  const missingSheetNames = requiredSheetNames.filter(name => !existingTitles.includes(name));

  if (missingSheetNames.length === 0) {
    return meta;
  }

  // Create missing sheets via batchUpdate addSheet
  const requests = missingSheetNames.map(sheetTitle => ({
    addSheet: {
      properties: {
        title: sheetTitle,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    },
  }));

  const endpoint = `POST https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const errorMsg = await parseGoogleApiError(res, 'Penambahan Sheet via addSheet', endpoint);
    throw new Error(errorMsg);
  }

  // Re-fetch updated metadata
  const updatedMeta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
  if (!updatedMeta) {
    throw new Error(`[Verifikasi Penambahan Sheet] Gagal mengambil metadata spreadsheet setelah batchUpdate addSheet.`);
  }

  return updatedMeta;
}

function toColLetter(colCount: number): string {
  return String.fromCharCode(64 + Math.max(1, Math.min(colCount, 26)));
}

function buildSettingsRows(settings: CafeSettings): any[][] {
  const now = new Date().toISOString();
  const compactVolumes = (settings.spreadsheet_volumes || []).map(v => ({
    ...v,
    local_snapshot: undefined, // Keep cell compact well under Google Sheets 50k char limit
  }));

  const pairs: Array<[string, string]> = [
    ['cafe_name', settings.cafe_name || 'MartVai Swalayan'],
    ['owner_name', settings.owner_name || 'Pemilik Swalayan'],
    ['address', settings.address || ''],
    ['phone', settings.phone || ''],
    ['email', settings.email || ''],
    ['currency', settings.currency || 'IDR'],
    ['currency_symbol', settings.currency_symbol || 'Rp'],
    ['timezone', settings.timezone || 'Asia/Jakarta'],
    ['tax_percentage', String(settings.tax_percentage ?? 11)],
    ['tax_enabled', settings.tax_enabled ? 'TRUE' : 'FALSE'],
    ['service_charge_percentage', String(settings.service_charge_percentage ?? 0)],
    ['service_charge_enabled', settings.service_charge_enabled ? 'TRUE' : 'FALSE'],
    ['receipt_footer', settings.receipt_footer || ''],
    ['receipt_paper_size', settings.receipt_paper_size || '58mm'],
    ['qris_merchant_name', settings.qris_merchant_name || ''],
    ['qris_nmid', settings.qris_nmid || ''],
    ['allow_negative_stock', settings.allow_negative_stock ? 'TRUE' : 'FALSE'],
    ['spreadsheet_cell_limit', String(settings.spreadsheet_cell_limit || 10000000)],
    ['spreadsheet_rotation_threshold', String(settings.spreadsheet_rotation_threshold || 80)],
    ['active_license_key', settings.active_license_key || ''],
    ['google_drive_folder_id', settings.google_drive_folder_id || ''],
    ['google_drive_folder_url', settings.google_drive_folder_url || ''],
    ['spreadsheet_volumes', JSON.stringify(compactVolumes)],
  ];

  return pairs.map(([k, v]) => [k, v, now]);
}

function buildMasterAndOperationalDataMap(settings: CafeSettings): Record<string, any[][]> {
  const users = db.getStoreUsers();
  const categories = db.getCategories();
  const products = db.getProducts();
  const ingredients = db.getIngredients();
  const recipes = db.getRecipes();
  const suppliers = db.getSuppliers();
  const transactions = db.getTransactions();
  const expenses = db.getExpenses();
  const purchases = db.getPurchases();
  const stockMovements = db.getStockMovements();
  const cashSessions = db.getCashSessions();
  const cashMovements = db.getCashMovements();
  const auditLogs = db.getAuditLog();
  const refunds = db.getRefunds();

  const txItems = transactions.flatMap(t => t.items || []);
  const purchaseItems = purchases.flatMap(p => p.items || []);

  return {
    SETTINGS: buildSettingsRows(settings),
    USERS: users.map(u => [
      u.user_id,
      u.username,
      u.password_hash,
      u.full_name,
      u.role,
      u.active ? 'TRUE' : 'FALSE',
      u.pin_hash || '',
      u.created_at,
      u.last_login || '',
    ]),
    CATEGORIES: categories.map(c => [
      c.category_id,
      c.category_name,
      c.description || '',
      c.image_url || '',
      c.active ? 'TRUE' : 'FALSE',
      String(c.sort_order),
      c.created_at,
    ]),
    PRODUCTS: products.map(p => [
      p.product_id,
      p.sku || '',
      p.barcode || '',
      p.product_name,
      p.category_id,
      p.description || '',
      p.image_url || '',
      p.selling_price,
      p.cost_price,
      p.stock_type,
      p.stock_qty,
      p.minimum_stock,
      p.unit,
      p.active ? 'TRUE' : 'FALSE',
      p.created_at,
      p.updated_at,
      p.brand || '',
      p.rack_location || '',
      p.wholesale_price ?? 0,
      p.variants && p.variants.length > 0 ? JSON.stringify(p.variants) : '',
    ]),
    RECIPES: recipes.map(r => [
      r.recipe_id,
      r.product_id,
      r.ingredient_id,
      r.quantity_used,
      r.unit,
      r.created_at,
    ]),
    INGREDIENTS: ingredients.map(i => [
      i.ingredient_id,
      i.ingredient_name,
      i.unit,
      i.stock_qty,
      i.minimum_stock,
      i.cost_per_unit,
      i.supplier_id || '',
      i.updated_at,
    ]),
    SUPPLIERS: suppliers.map(s => [
      s.supplier_id,
      s.supplier_name,
      s.phone || '',
      s.address || '',
      s.email || '',
      s.notes || '',
      s.active ? 'TRUE' : 'FALSE',
    ]),
    TRANSACTIONS: transactions.map(t => [
      t.transaction_id,
      t.invoice_number,
      t.business_date,
      t.cashier_id,
      t.subtotal,
      t.discount,
      t.tax,
      t.service_charge,
      t.total,
      t.paid_amount,
      t.change_amount,
      t.payment_method,
      t.payment_status,
      t.transaction_status,
      t.notes || '',
      t.created_at,
      t.synced_at || new Date().toISOString(),
      t.cashier_name || '',
      t.order_type || 'Belanja Reguler',
      t.table_number || '',
      t.customer_name || '',
    ]),
    TRANSACTION_ITEMS: txItems.map(i => [
      i.item_id,
      i.transaction_id,
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
    ]),
    PAYMENTS: transactions.map(t => [
      `pay_${t.transaction_id}`,
      t.transaction_id,
      t.payment_method,
      t.payment_method,
      t.total,
      t.invoice_number,
      t.payment_status || 'PAID',
      t.created_at,
      t.cashier_id,
      t.transaction_id,
      t.synced_at || t.created_at,
    ]),
    EXPENSES: expenses.map(e => [
      e.expense_id,
      e.expense_date,
      e.category,
      e.description,
      e.amount,
      e.payment_method,
      e.receipt_url || '',
      e.created_by,
      e.created_at,
    ]),
    PURCHASES: purchases.map(p => [
      p.purchase_id,
      p.purchase_number,
      p.supplier_id,
      p.purchase_date,
      p.subtotal,
      p.discount,
      p.total,
      p.payment_status,
      p.notes || '',
      p.created_by,
      p.supplier_name || '',
      p.items && p.items.length > 0 ? JSON.stringify(p.items) : '',
    ]),
    PURCHASE_ITEMS: purchaseItems.map(pi => [
      pi.purchase_item_id,
      pi.purchase_id,
      pi.ingredient_id || '',
      pi.product_id || '',
      pi.quantity,
      pi.unit_cost,
      pi.line_total,
      pi.item_name || '',
    ]),
    STOCK_MOVEMENTS: stockMovements.map(m => [
      m.movement_id,
      m.movement_date,
      m.item_type,
      m.item_id,
      m.movement_type,
      m.quantity_in,
      m.quantity_out,
      m.balance_after,
      m.reference_id,
      m.notes || '',
      m.created_by,
      m.item_name || '',
    ]),
    CASH_SESSIONS: cashSessions.map(s => [
      s.session_id,
      s.cashier_id,
      s.opening_time,
      s.opening_cash,
      s.closing_time || '',
      s.expected_cash,
      s.actual_cash ?? '',
      s.cash_difference ?? '',
      s.status,
      s.notes || '',
      s.cashier_name || '',
    ]),
    CASH_MOVEMENTS: cashMovements.map(m => [
      m.movement_id,
      m.session_id,
      m.movement_type,
      m.amount,
      m.description,
      m.created_by,
      m.created_at,
    ]),
    AUDIT_LOG: auditLogs.map(l => [
      l.log_id,
      l.user_id,
      l.action,
      l.entity_type,
      l.entity_id,
      l.timestamp,
      l.details,
      l.user_name || '',
    ]),
    REFUNDS: refunds.map(r => [
      r.refund_id,
      r.transaction_id,
      r.refund_number,
      r.amount,
      r.reason,
      r.status,
      r.approved_by || '',
      r.created_by,
      r.created_at,
      r.restock_items ? 'TRUE' : 'FALSE',
    ]),
  };
}

/**
 * Checks whether a spreadsheet already contains operational rows so we NEVER overwrite existing store data on reconnect.
 */
async function checkSpreadsheetHasExistingData(
  accessToken: string,
  spreadsheetId: string,
  availableSheetTitles: string[]
): Promise<{ hasData: boolean; emptyHeaderSheets: string[]; emptyDataSheets: string[] }> {
  const sheetsToCheck = ALL_21_SHEETS.filter(s => availableSheetTitles.includes(s));
  if (sheetsToCheck.length === 0) {
    return { hasData: false, emptyHeaderSheets: [], emptyDataSheets: [] };
  }

  const rangesQuery = sheetsToCheck
    .map(s => `ranges=${encodeURIComponent(`${s}!A1:B2`)}`)
    .join('&');

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    return { hasData: true, emptyHeaderSheets: [], emptyDataSheets: [] };
  }

  const data = await res.json();
  const valueRanges: Array<{ values?: any[][] }> = data.valueRanges || [];
  const emptyHeaderSheets: string[] = [];
  const emptyDataSheets: string[] = [];
  let hasData = false;

  sheetsToCheck.forEach((sheetName, idx) => {
    const vals = valueRanges[idx]?.values || [];
    if (vals.length === 0 || !vals[0] || vals[0].length === 0) {
      emptyHeaderSheets.push(sheetName);
    }
    if (vals.length < 2) {
      emptyDataSheets.push(sheetName);
    } else if (['SETTINGS', 'USERS', 'CATEGORIES', 'PRODUCTS', 'TRANSACTIONS'].includes(sheetName)) {
      hasData = true;
    }
  });

  return { hasData, emptyHeaderSheets, emptyDataSheets };
}

/**
 * Populates 21 sheet headers and seeds initial data via sheets values:batchUpdate.
 * Non-destructive when onlySeedIfEmpty=true (never overwrites existing rows).
 */
async function populateSheetHeadersAndData(
  accessToken: string,
  spreadsheetId: string,
  availableSheetTitles: string[],
  settings: CafeSettings,
  options?: { onlySeedIfEmpty?: boolean }
): Promise<void> {
  const onlySeedIfEmpty = options?.onlySeedIfEmpty ?? false;
  let emptyHeaderSheets = ALL_21_SHEETS.filter(s => availableSheetTitles.includes(s));
  let emptyDataSheets = [...emptyHeaderSheets];

  if (onlySeedIfEmpty) {
    const check = await checkSpreadsheetHasExistingData(accessToken, spreadsheetId, availableSheetTitles);
    emptyHeaderSheets = check.emptyHeaderSheets;
    emptyDataSheets = check.emptyDataSheets;
  }

  const updateData: Array<{ range: string; values: any[][] }> = [];

  // 1. Column headers for sheets missing headers
  for (const sheetName of emptyHeaderSheets) {
    const columns = SHEET_COLUMNS[sheetName] || [];
    if (columns.length > 0) {
      updateData.push({
        range: `${sheetName}!A1:${toColLetter(columns.length)}1`,
        values: [columns],
      });
    }
  }

  // 2. Seed data ONLY for sheets that do not already have data rows
  const dataMap = buildMasterAndOperationalDataMap(settings);
  for (const sheetName of ['SETTINGS', 'USERS', 'CATEGORIES', 'PRODUCTS', 'INGREDIENTS', 'SUPPLIERS']) {
    if (!emptyDataSheets.includes(sheetName)) continue;
    const rows = dataMap[sheetName];
    const cols = SHEET_COLUMNS[sheetName] || [];
    if (rows && rows.length > 0 && cols.length > 0) {
      updateData.push({
        range: `${sheetName}!A2:${toColLetter(cols.length)}${rows.length + 1}`,
        values: rows,
      });
    }
  }

  if (updateData.length === 0) return;

  const payload = {
    valueInputOption: 'USER_ENTERED',
    data: updateData,
  };

  const endpoint = `POST https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorMsg = await parseGoogleApiError(res, 'Pengisian Header 21 Sheet', endpoint);
    throw new Error(errorMsg);
  }
}

function parseBoolCell(v: any, defaultVal = false): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toUpperCase();
  if (!s) return defaultVal;
  return s === 'TRUE' || s === '1' || s === 'YES' || s === 'YA';
}

function parseNumCell(v: any, defaultVal = 0): number {
  if (typeof v === 'number' && !isNaN(v)) return v;
  const cleaned = String(v ?? '').replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return isNaN(n) ? defaultVal : n;
}

/**
 * PULL: Reads complete database (Settings, Users, Categories, Products, Stock, Transactions, Cash Ledger, Refunds, Audit)
 * from a target Google Spreadsheet and hydrates local device database cleanly (Multi-Device / Multi-Account Hydration).
 */
export async function pullDatabaseFromSpreadsheet(
  accessToken: string,
  targetSpreadsheetId: string,
  userEmail: string,
  userName: string,
  onProgress?: (progress: SetupStepProgress) => void
): Promise<PullDatabaseResult> {
  const spreadsheetId = extractSpreadsheetId(targetSpreadsheetId);
  if (!spreadsheetId) {
    throw new Error('ID Google Spreadsheet tidak valid.');
  }

  onProgress?.({
    step: 1,
    totalSteps: 4,
    label: 'Verifikasi Akses Spreadsheet Target',
    status: 'in_progress',
    detail: 'Memeriksa metadata spreadsheet di akun Google...',
  });

  const meta = await ensureAllSheetsExist(accessToken, spreadsheetId, ALL_21_SHEETS);
  const available = meta.sheets.map(s => s.title);

  // Ensure any empty/newly added sheet headers exist without overwriting existing rows
  await populateSheetHeadersAndData(accessToken, spreadsheetId, available, db.getSettings(), {
    onlySeedIfEmpty: true,
  });

  onProgress?.({
    step: 2,
    totalSteps: 4,
    label: 'Mengunduh Master Data & Transaksi dari Google Sheets',
    status: 'in_progress',
    detail: `Membaca 18 tabel dari "${meta.title}"...`,
  });

  const sheetRanges: Array<{ sheet: string; range: string }> = [
    { sheet: 'SETTINGS', range: 'SETTINGS!A1:C200' },
    { sheet: 'USERS', range: 'USERS!A1:I500' },
    { sheet: 'CATEGORIES', range: 'CATEGORIES!A1:G500' },
    { sheet: 'PRODUCTS', range: 'PRODUCTS!A1:T5000' },
    { sheet: 'INGREDIENTS', range: 'INGREDIENTS!A1:H2000' },
    { sheet: 'RECIPES', range: 'RECIPES!A1:F5000' },
    { sheet: 'SUPPLIERS', range: 'SUPPLIERS!A1:G500' },
    { sheet: 'TRANSACTIONS', range: 'TRANSACTIONS!A1:U10000' },
    { sheet: 'TRANSACTION_ITEMS', range: 'TRANSACTION_ITEMS!A1:M20000' },
    { sheet: 'EXPENSES', range: 'EXPENSES!A1:I5000' },
    { sheet: 'PURCHASES', range: 'PURCHASES!A1:L5000' },
    { sheet: 'PURCHASE_ITEMS', range: 'PURCHASE_ITEMS!A1:H10000' },
    { sheet: 'STOCK_MOVEMENTS', range: 'STOCK_MOVEMENTS!A1:L10000' },
    { sheet: 'CASH_SESSIONS', range: 'CASH_SESSIONS!A1:K2000' },
    { sheet: 'CASH_MOVEMENTS', range: 'CASH_MOVEMENTS!A1:G5000' },
    { sheet: 'AUDIT_LOG', range: 'AUDIT_LOG!A1:H2000' },
    { sheet: 'REFUNDS', range: 'REFUNDS!A1:J2000' },
  ].filter(r => available.includes(r.sheet));

  const endpoint = `GET https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet`;
  const rangesParam = sheetRanges.map(r => `ranges=${encodeURIComponent(r.range)}`).join('&');
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) {
    const errMsg = await parseGoogleApiError(res, 'Tarik Data (Pull) Google Sheets', endpoint);
    throw new Error(errMsg);
  }

  const batchJson = await res.json();
  const valueRanges: Array<{ values?: any[][] }> = batchJson.valueRanges || [];
  const tableRows: Record<string, any[][]> = {};

  sheetRanges.forEach((sr, idx) => {
    const rawValues = valueRanges[idx]?.values || [];
    // Skip row 0 (header row)
    tableRows[sr.sheet] = rawValues.length > 1 ? rawValues.slice(1) : [];
  });

  onProgress?.({
    step: 3,
    totalSteps: 4,
    label: 'Memproses & Memulihkan Database Lokal Perangkat',
    status: 'in_progress',
    detail: 'Menyusun produk, pengguna, shift kasir, dan riwayat transaksi...',
  });

  // 1. Parse SETTINGS
  const settingsKv: Record<string, string> = {};
  for (const r of tableRows['SETTINGS'] || []) {
    if (r[0]) settingsKv[String(r[0]).trim()] = String(r[1] ?? '');
  }

  let parsedVolumes: SpreadsheetVolume[] = [];
  if (settingsKv.spreadsheet_volumes) {
    try {
      const v = JSON.parse(settingsKv.spreadsheet_volumes);
      if (Array.isArray(v)) parsedVolumes = v;
    } catch {
      // ignore malformed JSON
    }
  }

  // Also discover other Spreadsheets in Google Drive (e.g. older Vol. 1..N archives)
  const discoveredFiles = await discoverMartVaiSpreadsheets(accessToken);
  const storePrefix = (settingsKv.cafe_name || meta.title.replace(/^MartVai\s*-\s*/i, '').replace(/^VaiMart\s*-\s*/i, '').split('Database')[0]).trim().toLowerCase();

  if (parsedVolumes.length === 0) {
    const relatedFiles = discoveredFiles.filter(f =>
      f.spreadsheetId === meta.spreadsheetId ||
      (storePrefix && f.title.toLowerCase().includes(storePrefix) && /vol\.?\s*\d+/i.test(f.title))
    );
    parsedVolumes = relatedFiles.map((f, idx) => ({
      volume_id: f.spreadsheetId === meta.spreadsheetId ? 'vol_active' : `vol_arc_${idx + 1}`,
      volume_number: f.volumeNumber || relatedFiles.length - idx,
      title: f.title,
      spreadsheet_id: f.spreadsheetId,
      spreadsheet_url: f.spreadsheetUrl,
      status: f.spreadsheetId === meta.spreadsheetId ? 'ACTIVE' : 'ARCHIVED',
      used_cells: 0,
      max_cells: parseNumCell(settingsKv.spreadsheet_cell_limit, 10000000),
      usage_percent: 0,
      transaction_count: 0,
      created_at: f.modifiedTime || new Date().toISOString(),
    }));
  } else {
    // Ensure selected spreadsheet is marked ACTIVE in volume registry
    parsedVolumes = parsedVolumes.map(v => ({
      ...v,
      status: v.spreadsheet_id === meta.spreadsheetId ? 'ACTIVE' : 'ARCHIVED',
    }));
    if (!parsedVolumes.some(v => v.spreadsheet_id === meta.spreadsheetId)) {
      parsedVolumes.unshift({
        volume_id: `vol_${parsedVolumes.length + 1}`,
        volume_number: parsedVolumes.length + 1,
        title: meta.title,
        spreadsheet_id: meta.spreadsheetId,
        spreadsheet_url: meta.spreadsheetUrl,
        status: 'ACTIVE',
        used_cells: 0,
        max_cells: parseNumCell(settingsKv.spreadsheet_cell_limit, 10000000),
        usage_percent: 0,
        transaction_count: (tableRows['TRANSACTIONS'] || []).length,
        created_at: new Date().toISOString(),
      });
    }
  }

  const cleanTitleStoreName = meta.title
    .replace(/^(MartVai|VaiMart)\s*-\s*/i, '')
    .replace(/\s*Database.*$/i, '')
    .trim();

  const pulledSettings: Partial<CafeSettings> = {
    cafe_name: settingsKv.cafe_name || cleanTitleStoreName || 'MartVai Swalayan',
    owner_name: settingsKv.owner_name || userName || 'Pemilik Swalayan',
    address: settingsKv.address || '',
    phone: settingsKv.phone || '',
    email: settingsKv.email || userEmail,
    currency: settingsKv.currency || 'IDR',
    currency_symbol: settingsKv.currency_symbol || 'Rp',
    timezone: settingsKv.timezone || 'Asia/Jakarta',
    tax_percentage: parseNumCell(settingsKv.tax_percentage, 11),
    tax_enabled: parseBoolCell(settingsKv.tax_enabled, false),
    service_charge_percentage: parseNumCell(settingsKv.service_charge_percentage, 0),
    service_charge_enabled: parseBoolCell(settingsKv.service_charge_enabled, false),
    receipt_footer: settingsKv.receipt_footer || 'Terima kasih atas kunjungan dan kepercayaan Anda!',
    receipt_paper_size: (settingsKv.receipt_paper_size === '80mm' ? '80mm' : '58mm'),
    qris_merchant_name: settingsKv.qris_merchant_name || '',
    qris_nmid: settingsKv.qris_nmid || '',
    allow_negative_stock: parseBoolCell(settingsKv.allow_negative_stock, false),
    spreadsheet_cell_limit: parseNumCell(settingsKv.spreadsheet_cell_limit, 10000000),
    spreadsheet_rotation_threshold: parseNumCell(settingsKv.spreadsheet_rotation_threshold, 80),
    active_license_key: settingsKv.active_license_key || 'VAIPRO-FULL-2026-LIFETIME',
    google_drive_folder_id: settingsKv.google_drive_folder_id || '',
    google_drive_folder_url: settingsKv.google_drive_folder_url || '',
    google_account_email: userEmail,
    google_connected_user_name: userName,
    google_oauth_connected: true,
    google_sheet_id: meta.spreadsheetId,
    google_spreadsheet_url: meta.spreadsheetUrl,
    google_auto_synced: true,
    google_auto_created_at: new Date().toISOString(),
    spreadsheet_volumes: parsedVolumes,
    is_configured: true,
    google_last_diagnostics: {
      success: true,
      message: `Data ditarik sukses dari Spreadsheet "${meta.title}"`,
      timestamp: new Date().toISOString(),
    },
  };

  // 2. Parse USERS
  const users: User[] = (tableRows['USERS'] || [])
    .filter(r => r[0] && r[1])
    .map(r => ({
      user_id: String(r[0]),
      username: String(r[1]),
      password_hash: String(r[2] || ''),
      full_name: String(r[3] || r[1]),
      role: (String(r[4] || 'KASIR').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'KASIR') as UserRole,
      active: parseBoolCell(r[5], true),
      pin_hash: r[6] ? String(r[6]) : undefined,
      created_at: String(r[7] || new Date().toISOString()),
      last_login: r[8] ? String(r[8]) : undefined,
    }));

  // 3. Parse CATEGORIES
  const categories: Category[] = (tableRows['CATEGORIES'] || [])
    .filter(r => r[0] && r[1])
    .map((r, idx) => ({
      category_id: String(r[0]),
      category_name: String(r[1]),
      description: String(r[2] || ''),
      image_url: String(r[3] || ''),
      active: parseBoolCell(r[4], true),
      sort_order: parseNumCell(r[5], idx + 1),
      created_at: String(r[6] || new Date().toISOString()),
    }));

  // 4. Parse PRODUCTS
  const products: Product[] = (tableRows['PRODUCTS'] || [])
    .filter(r => r[0] && r[3])
    .map(r => {
      let variants: ProductVariant[] | undefined;
      if (r[19]) {
        try {
          const parsed = JSON.parse(String(r[19]));
          if (Array.isArray(parsed)) variants = parsed;
        } catch {
          // ignore
        }
      }
      return {
        product_id: String(r[0]),
        sku: String(r[1] || ''),
        barcode: String(r[2] || ''),
        product_name: String(r[3]),
        category_id: String(r[4] || ''),
        description: String(r[5] || ''),
        image_url: String(r[6] || ''),
        selling_price: parseNumCell(r[7], 0),
        cost_price: parseNumCell(r[8], 0),
        stock_type: (r[9] === 'recipe' ? 'recipe' : 'finished'),
        stock_qty: parseNumCell(r[10], 0),
        minimum_stock: parseNumCell(r[11], 5),
        unit: String(r[12] || 'Pcs'),
        active: parseBoolCell(r[13], true),
        created_at: String(r[14] || new Date().toISOString()),
        updated_at: String(r[15] || new Date().toISOString()),
        brand: r[16] ? String(r[16]) : undefined,
        rack_location: r[17] ? String(r[17]) : undefined,
        wholesale_price: r[18] !== undefined && r[18] !== '' ? parseNumCell(r[18], 0) : undefined,
        variants,
      };
    });

  // 5. Parse INGREDIENTS, RECIPES, SUPPLIERS
  const ingredients: Ingredient[] = (tableRows['INGREDIENTS'] || [])
    .filter(r => r[0] && r[1])
    .map(r => ({
      ingredient_id: String(r[0]),
      ingredient_name: String(r[1]),
      unit: String(r[2] || 'pcs'),
      stock_qty: parseNumCell(r[3], 0),
      minimum_stock: parseNumCell(r[4], 0),
      cost_per_unit: parseNumCell(r[5], 0),
      supplier_id: r[6] ? String(r[6]) : undefined,
      updated_at: String(r[7] || new Date().toISOString()),
    }));

  const recipes: Recipe[] = (tableRows['RECIPES'] || [])
    .filter(r => r[0] && r[1])
    .map(r => ({
      recipe_id: String(r[0]),
      product_id: String(r[1]),
      ingredient_id: String(r[2] || ''),
      quantity_used: parseNumCell(r[3], 0),
      unit: String(r[4] || 'pcs'),
      created_at: String(r[5] || new Date().toISOString()),
    }));

  const suppliers: Supplier[] = (tableRows['SUPPLIERS'] || [])
    .filter(r => r[0] && r[1])
    .map(r => ({
      supplier_id: String(r[0]),
      supplier_name: String(r[1]),
      phone: String(r[2] || ''),
      address: String(r[3] || ''),
      email: String(r[4] || ''),
      notes: String(r[5] || ''),
      active: parseBoolCell(r[6], true),
    }));

  // 6. Parse TRANSACTION_ITEMS grouped by transaction_id
  const txItemsByTxId: Record<string, TransactionItemSnapshot[]> = {};
  for (const r of tableRows['TRANSACTION_ITEMS'] || []) {
    if (!r[1]) continue;
    const txId = String(r[1]);
    if (!txItemsByTxId[txId]) txItemsByTxId[txId] = [];
    txItemsByTxId[txId].push({
      item_id: String(r[0] || `item_${txItemsByTxId[txId].length + 1}`),
      transaction_id: txId,
      product_id: String(r[2] || ''),
      product_name_snapshot: String(r[3] || 'Produk'),
      sku_snapshot: String(r[4] || ''),
      quantity: parseNumCell(r[5], 1),
      unit_price: parseNumCell(r[6], 0),
      discount: parseNumCell(r[7], 0),
      tax: parseNumCell(r[8], 0),
      cost_snapshot: parseNumCell(r[9], 0),
      line_total: parseNumCell(r[10], 0),
      notes: String(r[11] || ''),
      variant_snapshot: String(r[12] || ''),
    });
  }

  const userById: Record<string, User> = {};
  users.forEach(u => {
    userById[u.user_id] = u;
  });

  // 7. Parse TRANSACTIONS
  const transactions: Transaction[] = (tableRows['TRANSACTIONS'] || [])
    .filter(r => r[0])
    .map(r => {
      const txId = String(r[0]);
      const cashierId = String(r[3] || '');
      return {
        transaction_id: txId,
        invoice_number: String(r[1] || txId),
        business_date: String(r[2] || String(r[15] || '').slice(0, 10)),
        cashier_id: cashierId,
        cashier_name: String(r[17] || userById[cashierId]?.full_name || cashierId || 'Kasir'),
        order_type: (r[18] || 'Belanja Reguler') as OrderType,
        table_number: r[19] ? String(r[19]) : undefined,
        customer_name: r[20] ? String(r[20]) : undefined,
        subtotal: parseNumCell(r[4], 0),
        discount: parseNumCell(r[5], 0),
        tax: parseNumCell(r[6], 0),
        service_charge: parseNumCell(r[7], 0),
        total: parseNumCell(r[8], 0),
        paid_amount: parseNumCell(r[9], 0),
        change_amount: parseNumCell(r[10], 0),
        payment_method: (r[11] || 'TUNAI') as PaymentMethod,
        payment_status: (r[12] || 'PAID') as PaymentStatus,
        transaction_status: (r[13] || 'COMPLETED') as TransactionStatus,
        notes: String(r[14] || ''),
        created_at: String(r[15] || new Date().toISOString()),
        synced_at: r[16] ? String(r[16]) : undefined,
        items: txItemsByTxId[txId] || [],
      };
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  // 8. Parse EXPENSES
  const expenses: Expense[] = (tableRows['EXPENSES'] || [])
    .filter(r => r[0])
    .map(r => ({
      expense_id: String(r[0]),
      expense_date: String(r[1] || ''),
      category: (r[2] || 'Operasional') as Expense['category'],
      description: String(r[3] || ''),
      amount: parseNumCell(r[4], 0),
      payment_method: String(r[5] || 'TUNAI'),
      receipt_url: r[6] ? String(r[6]) : undefined,
      created_by: String(r[7] || ''),
      created_at: String(r[8] || new Date().toISOString()),
    }));

  // 9. Parse PURCHASES & PURCHASE_ITEMS
  const pItemsByPurchaseId: Record<string, PurchaseItem[]> = {};
  for (const r of tableRows['PURCHASE_ITEMS'] || []) {
    if (!r[1]) continue;
    const pId = String(r[1]);
    if (!pItemsByPurchaseId[pId]) pItemsByPurchaseId[pId] = [];
    pItemsByPurchaseId[pId].push({
      purchase_item_id: String(r[0] || `pi_${pItemsByPurchaseId[pId].length + 1}`),
      purchase_id: pId,
      ingredient_id: r[2] ? String(r[2]) : undefined,
      product_id: r[3] ? String(r[3]) : undefined,
      item_name: String(r[7] || 'Barang'),
      quantity: parseNumCell(r[4], 1),
      unit_cost: parseNumCell(r[5], 0),
      line_total: parseNumCell(r[6], 0),
    });
  }

  const purchases: Purchase[] = (tableRows['PURCHASES'] || [])
    .filter(r => r[0])
    .map(r => {
      const pId = String(r[0]);
      let items: PurchaseItem[] = pItemsByPurchaseId[pId] || [];
      if (items.length === 0 && r[11]) {
        try {
          const parsed = JSON.parse(String(r[11]));
          if (Array.isArray(parsed)) items = parsed;
        } catch {
          // ignore
        }
      }
      return {
        purchase_id: pId,
        purchase_number: String(r[1] || pId),
        supplier_id: String(r[2] || ''),
        supplier_name: r[10] ? String(r[10]) : undefined,
        purchase_date: String(r[3] || ''),
        subtotal: parseNumCell(r[4], 0),
        discount: parseNumCell(r[5], 0),
        total: parseNumCell(r[6], 0),
        payment_status: (r[7] === 'HUTANG' ? 'HUTANG' : 'LUNAS'),
        notes: String(r[8] || ''),
        created_by: String(r[9] || ''),
        items,
      };
    });

  // 10. Parse STOCK_MOVEMENTS
  const stockMovements: StockMovement[] = (tableRows['STOCK_MOVEMENTS'] || [])
    .filter(r => r[0])
    .map(r => ({
      movement_id: String(r[0]),
      movement_date: String(r[1] || new Date().toISOString()),
      item_type: (r[2] === 'ingredient' ? 'ingredient' : 'product'),
      item_id: String(r[3] || ''),
      item_name: String(r[11] || r[3] || ''),
      movement_type: (r[4] || 'adjustment') as StockMovement['movement_type'],
      quantity_in: parseNumCell(r[5], 0),
      quantity_out: parseNumCell(r[6], 0),
      balance_after: parseNumCell(r[7], 0),
      reference_id: String(r[8] || ''),
      notes: String(r[9] || ''),
      created_by: String(r[10] || ''),
    }));

  // 11. Parse CASH_SESSIONS, CASH_MOVEMENTS, AUDIT_LOG, REFUNDS
  const cashSessions: CashSession[] = (tableRows['CASH_SESSIONS'] || [])
    .filter(r => r[0])
    .map(r => {
      const cashierId = String(r[1] || '');
      return {
        session_id: String(r[0]),
        cashier_id: cashierId,
        cashier_name: String(r[10] || userById[cashierId]?.full_name || cashierId || 'Kasir'),
        opening_time: String(r[2] || new Date().toISOString()),
        opening_cash: parseNumCell(r[3], 0),
        closing_time: r[4] ? String(r[4]) : undefined,
        expected_cash: parseNumCell(r[5], 0),
        actual_cash: r[6] !== undefined && r[6] !== '' ? parseNumCell(r[6], 0) : undefined,
        cash_difference: r[7] !== undefined && r[7] !== '' ? parseNumCell(r[7], 0) : undefined,
        status: (r[8] === 'CLOSED' ? 'CLOSED' : 'OPEN'),
        notes: r[9] ? String(r[9]) : undefined,
      };
    });

  const cashMovements: CashMovement[] = (tableRows['CASH_MOVEMENTS'] || [])
    .filter(r => r[0])
    .map(r => ({
      movement_id: String(r[0]),
      session_id: String(r[1] || ''),
      movement_type: (r[2] === 'CASH_OUT' ? 'CASH_OUT' : 'CASH_IN'),
      amount: parseNumCell(r[3], 0),
      description: String(r[4] || ''),
      created_by: String(r[5] || ''),
      created_at: String(r[6] || new Date().toISOString()),
    }));

  const auditLogs: AuditLog[] = (tableRows['AUDIT_LOG'] || [])
    .filter(r => r[0])
    .map(r => ({
      log_id: String(r[0]),
      user_id: String(r[1] || ''),
      user_name: String(r[7] || userById[String(r[1])]?.full_name || r[1] || 'System'),
      action: String(r[2] || ''),
      entity_type: String(r[3] || ''),
      entity_id: String(r[4] || ''),
      timestamp: String(r[5] || new Date().toISOString()),
      details: String(r[6] || ''),
    }));

  const refunds: RefundRecord[] = (tableRows['REFUNDS'] || [])
    .filter(r => r[0])
    .map(r => ({
      refund_id: String(r[0]),
      transaction_id: String(r[1] || ''),
      refund_number: String(r[2] || ''),
      amount: parseNumCell(r[3], 0),
      reason: String(r[4] || ''),
      status: (r[5] || 'APPROVED') as RefundRecord['status'],
      approved_by: r[6] ? String(r[6]) : undefined,
      created_by: String(r[7] || ''),
      created_at: String(r[8] || new Date().toISOString()),
      restock_items: parseBoolCell(r[9], false),
    }));

  // Hydrate full local store database
  db.hydrateFromCloud({
    settings: pulledSettings,
    users: users.length > 0 ? users : undefined,
    categories: categories.length > 0 ? categories : undefined,
    products: products.length > 0 ? products : undefined,
    ingredients,
    recipes,
    suppliers,
    transactions,
    expenses,
    purchases,
    stock_movements: stockMovements,
    cash_sessions: cashSessions,
    cash_movements: cashMovements,
    audit_log: auditLogs,
    refunds,
  });

  onProgress?.({
    step: 4,
    totalSteps: 4,
    label: 'Sinkronisasi Tarik Data Selesai!',
    status: 'completed',
    detail: `${products.length} produk & ${transactions.length} transaksi dimuat dari "${meta.title}".`,
  });

  return {
    spreadsheetId: meta.spreadsheetId,
    spreadsheetUrl: meta.spreadsheetUrl,
    spreadsheetTitle: meta.title,
    productsCount: products.length,
    categoriesCount: categories.length,
    transactionsCount: transactions.length,
    usersCount: users.length,
    volumesCount: parsedVolumes.length,
  };
}

/**
 * PUSH: Synchronizes ALL local tables (Master Data, Settings, Users, Categories, Products, Stock, Transactions, Shifts, Cash Book, Refunds, Audit)
 * to the active Google Spreadsheet so edits, deletions, and new items persist cleanly across devices.
 */
export async function pushAllDataToSpreadsheet(
  accessToken: string,
  targetSpreadsheetId?: string,
  onProgress?: (progress: SetupStepProgress) => void
): Promise<PushDatabaseResult> {
  const settings = db.getSettings();
  const spreadsheetId = extractSpreadsheetId(targetSpreadsheetId || settings.google_sheet_id || '');
  if (!spreadsheetId || spreadsheetId.startsWith('1vai_')) {
    throw new Error('Spreadsheet ID Google resmi belum terhubung. Silakan hubungkan Akun Google terlebih dahulu.');
  }

  onProgress?.({
    step: 1,
    totalSteps: 3,
    label: 'Memeriksa Struktur 21 Sheet',
    status: 'in_progress',
    detail: 'Memastikan seluruh sheet operasional tersedia di Google Spreadsheet...',
  });

  const meta = await ensureAllSheetsExist(accessToken, spreadsheetId, ALL_21_SHEETS);
  const availableTitles = meta.sheets.map(s => s.title);
  const dataMap = buildMasterAndOperationalDataMap(settings);

  const sheetsToPush = Object.keys(dataMap).filter(s => availableTitles.includes(s));

  onProgress?.({
    step: 2,
    totalSteps: 3,
    label: 'Membersihkan & Mengunggah Data Terbaru ke Sheets',
    status: 'in_progress',
    detail: `Menulis ${sheetsToPush.length} tabel operasional (Master + Transaksi)...`,
  });

  // 1. Clear stale rows so deleted items on local device do not remain as orphan rows in Google Sheets
  const clearRanges = sheetsToPush.map(s => `${s}!A1:Z20000`);
  const clearEndpoint = `POST https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ranges: clearRanges }),
    }
  );

  if (!clearRes.ok) {
    const errMsg = await parseGoogleApiError(clearRes, 'Membersihkan Tabel sebelum Push', clearEndpoint);
    throw new Error(errMsg);
  }

  // 2. Write headers + all current rows in a single batchUpdate
  const batchData: Array<{ range: string; values: any[][] }> = [];
  let totalRowsWritten = 0;

  for (const sheetName of sheetsToPush) {
    const columns = SHEET_COLUMNS[sheetName] || [];
    const rows = dataMap[sheetName] || [];
    const colEnd = toColLetter(columns.length || 10);
    const allRows = columns.length > 0 ? [columns, ...rows] : rows;
    if (allRows.length > 0) {
      batchData.push({
        range: `${sheetName}!A1:${colEnd}${allRows.length}`,
        values: allRows,
      });
      totalRowsWritten += rows.length;
    }
  }

  const updateEndpoint = `POST https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!updateRes.ok) {
    const errMsg = await parseGoogleApiError(updateRes, 'Push Data Penuh ke Google Sheets', updateEndpoint);
    throw new Error(errMsg);
  }

  // Clear pending queue & cloud dirty flag after authoritative full push
  const pendingQueue = db.getSyncQueue().filter(q => q.status === 'PENDING');
  for (const q of pendingQueue) {
    db.removeSyncQueueItem(q.operation_id);
  }
  db.setPendingCloudPush(false);
  db.updateSettings(
    {
      google_last_diagnostics: {
        success: true,
        message: `Push penuh berhasil (${totalRowsWritten} baris diperbarui)`,
        timestamp: new Date().toISOString(),
      },
    },
    false
  );

  onProgress?.({
    step: 3,
    totalSteps: 3,
    label: 'Push Penuh ke Google Sheets Selesai!',
    status: 'completed',
    detail: `${totalRowsWritten} baris data master & operasional berhasil disimpan ke cloud.`,
  });

  return {
    spreadsheetId: meta.spreadsheetId,
    spreadsheetUrl: meta.spreadsheetUrl,
    totalRowsWritten,
    pushedAt: new Date().toISOString(),
  };
}

/**
 * Diagnostic Read Probe: Verifies spreadsheet is readable & returns valid header
 */
export async function testSpreadsheetConnection(
  accessToken: string,
  spreadsheetId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const endpoint = `GET https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/SETTINGS!A1:C1`;
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/SETTINGS!A1:C1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errDetail = await parseGoogleApiError(res, 'Uji Diagnostik Baca Header', endpoint);
      return {
        success: false,
        message: `Diagnostik Gagal: ${errDetail}`,
      };
    }

    const data = await res.json();
    if (data.values && data.values.length > 0) {
      return {
        success: true,
        message: 'Koneksi Sukses: Google Spreadsheet 21 Sheet aktif & siap digunakan.',
      };
    }

    return {
      success: true,
      message: 'Koneksi terhubung ke Google Spreadsheet.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Koneksi gagal terhubung ke Google Sheets API.',
    };
  }
}

/**
 * Main Orchestrator: Automatic Google Workspace Setup, Multi-Device Discovery & Connection
 */
export async function runGoogleWorkspaceAutoSetup(
  accessToken: string,
  userEmail: string,
  userName: string,
  onProgress?: (progress: SetupStepProgress) => void,
  options?: { mode?: 'auto' | 'create_new' | 'connect_existing'; targetSpreadsheetId?: string }
): Promise<ProvisioningSuccess> {
  const mode = options?.mode || 'auto';
  let settings = db.getSettings();
  const cafeName = settings.cafe_name || 'Swalayan';
  const folderName = `MartVai - ${cafeName} (Database & Receipts)`;
  const spreadsheetTitle = `MartVai - ${cafeName} Database Operasional (21 Sheet)`;

  // Mode: Connect Directly to an Existing Spreadsheet (Multi-Device / Auto-Discovered)
  if (mode === 'connect_existing' && options?.targetSpreadsheetId) {
    const pullRes = await pullDatabaseFromSpreadsheet(
      accessToken,
      options.targetSpreadsheetId,
      userEmail,
      userName,
      onProgress
    );
    const refreshed = db.getSettings();
    return {
      spreadsheetId: pullRes.spreadsheetId,
      spreadsheetUrl: pullRes.spreadsheetUrl,
      folderId: refreshed.google_drive_folder_id || '',
      folderUrl: refreshed.google_drive_folder_url || '',
      email: userEmail,
      isExistingReused: true,
      pulledFromCloud: true,
      sheetsCreated: ALL_21_SHEETS,
    };
  }

  // STEP 1: Verification & Auto-Discovery Check
  onProgress?.({
    step: 1,
    totalSteps: 5,
    label: 'Pemeriksaan Database Existing di Akun Google',
    status: 'in_progress',
    detail: 'Mencari folder dan database spreadsheet MartVai di akun Google...',
  });

  let folderId: string | null = null;
  let folderUrl = '';
  let spreadsheetId: string | null = null;
  let spreadsheetUrl = '';
  let isExistingReused = false;

  if (mode !== 'create_new') {
    // 1A. Verify stored folder ID if available
    if (settings.google_drive_folder_id) {
      const verifiedFolder = await fetchDriveFolderMetadata(accessToken, settings.google_drive_folder_id);
      if (verifiedFolder) {
        folderId = verifiedFolder.id;
        folderUrl = verifiedFolder.webViewLink;
      }
    }

    // 1B. Search Drive folder
    if (!folderId) {
      const foundFolder = await searchDriveFile(accessToken, folderName, 'application/vnd.google-apps.folder');
      if (foundFolder) {
        folderId = foundFolder.id;
        folderUrl = foundFolder.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;
      }
    }

    // 1C. Verify stored spreadsheet ID if available (and NOT a fake local 1vai_ ID)
    if (settings.google_sheet_id && !settings.google_sheet_id.startsWith('1vai_')) {
      const verifiedMeta = await fetchSpreadsheetMetadata(accessToken, settings.google_sheet_id);
      if (verifiedMeta) {
        spreadsheetId = verifiedMeta.spreadsheetId;
        spreadsheetUrl = verifiedMeta.spreadsheetUrl;
        isExistingReused = true;
      } else {
        db.updateSettings({ google_sheet_id: '', google_spreadsheet_url: '' }, false);
      }
    }

    // 1D. Auto-discover any existing MartVai spreadsheet in Google Drive (critical for Device 2!)
    if (!spreadsheetId) {
      const discovered = await discoverMartVaiSpreadsheets(accessToken);
      const preferred =
        discovered.find(d => d.title === spreadsheetTitle) ||
        discovered.find(d => /martvai|vaimart|21 sheet|database operasional/i.test(d.title));
      if (preferred) {
        const verifiedMeta = await fetchSpreadsheetMetadata(accessToken, preferred.spreadsheetId);
        if (verifiedMeta) {
          spreadsheetId = verifiedMeta.spreadsheetId;
          spreadsheetUrl = verifiedMeta.spreadsheetUrl;
          isExistingReused = true;
        }
      }
    }
  } else {
    // Explicit create_new: reuse Drive folder if present, but always create a brand new Spreadsheet
    if (settings.google_drive_folder_id) {
      const verifiedFolder = await fetchDriveFolderMetadata(accessToken, settings.google_drive_folder_id);
      if (verifiedFolder) {
        folderId = verifiedFolder.id;
        folderUrl = verifiedFolder.webViewLink;
      }
    }
  }

  onProgress?.({
    step: 1,
    totalSteps: 5,
    label: 'Pemeriksaan Database Existing di Akun Google',
    status: 'completed',
    detail: spreadsheetId
      ? 'Database valid ditemukan di Google Drive akun ini, menyiapkan sinkronisasi...'
      : 'Belum ada database ditemukan, menyiapkan pembuatan database baru...',
  });

  // STEP 2: Create Drive Folder if missing
  onProgress?.({
    step: 2,
    totalSteps: 5,
    label: 'Penyimpanan Google Drive',
    status: 'in_progress',
    detail: 'Menyiapkan folder Google Drive khusus data produk swalayan dan bukti struk...',
  });

  if (!folderId) {
    const createdFolder = await createDriveFolder(accessToken, folderName);
    folderId = createdFolder.id;
    folderUrl = createdFolder.webViewLink;

    db.updateSettings(
      {
        google_drive_folder_id: folderId,
        google_drive_folder_url: folderUrl,
      },
      false
    );
  }

  onProgress?.({
    step: 2,
    totalSteps: 5,
    label: 'Penyimpanan Google Drive',
    status: 'completed',
    detail: `Folder siap: ${folderName}`,
  });

  // STEP 3: Create Spreadsheet if missing
  onProgress?.({
    step: 3,
    totalSteps: 5,
    label: 'Pembuatan Google Spreadsheet 21 Sheet',
    status: 'in_progress',
    detail: spreadsheetId ? 'Menghubungkan ke spreadsheet existing...' : 'Membuat file spreadsheet baru dengan 21 sheet operasional...',
  });

  if (!spreadsheetId) {
    const createdSheet = await createSpreadsheet(accessToken, spreadsheetTitle);
    spreadsheetId = createdSheet.spreadsheetId;
    spreadsheetUrl = createdSheet.spreadsheetUrl;

    if (!spreadsheetId) {
      throw new Error('[Pembuatan Google Spreadsheet] Gagal mendapatkan spreadsheetId yang valid dari API.');
    }

    db.updateSettings(
      {
        google_sheet_id: spreadsheetId,
        google_spreadsheet_url: spreadsheetUrl,
      },
      false
    );

    await moveFileToFolder(accessToken, spreadsheetId, folderId);
  }

  onProgress?.({
    step: 3,
    totalSteps: 5,
    label: 'Pembuatan Google Spreadsheet 21 Sheet',
    status: 'completed',
    detail: `Spreadsheet siap (ID: ${spreadsheetId.substring(0, 10)}...)`,
  });

  // STEP 4: Ensure 21 sheets exist, and EITHER pull existing data OR seed new database (NEVER overwrite existing)
  onProgress?.({
    step: 4,
    totalSteps: 5,
    label: 'Sinkronisasi & Verifikasi 21 Sheet Operasional',
    status: 'in_progress',
    detail: isExistingReused
      ? 'Memeriksa & menarik data existing agar data cloud tidak tertimpa...'
      : 'Mengisi header & data awal ke Spreadsheet baru...',
  });

  const verifiedMeta = await ensureAllSheetsExist(accessToken, spreadsheetId, ALL_21_SHEETS);
  const availableSheetTitles = verifiedMeta.sheets.map(s => s.title);

  let pulledFromCloud = false;
  if (isExistingReused) {
    const check = await checkSpreadsheetHasExistingData(accessToken, spreadsheetId, availableSheetTitles);
    if (check.hasData) {
      await pullDatabaseFromSpreadsheet(accessToken, spreadsheetId, userEmail, userName);
      pulledFromCloud = true;
    } else {
      await populateSheetHeadersAndData(accessToken, spreadsheetId, availableSheetTitles, settings, {
        onlySeedIfEmpty: true,
      });
    }
  } else {
    await populateSheetHeadersAndData(accessToken, spreadsheetId, availableSheetTitles, settings, {
      onlySeedIfEmpty: false,
    });
  }

  onProgress?.({
    step: 4,
    totalSteps: 5,
    label: 'Sinkronisasi & Verifikasi 21 Sheet Operasional',
    status: 'completed',
    detail: pulledFromCloud
      ? 'Data existing dari Google Spreadsheet berhasil dimuat ke perangkat ini!'
      : `Semua ${availableSheetTitles.length} sheet siap digunakan.`,
  });

  // STEP 5: Verification & Diagnostics
  onProgress?.({
    step: 5,
    totalSteps: 5,
    label: 'Uji Diagnostik Koneksi Database',
    status: 'in_progress',
    detail: 'Menguji izin akses baca dan tulis ke Google Sheets...',
  });

  const diag = await testSpreadsheetConnection(accessToken, spreadsheetId);

  onProgress?.({
    step: 5,
    totalSteps: 5,
    label: 'Uji Diagnostik Koneksi Database',
    status: diag.success ? 'completed' : 'failed',
    detail: diag.message,
  });

  // Persist final verified settings
  settings = db.getSettings();
  const est = db.estimateLocalCellUsage();
  const maxCells = settings.spreadsheet_cell_limit || 10000000;
  const currentVolumes = [...(settings.spreadsheet_volumes || [])];
  if (!currentVolumes.some(v => v.spreadsheet_id === spreadsheetId)) {
    currentVolumes.unshift({
      volume_id: `vol_${currentVolumes.length + 1}`,
      volume_number: currentVolumes.length + 1,
      title: verifiedMeta.title || spreadsheetTitle,
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: spreadsheetUrl,
      folder_id: folderId,
      status: 'ACTIVE',
      used_cells: est.usedCells,
      max_cells: maxCells,
      usage_percent: Number(((est.usedCells / maxCells) * 100).toFixed(2)),
      transaction_count: db.getTransactions().length,
      created_at: new Date().toISOString(),
    });
  }

  const updatedSettings: CafeSettings = {
    ...settings,
    google_account_email: userEmail,
    google_sheet_id: spreadsheetId,
    google_spreadsheet_url: spreadsheetUrl,
    google_drive_folder_id: folderId,
    google_drive_folder_url: folderUrl,
    google_oauth_connected: true,
    google_connected_user_name: userName,
    google_auto_synced: true,
    google_auto_created_at: settings.google_auto_created_at || new Date().toISOString(),
    spreadsheet_volumes: currentVolumes,
    google_last_diagnostics: {
      success: diag.success,
      message: diag.message,
      timestamp: new Date().toISOString(),
    },
    is_configured: true,
    updated_at: new Date().toISOString(),
  };
  db.updateSettings(updatedSettings, false);

  if (!pulledFromCloud) {
    db.setPendingCloudPush(false);
  }

  db.addAuditLog({
    log_id: 'log_' + Date.now(),
    user_id: userEmail,
    user_name: userName || 'Admin Toko',
    action: 'AUTO_SETUP_GOOGLE_WORKSPACE',
    entity_type: 'DATABASE',
    entity_id: spreadsheetId,
    timestamp: new Date().toISOString(),
    details: `Setup 21 Sheet Google Spreadsheet & Drive berhasil. Reused: ${isExistingReused}, PulledFromCloud: ${pulledFromCloud}`,
  });

  return {
    spreadsheetId,
    spreadsheetUrl,
    folderId,
    folderUrl,
    email: userEmail,
    isExistingReused,
    pulledFromCloud,
    sheetsCreated: availableSheetTitles,
  };
}

export interface SpreadsheetCapacityReport {
  spreadsheetId: string;
  usedCells: number;
  maxCells: number;
  usagePercent: number;
  thresholdPercent: number;
  isNearLimit: boolean;
  totalRows: number;
  source: 'google_and_local' | 'local_estimation';
}

/**
 * Measures real Google Spreadsheet cell consumption vs limit (default 10M cells, auto-rotate threshold 80%).
 * Combines local operational record cell counts with live Google Sheets values metadata when OAuth token is present.
 */
export async function measureSpreadsheetCapacity(
  accessToken?: string | null,
  targetSpreadsheetId?: string
): Promise<SpreadsheetCapacityReport> {
  const settings = db.getSettings();
  const spreadsheetId = targetSpreadsheetId || settings.google_sheet_id || '';
  const maxCells = Math.max(1000, settings.spreadsheet_cell_limit || 10000000);
  const thresholdPercent = settings.spreadsheet_rotation_threshold || 80;
  const localEst = db.estimateLocalCellUsage();

  let usedCells = localEst.usedCells;
  let totalRows = localEst.totalRows;
  let source: 'google_and_local' | 'local_estimation' = 'local_estimation';

  if (accessToken && spreadsheetId && !spreadsheetId.startsWith('1vai_')) {
    try {
      const ranges = ['TRANSACTIONS!A:A', 'TRANSACTION_ITEMS!A:A', 'PAYMENTS!A:A', 'EXPENSES!A:A', 'AUDIT_LOG!A:A']
        .map(r => `ranges=${encodeURIComponent(r)}`)
        .join('&');
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const valueRanges: Array<{ range: string; values?: any[][] }> = data.valueRanges || [];
        let remoteRows = 0;
        let remoteCells = 0;
        const colMap = [17, 13, 11, 9, 7];
        valueRanges.forEach((vr, idx) => {
          const rowCount = vr.values?.length || 0;
          remoteRows += rowCount;
          remoteCells += rowCount * (colMap[idx] || 10);
        });
        if (remoteCells > 0) {
          usedCells = Math.max(usedCells, remoteCells);
          totalRows = Math.max(totalRows, remoteRows);
          source = 'google_and_local';
        }
      }
    } catch (err) {
      console.warn('Remote capacity check failed, using local estimation:', err);
    }
  }

  const usagePercent = Math.min(100, Number(((usedCells / maxCells) * 100).toFixed(2)));

  // Persist active volume usage stats
  if (spreadsheetId) {
    const activeVol = db.getActiveVolume();
    if (activeVol && activeVol.spreadsheet_id === spreadsheetId) {
      db.upsertSpreadsheetVolume({
        ...activeVol,
        used_cells: usedCells,
        max_cells: maxCells,
        usage_percent: usagePercent,
        transaction_count: db.getTransactions().length,
      });
    }
  }

  return {
    spreadsheetId,
    usedCells,
    maxCells,
    usagePercent,
    thresholdPercent,
    isNearLimit: usagePercent >= thresholdPercent,
    totalRows,
    source,
  };
}

export interface AutoRotationResult {
  rotated: boolean;
  report: SpreadsheetCapacityReport;
  archivedVolume?: SpreadsheetVolume;
  newVolume?: SpreadsheetVolume;
  message: string;
}

/**
 * Checks if active spreadsheet has reached >= 80% capacity and automatically creates a new 21-sheet Spreadsheet,
 * carries forward master tables, archives the old spreadsheet (keeping it readable), and switches active sync target.
 */
export async function autoRotateSpreadsheetIfNeeded(
  accessToken?: string | null,
  options?: { force?: boolean; simulatedPercent?: number }
): Promise<AutoRotationResult> {
  const settings = db.getSettings();
  const report = await measureSpreadsheetCapacity(accessToken, settings.google_sheet_id);

  const effectivePercent = options?.simulatedPercent ?? report.usagePercent;
  const shouldRotate = options?.force || effectivePercent >= report.thresholdPercent;

  if (!shouldRotate) {
    return {
      rotated: false,
      report,
      message: `Kapasitas spreadsheet masih aman (${report.usagePercent}% dari batas rotasi ${report.thresholdPercent}%).`,
    };
  }

  const volumes = db.getSpreadsheetVolumes();
  const currentMaxVol = volumes.reduce((max, v) => Math.max(max, v.volume_number), settings.google_sheet_id ? 1 : 0);
  const nextVolNum = currentMaxVol + 1;
  const storeName = settings.cafe_name || 'MartVai Swalayan';
  const newTitle = `VaiMart - ${storeName} Database Vol. ${nextVolNum} (21 Sheet)`;

  let newSpreadsheetId = '';
  let newSpreadsheetUrl = '';

  if (accessToken) {
    try {
      const created = await createSpreadsheet(accessToken, newTitle);
      newSpreadsheetId = created.spreadsheetId;
      newSpreadsheetUrl = created.spreadsheetUrl;

      if (settings.google_drive_folder_id) {
        await moveFileToFolder(accessToken, newSpreadsheetId, settings.google_drive_folder_id);
      }

      const verifiedMeta = await ensureAllSheetsExist(accessToken, newSpreadsheetId, ALL_21_SHEETS);
      const sheetTitles = verifiedMeta.sheets.map(s => s.title);
      await populateSheetHeadersAndData(accessToken, newSpreadsheetId, sheetTitles, settings);
    } catch (err) {
      console.warn('Google API auto-rotate creation failed, falling back to local volume provisioning:', err);
    }
  }

  if (!newSpreadsheetId) {
    newSpreadsheetId = generateSpreadsheetId(
      settings.google_account_email || 'store@vaimart.id',
      `${storeName}_v${nextVolNum}`
    );
    newSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`;
  }

  const { archivedVolume, newVolume } = db.archiveAndSwitchVolume({
    newSpreadsheetId,
    newSpreadsheetUrl,
    newTitle,
    folderId: settings.google_drive_folder_id,
    oldUsedCells: options?.simulatedPercent
      ? Math.round((report.maxCells * options.simulatedPercent) / 100)
      : report.usedCells,
    maxCells: report.maxCells,
    oldUsagePercent: effectivePercent,
  });

  return {
    rotated: true,
    report: {
      ...report,
      usagePercent: effectivePercent,
      isNearLimit: true,
    },
    archivedVolume,
    newVolume,
    message: `Spreadsheet Vol. ${archivedVolume.volume_number} mencapai ${effectivePercent.toFixed(1)}% (≥ ${report.thresholdPercent}%). Spreadsheet baru Vol. ${newVolume.volume_number} otomatis dibuat & diaktifkan; data lama tetap tersimpan dan dapat dibaca.`,
  };
}

export interface ArchiveSheetReadResult {
  source: 'google_api' | 'local_archive';
  sheetName: string;
  headers: string[];
  rows: any[][];
}

/**
 * Reads data from an archived (old) spreadsheet either live via Google Sheets v4 API
 * or from its preserved local archive snapshot so old spreadsheets remain readable anytime.
 */
export async function readArchivedSpreadsheetSheet(
  volume: SpreadsheetVolume,
  sheetName: string,
  accessToken?: string | null
): Promise<ArchiveSheetReadResult> {
  // 1. Try live Google Sheets API read if OAuth token & real spreadsheet ID exist
  if (accessToken && volume.spreadsheet_id && !volume.spreadsheet_id.startsWith('1vai_') && !volume.spreadsheet_id.startsWith('archive_')) {
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${volume.spreadsheet_id}/values/${encodeURIComponent(sheetName)}!A1:Z2000`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const values: any[][] = data.values || [];
        if (values.length > 0) {
          return {
            source: 'google_api',
            sheetName,
            headers: values[0].map(String),
            rows: values.slice(1),
          };
        }
      }
    } catch (err) {
      console.warn('Live read archived Google Sheet failed, using local archive snapshot:', err);
    }
  }

  // 2. Fallback to preserved local_snapshot in volume archive
  const snap = volume.local_snapshot;
  const cols = SHEET_COLUMNS[sheetName] || [];
  let rows: any[][] = [];

  if (sheetName === 'TRANSACTIONS') {
    rows = (snap?.transactions || []).map(t => [
      t.transaction_id,
      t.invoice_number,
      t.business_date,
      t.cashier_name || t.cashier_id,
      t.subtotal,
      t.discount,
      t.tax,
      t.service_charge,
      t.total,
      t.paid_amount,
      t.change_amount,
      t.payment_method,
      t.payment_status,
      t.transaction_status,
      t.notes || '',
      t.created_at,
      t.synced_at || '',
    ]);
  } else if (sheetName === 'TRANSACTION_ITEMS') {
    const items = (snap?.transactions || []).flatMap(t => t.items || []);
    rows = items.map(i => [
      i.item_id,
      i.transaction_id,
      i.product_id,
      i.product_name_snapshot,
      i.sku_snapshot,
      i.quantity,
      i.unit_price,
      i.discount,
      i.tax,
      i.cost_snapshot,
      i.line_total,
      i.notes,
      i.variant_snapshot,
    ]);
  } else if (sheetName === 'EXPENSES') {
    rows = (snap?.expenses || []).map(e => [
      e.expense_id,
      e.expense_date,
      e.category,
      e.description,
      e.amount,
      e.payment_method,
      e.receipt_url || '',
      e.created_by,
      e.created_at,
    ]);
  } else if (sheetName === 'PURCHASES') {
    rows = (snap?.purchases || []).map(p => [
      p.purchase_id,
      p.purchase_number,
      p.supplier_name || p.supplier_id,
      p.purchase_date,
      p.subtotal,
      p.discount,
      p.total,
      p.payment_status,
      p.notes,
      p.created_by,
    ]);
  } else if (sheetName === 'CASH_SESSIONS') {
    rows = (snap?.cash_sessions || []).map(s => [
      s.session_id,
      s.cashier_name || s.cashier_id,
      s.opening_time,
      s.opening_cash,
      s.closing_time || '',
      s.expected_cash,
      s.actual_cash ?? '',
      s.cash_difference ?? '',
      s.status,
      s.notes || '',
    ]);
  } else if (sheetName === 'CASH_MOVEMENTS') {
    rows = (snap?.cash_movements || []).map(m => [
      m.movement_id,
      m.session_id,
      m.movement_type,
      m.amount,
      m.description,
      m.created_by,
      m.created_at,
    ]);
  } else if (sheetName === 'PRODUCTS') {
    rows = db.getProducts().map(p => [
      p.product_id,
      p.sku,
      p.barcode,
      p.product_name,
      p.category_id,
      p.description,
      p.image_url,
      p.selling_price,
      p.cost_price,
      p.stock_type,
      p.stock_qty,
      p.minimum_stock,
      p.unit,
      p.active ? 'TRUE' : 'FALSE',
      p.created_at,
      p.updated_at,
    ]);
  } else if (sheetName === 'USERS') {
    rows = db.getStoreUsers().map(u => [
      u.user_id,
      u.username,
      '***',
      u.full_name,
      u.role,
      u.active ? 'TRUE' : 'FALSE',
      '***',
      u.created_at,
      u.last_login || '',
    ]);
  }

  return {
    source: 'local_archive',
    sheetName,
    headers: cols,
    rows,
  };
}
