/**
 * MartVai — Google Apps Script Backend & Google Sheets Auto-Setup
 * 
 * Versi: 1.0.0
 * Deskripsi: Backend REST API untuk POS MartVai Swalayan dengan 21 Tabel Google Sheets,
 * sinkronisasi offline-to-online, upload bukti ke Google Drive, dan penguncian transaksi atomik.
 * 
 * Petunjuk Deploy:
 * 1. Buka https://script.google.com/
 * 2. Buat Project Baru: "MartVai Backend API"
 * 3. Salin seluruh isi file ini ke editor Code.gs
 * 4. Klik "Deploy" -> "New deployment"
 * 5. Pilih tipe "Web app"
 * 6. Execute as: "Me" (email Anda)
 * 7. Who has access: "Anyone" (agar POS bisa terhubung via fetch JSON)
 * 8. Berikan izin akses Google Drive & Sheets saat diminta
 * 9. Salin URL Web App yang dihasilkan dan tempelkan pada menu Pengaturan MartVai
 */

// Konstanta Nama Sheet
var SHEETS = {
  SETTINGS: 'SETTINGS',
  USERS: 'USERS',
  CATEGORIES: 'CATEGORIES',
  PRODUCTS: 'PRODUCTS',
  PRODUCT_VARIANTS: 'PRODUCT_VARIANTS',
  RECIPES: 'RECIPES',
  INGREDIENTS: 'INGREDIENTS',
  TRANSACTIONS: 'TRANSACTIONS',
  TRANSACTION_ITEMS: 'TRANSACTION_ITEMS',
  PAYMENTS: 'PAYMENTS',
  EXPENSES: 'EXPENSES',
  PURCHASES: 'PURCHASES',
  PURCHASE_ITEMS: 'PURCHASE_ITEMS',
  STOCK_MOVEMENTS: 'STOCK_MOVEMENTS',
  SUPPLIERS: 'SUPPLIERS',
  CASH_SESSIONS: 'CASH_SESSIONS',
  CASH_MOVEMENTS: 'CASH_MOVEMENTS',
  AUDIT_LOG: 'AUDIT_LOG',
  DAILY_SUMMARY: 'DAILY_SUMMARY',
  SYNC_QUEUE: 'SYNC_QUEUE',
  REFUNDS: 'REFUNDS'
};

// Definisi Kolom Header untuk Seluruh 21 Sheet
var SHEET_HEADERS = {
  SETTINGS: ['setting_key', 'setting_value', 'updated_at'],
  USERS: ['user_id', 'username', 'password_hash', 'full_name', 'role', 'active', 'pin_hash', 'created_at', 'last_login'],
  CATEGORIES: ['category_id', 'category_name', 'description', 'image_url', 'active', 'sort_order', 'created_at'],
  PRODUCTS: ['product_id', 'sku', 'barcode', 'product_name', 'category_id', 'description', 'image_url', 'selling_price', 'cost_price', 'stock_type', 'stock_qty', 'minimum_stock', 'unit', 'active', 'created_at', 'updated_at'],
  PRODUCT_VARIANTS: ['variant_id', 'product_id', 'variant_name', 'additional_price', 'sku', 'barcode', 'active'],
  RECIPES: ['recipe_id', 'product_id', 'ingredient_id', 'quantity_used', 'unit', 'created_at'],
  INGREDIENTS: ['ingredient_id', 'ingredient_name', 'unit', 'stock_qty', 'minimum_stock', 'cost_per_unit', 'supplier_id', 'updated_at'],
  TRANSACTIONS: ['transaction_id', 'invoice_number', 'business_date', 'cashier_id', 'subtotal', 'discount', 'tax', 'service_charge', 'total', 'paid_amount', 'change_amount', 'payment_method', 'payment_status', 'transaction_status', 'notes', 'created_at', 'synced_at'],
  TRANSACTION_ITEMS: ['item_id', 'transaction_id', 'product_id', 'product_name_snapshot', 'sku_snapshot', 'quantity', 'unit_price', 'discount', 'tax', 'cost_snapshot', 'line_total', 'notes', 'variant_snapshot'],
  PAYMENTS: ['payment_id', 'transaction_id', 'provider', 'payment_method', 'amount', 'external_reference', 'provider_status', 'paid_at', 'verified_by', 'idempotency_key', 'created_at'],
  EXPENSES: ['expense_id', 'expense_date', 'category', 'description', 'amount', 'payment_method', 'receipt_url', 'created_by', 'created_at'],
  PURCHASES: ['purchase_id', 'purchase_number', 'supplier_id', 'purchase_date', 'subtotal', 'discount', 'total', 'payment_status', 'notes', 'created_by'],
  PURCHASE_ITEMS: ['purchase_item_id', 'purchase_id', 'ingredient_id', 'product_id', 'quantity', 'unit_cost', 'line_total'],
  STOCK_MOVEMENTS: ['movement_id', 'movement_date', 'item_type', 'item_id', 'movement_type', 'quantity_in', 'quantity_out', 'balance_after', 'reference_id', 'notes', 'created_by'],
  SUPPLIERS: ['supplier_id', 'supplier_name', 'phone', 'address', 'email', 'notes', 'active'],
  CASH_SESSIONS: ['session_id', 'cashier_id', 'opening_time', 'opening_cash', 'closing_time', 'expected_cash', 'actual_cash', 'cash_difference', 'status', 'notes'],
  CASH_MOVEMENTS: ['movement_id', 'session_id', 'movement_type', 'amount', 'description', 'created_by', 'created_at'],
  AUDIT_LOG: ['log_id', 'user_id', 'action', 'entity_type', 'entity_id', 'timestamp', 'details'],
  DAILY_SUMMARY: ['business_date', 'gross_sales', 'discounts', 'refunds', 'net_sales', 'tax', 'service_charge', 'cash_sales', 'qris_sales', 'other_sales', 'expenses', 'cogs', 'gross_profit', 'net_profit', 'transaction_count'],
  SYNC_QUEUE: ['operation_id', 'device_id', 'local_transaction_id', 'operation_type', 'payload_json', 'status', 'retry_count', 'created_at', 'synced_at', 'error_message'],
  REFUNDS: ['refund_id', 'transaction_id', 'refund_number', 'amount', 'reason', 'status', 'approved_by', 'created_by', 'created_at']
};

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  
  if (action === 'ping') {
    return jsonResponse({
      success: true,
      message: 'MartVai Google Apps Script API is active!',
      timestamp: new Date().toISOString()
    });
  }
  
  if (action === 'getData') {
    return handleGetData(e.parameter);
  }
  
  return jsonResponse({ success: false, error: 'Unknown action: ' + action });
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(10000); // 10-second timeout lock for atomic operations
  
  if (!hasLock) {
    return jsonResponse({
      success: false,
      error: 'Server sedang sibuk memproses transaksi lain. Silakan coba kembali.'
    });
  }
  
  try {
    var rawData = e.postData ? e.postData.contents : '';
    var payload = {};
    if (rawData) {
      payload = JSON.parse(rawData);
    }
    
    var action = payload.action;
    
    if (action === 'setupDatabase') {
      return handleSetupDatabase(payload);
    } else if (action === 'saveTransaction') {
      return handleSaveTransaction(payload);
    } else if (action === 'syncBatch') {
      return handleSyncBatch(payload);
    } else if (action === 'saveExpense') {
      return handleSaveExpense(payload);
    } else if (action === 'saveStockMovement') {
      return handleSaveStockMovement(payload);
    } else if (action === 'saveCashSession') {
      return handleSaveCashSession(payload);
    } else if (action === 'uploadMedia') {
      return handleUploadMedia(payload);
    } else {
      return jsonResponse({ success: false, error: 'Aksi tidak dikenal: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Otomatis Membuat Spreadsheet & 21 Sheet Lengkap
 */
function handleSetupDatabase(payload) {
  var cafeName = payload.cafe_name || 'MartVai Swalayan';
  var spreadsheet;
  
  if (payload.spreadsheet_id) {
    spreadsheet = SpreadsheetApp.openById(payload.spreadsheet_id);
  } else {
    spreadsheet = SpreadsheetApp.create(cafeName + ' — Database POS & Pembukuan');
  }
  
  var ssId = spreadsheet.getId();
  var ssUrl = spreadsheet.getUrl();
  
  // Buat folder Google Drive khusus dokumen dan bukti struk jika belum ada
  var folderIterator = DriveApp.getFoldersByName(cafeName + ' Media');
  var mediaFolder;
  if (folderIterator.hasNext()) {
    mediaFolder = folderIterator.next();
  } else {
    mediaFolder = DriveApp.createFolder(cafeName + ' Media');
  }
  
  // Buat seluruh sheet sesuai spesifikasi
  for (var key in SHEET_HEADERS) {
    var sheetName = SHEETS[key];
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    
    // Set Header jika sheet masih kosong
    if (sheet.getLastRow() === 0) {
      var headers = SHEET_HEADERS[key];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.getRange(1, 1, 1, headers.length).setBackground('#2D1B14');
      sheet.getRange(1, 1, 1, headers.length).setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  }
  
  // Hapus Sheet default 'Sheet1' jika ada
  var defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > 1) {
    try { spreadsheet.deleteSheet(defaultSheet); } catch (e) {}
  }
  
  // Simpan pengaturan awal ke sheet SETTINGS
  var settingsSheet = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  var initialSettings = [
    ['cafe_name', cafeName, new Date().toISOString()],
    ['owner_name', payload.owner_name || 'Owner', new Date().toISOString()],
    ['address', payload.address || 'Jl. Raya Swalayan No. 1', new Date().toISOString()],
    ['phone', payload.phone || '08123456789', new Date().toISOString()],
    ['currency', 'IDR', new Date().toISOString()],
    ['timezone', 'Asia/Jakarta', new Date().toISOString()],
    ['tax_percentage', String(payload.tax_percentage || 10), new Date().toISOString()],
    ['service_charge_percentage', String(payload.service_charge || 5), new Date().toISOString()]
  ];
  
  initialSettings.forEach(function(row) {
    settingsSheet.appendRow(row);
  });
  
  // Tambah Admin Utama jika diberikan
  if (payload.admin_user) {
    var usersSheet = spreadsheet.getSheetByName(SHEETS.USERS);
    var u = payload.admin_user;
    usersSheet.appendRow([
      u.user_id || Utilities.getUuid(),
      u.username || 'admin',
      u.password_hash || '',
      u.full_name || 'Administrator',
      'ADMIN',
      true,
      u.pin_hash || '',
      new Date().toISOString(),
      ''
    ]);
  }
  
  return jsonResponse({
    success: true,
    message: 'Database Google Spreadsheet berhasil dibuat secara otomatis!',
    spreadsheet_id: ssId,
    spreadsheet_url: ssUrl,
    folder_id: mediaFolder.getId(),
    folder_url: mediaFolder.getUrl()
  });
}

/**
 * Simpan Transaksi Penjualan Lengkap
 */
function handleSaveTransaction(payload) {
  var ssId = payload.spreadsheet_id;
  var ss = getSpreadsheet(ssId);
  var tx = payload.transaction;
  
  if (!tx || !tx.transaction_id) {
    return jsonResponse({ success: false, error: 'Data transaksi tidak valid' });
  }
  
  var txSheet = ss.getSheetByName(SHEETS.TRANSACTIONS);
  var itemsSheet = ss.getSheetByName(SHEETS.TRANSACTION_ITEMS);
  var paySheet = ss.getSheetByName(SHEETS.PAYMENTS);
  var logSheet = ss.getSheetByName(SHEETS.AUDIT_LOG);
  
  // Cek duplikasi transaksi (Idempotensi)
  var data = txSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === tx.transaction_id) {
      return jsonResponse({
        success: true,
        message: 'Transaksi sudah ada sebelumnya (idempoten)',
        transaction_id: tx.transaction_id
      });
    }
  }
  
  // Tulis Header Transaksi
  txSheet.appendRow([
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
    new Date().toISOString()
  ]);
  
  // Tulis Rincian Item Transaksi
  if (tx.items && tx.items.length > 0) {
    tx.items.forEach(function(item) {
      itemsSheet.appendRow([
        item.item_id || Utilities.getUuid(),
        tx.transaction_id,
        item.product_id,
        item.product_name_snapshot,
        item.sku_snapshot || '',
        item.quantity,
        item.unit_price,
        item.discount || 0,
        item.tax || 0,
        item.cost_snapshot || 0,
        item.line_total,
        item.notes || '',
        item.variant_snapshot || ''
      ]);
    });
  }
  
  // Tulis Pembayaran
  paySheet.appendRow([
    Utilities.getUuid(),
    tx.transaction_id,
    tx.payment_method,
    tx.payment_method,
    tx.total,
    tx.invoice_number,
    'PAID',
    new Date().toISOString(),
    tx.cashier_id,
    tx.transaction_id,
    new Date().toISOString()
  ]);
  
  // Tulis Audit Log
  logSheet.appendRow([
    Utilities.getUuid(),
    tx.cashier_id,
    'CREATE_TRANSACTION',
    'TRANSACTIONS',
    tx.transaction_id,
    new Date().toISOString(),
    'Invoice: ' + tx.invoice_number + ', Total: Rp ' + tx.total
  ]);
  
  return jsonResponse({
    success: true,
    message: 'Transaksi berhasil disimpan ke Google Spreadsheet',
    transaction_id: tx.transaction_id
  });
}

/**
 * Sinkronisasi Batch Antrean Offline
 */
function handleSyncBatch(payload) {
  var items = payload.queue_items || [];
  var successCount = 0;
  var errors = [];
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    try {
      if (item.operation_type === 'CREATE_TRANSACTION') {
        var txData = JSON.parse(item.payload_json);
        handleSaveTransaction({
          spreadsheet_id: payload.spreadsheet_id,
          transaction: txData
        });
        successCount++;
      }
    } catch (e) {
      errors.push({ id: item.operation_id, error: e.toString() });
    }
  }
  
  return jsonResponse({
    success: true,
    synced_count: successCount,
    errors: errors
  });
}

/**
 * Simpan Pengeluaran Operasional
 */
function handleSaveExpense(payload) {
  var ss = getSpreadsheet(payload.spreadsheet_id);
  var sheet = ss.getSheetByName(SHEETS.EXPENSES);
  var exp = payload.expense;
  
  sheet.appendRow([
    exp.expense_id || Utilities.getUuid(),
    exp.expense_date,
    exp.category,
    exp.description,
    exp.amount,
    exp.payment_method || 'KAS_KASIR',
    exp.receipt_url || '',
    exp.created_by,
    new Date().toISOString()
  ]);
  
  return jsonResponse({ success: true, message: 'Pengeluaran berhasil dicatat' });
}

/**
 * Simpan Pergerakan Stok
 */
function handleSaveStockMovement(payload) {
  var ss = getSpreadsheet(payload.spreadsheet_id);
  var sheet = ss.getSheetByName(SHEETS.STOCK_MOVEMENTS);
  var m = payload.movement;
  
  sheet.appendRow([
    m.movement_id || Utilities.getUuid(),
    m.movement_date,
    m.item_type,
    m.item_id,
    m.movement_type,
    m.quantity_in || 0,
    m.quantity_out || 0,
    m.balance_after || 0,
    m.reference_id || '',
    m.notes || '',
    m.created_by || ''
  ]);
  
  return jsonResponse({ success: true, message: 'Pergerakan stok dicatat' });
}

/**
 * Simpan Sesi Shift Kasir
 */
function handleSaveCashSession(payload) {
  var ss = getSpreadsheet(payload.spreadsheet_id);
  var sheet = ss.getSheetByName(SHEETS.CASH_SESSIONS);
  var s = payload.session;
  
  sheet.appendRow([
    s.session_id,
    s.cashier_id,
    s.opening_time,
    s.opening_cash,
    s.closing_time || '',
    s.expected_cash || 0,
    s.actual_cash || 0,
    s.cash_difference || 0,
    s.status,
    s.notes || ''
  ]);
  
  return jsonResponse({ success: true, message: 'Shift kasir berhasil disimpan' });
}

/**
 * Upload Foto ke Google Drive
 */
function handleUploadMedia(payload) {
  var folderId = payload.folder_id;
  var folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
  var base64Data = payload.base64_data;
  var fileName = payload.file_name || ('produk_' + new Date().getTime() + '.jpg');
  var contentType = payload.content_type || 'image/jpeg';
  
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, contentType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return jsonResponse({
    success: true,
    file_id: file.getId(),
    file_url: 'https://drive.google.com/uc?export=view&id=' + file.getId()
  });
}

/**
 * Ambil Data dari Spreadsheet
 */
function handleGetData(params) {
  var ss = getSpreadsheet(params.spreadsheet_id);
  var sheetName = params.sheet_name || SHEETS.PRODUCTS;
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return jsonResponse({ success: false, error: 'Sheet tidak ditemukan: ' + sheetName });
  }
  
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return jsonResponse({ success: true, headers: values[0] || [], rows: [] });
  }
  
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    rows.push(obj);
  }
  
  return jsonResponse({ success: true, headers: headers, rows: rows });
}

// Helper: Buka Spreadsheet
function getSpreadsheet(id) {
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Helper: Format JSON Response
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
