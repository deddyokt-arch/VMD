import {
  CafeSettings,
  User,
  Category,
  Product,
  Ingredient,
  Recipe,
  Transaction,
  Expense,
  Purchase,
  Supplier,
  StockMovement,
  CashSession,
  CashMovement,
  AuditLog,
  RefundRecord,
  SyncQueueItem,
  DailySummary,
  ProductVariant,
  Tenant,
  TenantStatus,
  CustomerRegistration,
  RegistrationStatus,
  LicenseType,
  VoidedItemRecord,
  HeldTransaction,
  SpreadsheetVolume,
} from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'vaicafe_settings',
  USERS: 'vaicafe_users',
  TENANTS: 'vaicafe_tenants',
  REGISTRATIONS: 'cafevai_registrations',
  CATEGORIES: 'vaicafe_categories',
  PRODUCTS: 'vaicafe_products',
  INGREDIENTS: 'vaicafe_ingredients',
  RECIPES: 'vaicafe_recipes',
  TRANSACTIONS: 'vaicafe_transactions',
  EXPENSES: 'vaicafe_expenses',
  PURCHASES: 'vaicafe_purchases',
  SUPPLIERS: 'vaicafe_suppliers',
  STOCK_MOVEMENTS: 'vaicafe_stock_movements',
  CASH_SESSIONS: 'vaicafe_cash_sessions',
  CASH_MOVEMENTS: 'vaicafe_cash_movements',
  AUDIT_LOG: 'vaicafe_audit_log',
  REFUNDS: 'vaicafe_refunds',
  SYNC_QUEUE: 'vaicafe_sync_queue',
  VOIDED_ITEMS: 'vaicafe_voided_items',
  HELD_ORDERS: 'vaicafe_held_orders',
  PENDING_CLOUD_PUSH: 'vaicafe_pending_cloud_push',
};

export const DEFAULT_REGISTRATIONS: CustomerRegistration[] = [
  {
    registration_id: 'REG-VAI-20261027-101',
    owner_name: 'Budi Kurniawan',
    business_name: 'Berkah Mart Swalayan',
    email: 'budi.berkahmart@gmail.com',
    whatsapp: '081298765432',
    address: 'Jl. Pemuda No. 45, Kebayoran Baru',
    city: 'Jakarta Selatan',
    country: 'Indonesia',
    business_type: 'Supermarket & Swalayan',
    outlets_count: 1,
    devices_count: 2,
    platform: 'Android',
    notes: 'Mohon aktivasi paket bulanan untuk uji coba kasir swalayan.',
    agreed_terms: true,
    status: 'MENUNGGU_PERSETUJUAN',
    submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    registration_id: 'REG-VAI-20261027-102',
    owner_name: 'Siti Aminah',
    business_name: 'Ritel Mandiri Nusantara',
    email: 'siti.ritel@gmail.com',
    whatsapp: '085712345678',
    address: 'Jl. Riau No. 88',
    city: 'Bandung',
    country: 'Indonesia',
    business_type: 'Minimarket & Sembako',
    outlets_count: 2,
    devices_count: 4,
    platform: 'Both',
    notes: 'Dua cabang minimarket kebutuhan pokok.',
    agreed_terms: true,
    status: 'DIPROSES',
    submitted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

// Default initial settings
export const DEFAULT_SETTINGS: CafeSettings = {
  cafe_name: 'VaiMart Supermarket & Swalayan',
  owner_name: 'Deddy Okt',
  address: 'Jl. Raya Utama Swalayan No. 88, Kebayoran Baru, Jakarta Selatan',
  phone: '0812-3456-7890',
  email: 'halo@vaimart.id',
  currency: 'IDR',
  currency_symbol: 'Rp',
  timezone: 'Asia/Jakarta',
  tax_percentage: 10,
  tax_enabled: true,
  service_charge_percentage: 0,
  service_charge_enabled: false,
  receipt_footer: 'Terima kasih telah berbelanja di VaiMart Swalayan!\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan.\nSimpan struk ini sebagai bukti pembayaran sah.',
  receipt_paper_size: '58mm',
  qris_merchant_name: 'VAIMART SWALAYAN JAKARTA',
  qris_nmid: 'ID1020030040050',
  google_account_email: '',
  google_sheet_id: '',
  google_spreadsheet_url: '',
  google_drive_folder_id: '',
  google_drive_folder_url: '',
  google_script_url: '',
  google_auto_synced: false,
  google_auto_created_at: '',
  spreadsheet_volumes: [],
  spreadsheet_cell_limit: 10000000, // Official Google Sheets 10M cells limit
  spreadsheet_rotation_threshold: 80, // Auto-create new spreadsheet at 80% usage
  is_configured: true,
  allow_negative_stock: false,
  updated_at: new Date().toISOString(),
};

// Default seed categories (Supermarket / Swalayan Departments)
export const DEFAULT_CATEGORIES: Category[] = [
  {
    category_id: 'cat_sembako',
    category_name: 'Sembako & Minyak Goreng',
    description: 'Beras, gula pasir, minyak goreng, dan tepung terigu',
    active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    category_id: 'cat_minuman',
    category_name: 'Minuman & Susu UHT',
    description: 'Air mineral, susu UHT, teh kemasan, dan kopi saset',
    active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    category_id: 'cat_makanan',
    category_name: 'Makanan Ringan & Biskuit',
    description: 'Mie instan, biskuit, roti, wafer, dan snack renyah',
    active: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    category_id: 'cat_bumbu',
    category_name: 'Bumbu Dapur & Bahan Masak',
    description: 'Garam, kecap, saus sambal, penyedap rasa, dan santan',
    active: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    category_id: 'cat_perawatan',
    category_name: 'Perawatan Diri & Kebersihan',
    description: 'Sabun mandi, shampoo, pasta gigi, dan sabun cuci muka',
    active: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    category_id: 'cat_rumah',
    category_name: 'Kebutuhan Rumah Tangga',
    description: 'Deterjen pakaian, pembersih lantai, pewangi, dan tisu',
    active: true,
    sort_order: 6,
    created_at: new Date().toISOString(),
  },
  {
    category_id: 'cat_segar',
    category_name: 'Produk Segar & Olahan Beku',
    description: 'Telur ayam, buah-buahan segar, sosis, dan frozen food',
    active: true,
    sort_order: 7,
    created_at: new Date().toISOString(),
  },
  {
    category_id: 'cat_bayi',
    category_name: 'Kebutuhan Bayi & Anak',
    description: 'Susu formula, popok bayi pampers, dan makanan bayi',
    active: true,
    sort_order: 8,
    created_at: new Date().toISOString(),
  },
];


// Default seed ingredients / bulk warehouse stock
export const DEFAULT_INGREDIENTS: Ingredient[] = [
  {
    ingredient_id: 'ing_dus_bimoli',
    ingredient_name: 'Karton Dus Bimoli 2L (Isi 6 Pouch)',
    unit: 'dus',
    stock_qty: 45,
    minimum_stock: 10,
    cost_per_unit: 185000,
    supplier_id: 'sup_1',
    updated_at: new Date().toISOString(),
  },
  {
    ingredient_id: 'ing_karung_beras',
    ingredient_name: 'Karung Beras Ramos 50kg (Grosir)',
    unit: 'karung',
    stock_qty: 20,
    minimum_stock: 5,
    cost_per_unit: 680000,
    supplier_id: 'sup_2',
    updated_at: new Date().toISOString(),
  },
  {
    ingredient_id: 'ing_dus_indomie',
    ingredient_name: 'Karton Dus Indomie Goreng (Isi 40 Pcs)',
    unit: 'dus',
    stock_qty: 60,
    minimum_stock: 15,
    cost_per_unit: 102000,
    supplier_id: 'sup_1',
    updated_at: new Date().toISOString(),
  },
];

// Default seed suppliers (Distributor Supermarket)
export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    supplier_id: 'sup_1',
    supplier_name: 'PT Indomarco Adi Prima (Indofood Group)',
    phone: '021-5566-7788',
    address: 'Kawasan Industri Pulo Gadung, Jakarta Timur',
    email: 'orders@indomarco.co.id',
    notes: 'Distributor resmi Indofood, Indomie, Bimoli, dan minyak goreng',
    active: true,
  },
  {
    supplier_id: 'sup_2',
    supplier_name: 'PT Unilever Indonesia Tbk Distributor',
    phone: '021-8990-1122',
    address: 'BSD City, Tangerang Selatan',
    email: 'supply@unilever-distributor.id',
    notes: 'Distributor sabun Lifebuoy, Rinso, Pepsodent, dan Sunsilk',
    active: true,
  },
  {
    supplier_id: 'sup_3',
    supplier_name: 'PT Mayora Indah Tbk Supply Chain',
    phone: '021-6677-8899',
    address: 'Daan Mogot, Jakarta Barat',
    email: 'sales@mayora.co.id',
    notes: 'Distributor Roma Biskuit, Kopi Torabika, dan Beng-Beng',
    active: true,
  },
];

// Default seed products (Retail Swalayan Items with EAN-13 Barcodes & Racks)
export const DEFAULT_PRODUCTS: Product[] = [
  {
    product_id: 'prod_1',
    sku: 'BM-2L',
    barcode: '8999999000019',
    product_name: 'Minyak Goreng Bimoli Pouch 2 Liter',
    category_id: 'cat_sembako',
    description: 'Minyak goreng kelapa sawit murni berkualitas tinggi 2 Liter',
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
    selling_price: 36500,
    cost_price: 32000,
    stock_type: 'finished',
    stock_qty: 120,
    minimum_stock: 20,
    unit: 'Pcs',
    brand: 'Bimoli',
    rack_location: 'Rak A-01',
    wholesale_price: 35000,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { variant_id: 'v1_1', product_id: 'prod_1', variant_name: 'Satuan (1 Pouch 2L)', group_name: 'Kemasan', additional_price: 0, active: true },
      { variant_id: 'v1_2', product_id: 'prod_1', variant_name: 'Karton (1 Dus Isi 6)', group_name: 'Kemasan', additional_price: 173500, active: true },
    ],
  },
  {
    product_id: 'prod_2',
    sku: 'BRS-5KG',
    barcode: '8999999000026',
    product_name: 'Beras Premium Ramos Setra 5 Kg',
    category_id: 'cat_sembako',
    description: 'Beras putih pulen pilihan alami kualitas super 5 kilogram',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    selling_price: 78000,
    cost_price: 70000,
    stock_type: 'finished',
    stock_qty: 65,
    minimum_stock: 10,
    unit: 'Sak',
    brand: 'Ramos',
    rack_location: 'Rak A-02',
    wholesale_price: 75000,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_3',
    sku: 'GLK-1KG',
    barcode: '8999999000033',
    product_name: 'Gula Pasir Gulaku Premium 1 Kg',
    category_id: 'cat_sembako',
    description: 'Gula pasir kristal putih murni olahan tebu 100% (1 Kg)',
    image_url: 'https://images.unsplash.com/photo-1622484210800-7561f364e525?w=500&auto=format&fit=crop&q=80',
    selling_price: 17500,
    cost_price: 15200,
    stock_type: 'finished',
    stock_qty: 150,
    minimum_stock: 25,
    unit: 'Pcs',
    brand: 'Gulaku',
    rack_location: 'Rak A-03',
    wholesale_price: 16800,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_4',
    sku: 'UM-1L-CK',
    barcode: '8991001000045',
    product_name: 'Susu Ultra Milk Cokelat 1000 ml',
    category_id: 'cat_minuman',
    description: 'Susu segar UHT rasa cokelat kaya kalsium kemasan 1 Liter',
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=80',
    selling_price: 21000,
    cost_price: 18000,
    stock_type: 'finished',
    stock_qty: 90,
    minimum_stock: 15,
    unit: 'Kotak',
    brand: 'Ultra Milk',
    rack_location: 'Cold Display 1',
    wholesale_price: 20000,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_5',
    sku: 'LM-600',
    barcode: '8996001000052',
    product_name: 'Air Mineral Le Minerale 600 ml',
    category_id: 'cat_minuman',
    description: 'Air mineral pegunungan alami botol 600ml rasa manis alami',
    image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=80',
    selling_price: 4000,
    cost_price: 2800,
    stock_type: 'finished',
    stock_qty: 240,
    minimum_stock: 40,
    unit: 'Botol',
    brand: 'Le Minerale',
    rack_location: 'Cold Display 2',
    wholesale_price: 3500,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_6',
    sku: 'IDM-GRG',
    barcode: '8998866200069',
    product_name: 'Indomie Goreng Spesial 85g',
    category_id: 'cat_makanan',
    description: 'Mie instan goreng favorit Indonesia lengkap dengan bawang goreng',
    image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
    selling_price: 3100,
    cost_price: 2600,
    stock_type: 'finished',
    stock_qty: 350,
    minimum_stock: 50,
    unit: 'Pcs',
    brand: 'Indofood',
    rack_location: 'Rak B-01',
    wholesale_price: 2900,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { variant_id: 'v6_1', product_id: 'prod_6', variant_name: 'Eceran (1 Pcs)', group_name: 'Paket', additional_price: 0, active: true },
      { variant_id: 'v6_2', product_id: 'prod_6', variant_name: 'Paket Hemat (5 Pcs)', group_name: 'Paket', additional_price: 11900, active: true },
    ],
  },
  {
    product_id: 'prod_7',
    sku: 'LB-110G',
    barcode: '8999999000076',
    product_name: 'Sabun Mandi Lifebuoy Total 10 (110g)',
    category_id: 'cat_perawatan',
    description: 'Sabun batang perlindungan kuman dan bakteri 110 gram',
    image_url: 'https://images.unsplash.com/photo-1607006482142-6d2c478cf2ff?w=500&auto=format&fit=crop&q=80',
    selling_price: 5500,
    cost_price: 4200,
    stock_type: 'finished',
    stock_qty: 110,
    minimum_stock: 20,
    unit: 'Pcs',
    brand: 'Lifebuoy',
    rack_location: 'Rak C-01',
    wholesale_price: 5000,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_8',
    sku: 'RNS-770',
    barcode: '8999999000083',
    product_name: 'Deterjen Rinso Anti Noda 770g',
    category_id: 'cat_rumah',
    description: 'Deterjen bubuk pembersih noda pakaian konsentrat 770g',
    image_url: 'https://images.unsplash.com/photo-1585832770485-e68a5fcfad52?w=500&auto=format&fit=crop&q=80',
    selling_price: 24500,
    cost_price: 20500,
    stock_type: 'finished',
    stock_qty: 75,
    minimum_stock: 15,
    unit: 'Pack',
    brand: 'Rinso',
    rack_location: 'Rak C-02',
    wholesale_price: 23000,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_9',
    sku: 'PEP-190',
    barcode: '8999999000090',
    product_name: 'Pasta Gigi Pepsodent Pencegah Gigi Berlubang 190g',
    category_id: 'cat_perawatan',
    description: 'Pasta gigi perlindungan mikro kalsium dan pro-fluoride 190g',
    image_url: 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=500&auto=format&fit=crop&q=80',
    selling_price: 16500,
    cost_price: 13500,
    stock_type: 'finished',
    stock_qty: 85,
    minimum_stock: 15,
    unit: 'Pcs',
    brand: 'Pepsodent',
    rack_location: 'Rak C-03',
    wholesale_price: 15500,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_10',
    sku: 'TLR-1KG',
    barcode: '8999999000106',
    product_name: 'Telur Ayam Negeri Segar 1 Kg',
    category_id: 'cat_segar',
    description: 'Telur ayam negeri pilihan konsumsi harian (isi ± 16 butir/kg)',
    image_url: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=500&auto=format&fit=crop&q=80',
    selling_price: 29000,
    cost_price: 25000,
    stock_type: 'finished',
    stock_qty: 40,
    minimum_stock: 10,
    unit: 'Kg',
    brand: 'Lokal Segar',
    rack_location: 'Etalase Segar',
    wholesale_price: 27500,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_11',
    sku: 'RMA-300',
    barcode: '8999999000113',
    product_name: 'Roma Biskuit Kelapa 300g',
    category_id: 'cat_makanan',
    description: 'Biskuit renyah gurih kelapa murni kemasan keluarga 300 gram',
    image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80',
    selling_price: 12500,
    cost_price: 9800,
    stock_type: 'finished',
    stock_qty: 95,
    minimum_stock: 15,
    unit: 'Pcs',
    brand: 'Mayora',
    rack_location: 'Rak B-02',
    wholesale_price: 11500,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    product_id: 'prod_12',
    sku: 'KAP-165',
    barcode: '8999999000120',
    product_name: 'Kopi Kapal Api Mantap Fast 165g',
    category_id: 'cat_minuman',
    description: 'Kopi bubuk murni aroma mantap kemasan pouch 165 gram',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    selling_price: 15000,
    cost_price: 12200,
    stock_type: 'finished',
    stock_qty: 130,
    minimum_stock: 20,
    unit: 'Pack',
    brand: 'Kapal Api',
    rack_location: 'Rak B-03',
    wholesale_price: 14000,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Default Recipes (Empty or Optional for Retail)
export const DEFAULT_RECIPES: Recipe[] = [];

export const DEFAULT_TENANTS: Tenant[] = [
  {
    tenant_id: 'tenant_vaimart_01',
    business_name: 'VaiMart Supermarket & Swalayan',
    owner_user_id: 'user_admin_01',
    owner_name: 'Deddy Okt',
    owner_email: 'deddyokt.photography@gmail.com',
    spreadsheet_id: '',
    drive_folder_id: '',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes: 'Cabang Utama / Supermarket & Swalayan',
  },
];


// Pre-hashed credentials for store Admin & Kasir (Superadmin lives exclusively in standalone portal)
// admin123 -> SHA-256: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
// PIN 1234 -> SHA-256: 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
// kasir123 -> SHA-256: e8742b78b88fc3a23a31da5f69c09930fcae135111b7dfb27ff7b0559eb41ae0
// PIN 2026 -> SHA-256: 3be1900a649ef9845c4864fc3ffcd92518f87056bf471ef4045f28f8ac396fae
export const DEFAULT_USERS: User[] = [
  {
    user_id: 'user_admin_01',
    username: 'admin',
    password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    full_name: 'Deddy Okt (Owner / Admin)',
    role: 'ADMIN',
    active: true,
    tenant_id: 'tenant_vaimart_01',
    pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    created_at: new Date().toISOString(),
  },
  {
    user_id: 'user_kasir_01',
    username: 'kasir',
    password_hash: 'e8742b78b88fc3a23a31da5f69c09930fcae135111b7dfb27ff7b0559eb41ae0',
    full_name: 'Rian Kasir (Shift Swalayan)',
    role: 'KASIR',
    active: true,
    tenant_id: 'tenant_vaimart_01',
    pin_hash: '3be1900a649ef9845c4864fc3ffcd92518f87056bf471ef4045f28f8ac396fae',
    created_at: new Date().toISOString(),
  },
];


// Helper: Local Storage wrapper
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Failed reading storage key: ${key}`, err);
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed writing storage key: ${key}`, err);
  }
}

/**
 * Main Database Repository
 */
export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Ensure default seeds are present
  public ensureInitialized(): void {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      setLocalItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    } else {
      const cur = getLocalItem<CafeSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      let needsSave = false;
      if (cur.google_sheet_id && cur.google_sheet_id.includes('1vai_deddyokt_cafe_pos_database_2026')) {
        cur.google_sheet_id = '';
        cur.google_spreadsheet_url = '';
        needsSave = true;
      }
      if (cur.google_drive_folder_id && cur.google_drive_folder_id.includes('folder_vai_deddyokt_media_2026')) {
        cur.google_drive_folder_id = '';
        cur.google_drive_folder_url = '';
        needsSave = true;
      }
      if (needsSave) {
        setLocalItem(STORAGE_KEYS.SETTINGS, cur);
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      setLocalItem(STORAGE_KEYS.USERS, DEFAULT_USERS);
    } else {
      const curUsers = getLocalItem<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
      // Strip any legacy SUPERADMIN account from store user storage so it never leaks into User Management
      const filtered = curUsers.filter(
        u =>
          u.role !== 'SUPERADMIN' &&
          u.username.toLowerCase() !== 'divailean' &&
          u.username.toLowerCase() !== 'superadmin'
      );
      if (filtered.length !== curUsers.length) {
        setLocalItem(STORAGE_KEYS.USERS, filtered.length > 0 ? filtered : DEFAULT_USERS);
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.TENANTS)) {
      setLocalItem(STORAGE_KEYS.TENANTS, DEFAULT_TENANTS);
    }

    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      setLocalItem(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      setLocalItem(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.INGREDIENTS)) {
      setLocalItem(STORAGE_KEYS.INGREDIENTS, DEFAULT_INGREDIENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.RECIPES)) {
      setLocalItem(STORAGE_KEYS.RECIPES, DEFAULT_RECIPES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
      setLocalItem(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      setLocalItem(STORAGE_KEYS.TRANSACTIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
      setLocalItem(STORAGE_KEYS.EXPENSES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
      setLocalItem(STORAGE_KEYS.PURCHASES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS)) {
      setLocalItem(STORAGE_KEYS.STOCK_MOVEMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CASH_SESSIONS)) {
      setLocalItem(STORAGE_KEYS.CASH_SESSIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CASH_MOVEMENTS)) {
      setLocalItem(STORAGE_KEYS.CASH_MOVEMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOG)) {
      setLocalItem(STORAGE_KEYS.AUDIT_LOG, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REFUNDS)) {
      setLocalItem(STORAGE_KEYS.REFUNDS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE)) {
      setLocalItem(STORAGE_KEYS.SYNC_QUEUE, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.VOIDED_ITEMS)) {
      setLocalItem(STORAGE_KEYS.VOIDED_ITEMS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.HELD_ORDERS)) {
      setLocalItem(STORAGE_KEYS.HELD_ORDERS, []);
    }
  }

  // Voided Items Log (Item Cancellation Summary for Admin)
  public getVoidedItems(): VoidedItemRecord[] {
    return getLocalItem<VoidedItemRecord[]>(STORAGE_KEYS.VOIDED_ITEMS, []);
  }

  public recordVoidedItem(item: VoidedItemRecord): void {
    const list = this.getVoidedItems();
    list.unshift(item);
    if (list.length > 1000) list.pop();
    setLocalItem(STORAGE_KEYS.VOIDED_ITEMS, list);

    this.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: item.cashier_id,
      user_name: item.cashier_name,
      action: 'BATAL_ITEM_KASIR',
      entity_type: 'POS_KERANJANG',
      entity_id: item.product_id,
      timestamp: new Date().toISOString(),
      details: `Pembatalan item oleh kasir: ${item.quantity}x ${item.product_name} (Rp ${item.total_price.toLocaleString('id-ID')})`,
    });
  }

  // Held Transactions
  public getHeldTransactions(): HeldTransaction[] {
    return getLocalItem<HeldTransaction[]>(STORAGE_KEYS.HELD_ORDERS, []);
  }

  public saveHeldTransaction(held: HeldTransaction): void {
    const list = this.getHeldTransactions();
    list.unshift(held);
    setLocalItem(STORAGE_KEYS.HELD_ORDERS, list);
  }

  public deleteHeldTransaction(holdId: string): void {
    const list = this.getHeldTransactions().filter(h => h.hold_id !== holdId);
    setLocalItem(STORAGE_KEYS.HELD_ORDERS, list);
  }

  // Tenants Management (Multi-Tenant Core)
  public getTenants(): Tenant[] {
    return getLocalItem<Tenant[]>(STORAGE_KEYS.TENANTS, DEFAULT_TENANTS);
  }

  public getTenantById(tenantId: string): Tenant | null {
    const tenants = this.getTenants();
    return tenants.find(t => t.tenant_id === tenantId) || null;
  }

  public saveTenant(tenant: Tenant): void {
    const tenants = this.getTenants();
    const idx = tenants.findIndex(t => t.tenant_id === tenant.tenant_id);
    if (idx >= 0) {
      tenants[idx] = tenant;
    } else {
      tenants.push(tenant);
    }
    setLocalItem(STORAGE_KEYS.TENANTS, tenants);
  }

  public updateTenantStatus(tenantId: string, status: TenantStatus): void {
    const tenant = this.getTenantById(tenantId);
    if (tenant) {
      tenant.status = status;
      tenant.updated_at = new Date().toISOString();
      this.saveTenant(tenant);
    }
  }

  // Customer Registration Management (MartVai Pro License Requests)
  public getRegistrations(): CustomerRegistration[] {
    return getLocalItem<CustomerRegistration[]>(STORAGE_KEYS.REGISTRATIONS, DEFAULT_REGISTRATIONS);
  }

  public getRegistrationById(id: string): CustomerRegistration | null {
    const regs = this.getRegistrations();
    return regs.find(r => r.registration_id.toLowerCase() === id.trim().toLowerCase()) || null;
  }

  public saveRegistration(reg: CustomerRegistration): void {
    const regs = this.getRegistrations();
    const idx = regs.findIndex(r => r.registration_id === reg.registration_id);
    if (idx >= 0) {
      regs[idx] = reg;
    } else {
      regs.unshift(reg);
    }
    setLocalItem(STORAGE_KEYS.REGISTRATIONS, regs);
  }

  public updateRegistrationStatus(
    id: string,
    status: RegistrationStatus,
    reason?: string,
    pkg?: LicenseType,
    durationDays?: number
  ): CustomerRegistration | null {
    const reg = this.getRegistrationById(id);
    if (reg) {
      reg.status = status;
      reg.updated_at = new Date().toISOString();
      if (reason) reg.rejection_reason = reason;
      if (pkg) reg.package_assigned = pkg;
      if (durationDays) reg.package_duration_days = durationDays;
      if (status === 'DISETUJUI') reg.approved_at = new Date().toISOString();
      this.saveRegistration(reg);
      return reg;
    }
    return null;
  }

  // Settings
  public getSettings(): CafeSettings {
    return getLocalItem<CafeSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public updateSettings(updates: Partial<CafeSettings>, markDirty = true): CafeSettings {
    const current = this.getSettings();
    const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
    setLocalItem(STORAGE_KEYS.SETTINGS, updated);
    if (markDirty && updated.google_oauth_connected) {
      const onlySyncMeta =
        Object.keys(updates).every(k =>
          [
            'google_account_email',
            'google_sheet_id',
            'google_spreadsheet_url',
            'google_drive_folder_id',
            'google_drive_folder_url',
            'google_oauth_connected',
            'google_connected_user_name',
            'google_auto_synced',
            'google_auto_created_at',
            'google_last_diagnostics',
            'spreadsheet_volumes',
          ].includes(k)
        );
      if (!onlySyncMeta) {
        this.setPendingCloudPush(true);
      }
    }
    return updated;
  }

  public getPendingCloudPush(): boolean {
    return getLocalItem<boolean>(STORAGE_KEYS.PENDING_CLOUD_PUSH, false);
  }

  public setPendingCloudPush(pending: boolean): void {
    setLocalItem(STORAGE_KEYS.PENDING_CLOUD_PUSH, pending);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('martvai:local-mutation'));
    }
  }

  // Users (Store Kasir & Admin only — Superadmin is excluded)
  public getUsers(): User[] {
    return getLocalItem<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS).filter(
      u => u.role !== 'SUPERADMIN' && u.username.toLowerCase() !== 'divailean'
    );
  }

  public getStoreUsers(): User[] {
    return this.getUsers().filter(u => u.role !== 'SUPERADMIN');
  }

  public saveUser(user: User): void {
    if (user.role === 'SUPERADMIN' || user.username.toLowerCase() === 'divailean') {
      return;
    }
    const users = this.getUsers();
    const idx = users.findIndex(u => u.user_id === user.user_id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    setLocalItem(STORAGE_KEYS.USERS, users);
    this.setPendingCloudPush(true);
  }

  public deleteUser(userId: string): void {
    const users = this.getUsers().filter(u => u.user_id !== userId);
    setLocalItem(STORAGE_KEYS.USERS, users);
    this.setPendingCloudPush(true);
  }

  public ensureAdminForGoogleUser(email: string, displayName: string): User {
    const users = this.getUsers();
    const cleanEmail = email.toLowerCase().trim();
    const found = users.find(
      u => u.username.toLowerCase() === cleanEmail || u.full_name.toLowerCase() === displayName.toLowerCase()
    );
    if (found) {
      return found;
    }

    const cleanUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9]/g, '');
    const newAdmin: User = {
      user_id: 'usr_g_' + Date.now(),
      username: cleanUsername || 'admin_google',
      full_name: displayName || 'Pemilik Swalayan (Google)',
      password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
      pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // 1234
      role: 'ADMIN',
      active: true,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    users.push(newAdmin);
    setLocalItem(STORAGE_KEYS.USERS, users);
    return newAdmin;
  }

  // Categories
  public getCategories(): Category[] {
    return getLocalItem<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
  }

  public saveCategory(cat: Category): void {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.category_id === cat.category_id);
    if (idx >= 0) {
      cats[idx] = cat;
    } else {
      cats.push(cat);
    }
    setLocalItem(STORAGE_KEYS.CATEGORIES, cats);
    this.setPendingCloudPush(true);
  }

  public deleteCategory(catId: string): void {
    const cats = this.getCategories().filter(c => c.category_id !== catId);
    setLocalItem(STORAGE_KEYS.CATEGORIES, cats);
    this.setPendingCloudPush(true);
  }

  // Products
  public getProducts(): Product[] {
    return getLocalItem<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  }

  public saveProduct(prod: Product): void {
    const prods = this.getProducts();
    const idx = prods.findIndex(p => p.product_id === prod.product_id);
    if (idx >= 0) {
      prods[idx] = { ...prod, updated_at: new Date().toISOString() };
    } else {
      prods.push({ ...prod, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    setLocalItem(STORAGE_KEYS.PRODUCTS, prods);
    this.setPendingCloudPush(true);
  }

  public deleteProduct(prodId: string): void {
    const prods = this.getProducts().filter(p => p.product_id !== prodId);
    setLocalItem(STORAGE_KEYS.PRODUCTS, prods);
    this.setPendingCloudPush(true);
  }

  // Ingredients (Raw Materials)
  public getIngredients(): Ingredient[] {
    return getLocalItem<Ingredient[]>(STORAGE_KEYS.INGREDIENTS, DEFAULT_INGREDIENTS);
  }

  public saveIngredient(ing: Ingredient): void {
    const ings = this.getIngredients();
    const idx = ings.findIndex(i => i.ingredient_id === ing.ingredient_id);
    if (idx >= 0) {
      ings[idx] = { ...ing, updated_at: new Date().toISOString() };
    } else {
      ings.push({ ...ing, updated_at: new Date().toISOString() });
    }
    setLocalItem(STORAGE_KEYS.INGREDIENTS, ings);
    this.setPendingCloudPush(true);
  }

  public deleteIngredient(id: string): void {
    const ings = this.getIngredients().filter(i => i.ingredient_id !== id);
    setLocalItem(STORAGE_KEYS.INGREDIENTS, ings);
    this.setPendingCloudPush(true);
  }

  // Recipes
  public getRecipes(): Recipe[] {
    return getLocalItem<Recipe[]>(STORAGE_KEYS.RECIPES, DEFAULT_RECIPES);
  }

  public saveRecipe(recipe: Recipe): void {
    const recipes = this.getRecipes();
    const idx = recipes.findIndex(r => r.recipe_id === recipe.recipe_id);
    if (idx >= 0) {
      recipes[idx] = recipe;
    } else {
      recipes.push(recipe);
    }
    setLocalItem(STORAGE_KEYS.RECIPES, recipes);
    this.setPendingCloudPush(true);
  }

  public deleteRecipe(id: string): void {
    const recipes = this.getRecipes().filter(r => r.recipe_id !== id);
    setLocalItem(STORAGE_KEYS.RECIPES, recipes);
    this.setPendingCloudPush(true);
  }

  public getRecipesByProduct(productId: string): Recipe[] {
    return this.getRecipes().filter(r => r.product_id === productId);
  }

  // Suppliers
  public getSuppliers(): Supplier[] {
    return getLocalItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
  }

  public saveSupplier(sup: Supplier): void {
    const sups = this.getSuppliers();
    const idx = sups.findIndex(s => s.supplier_id === sup.supplier_id);
    if (idx >= 0) {
      sups[idx] = sup;
    } else {
      sups.push(sup);
    }
    setLocalItem(STORAGE_KEYS.SUPPLIERS, sups);
    this.setPendingCloudPush(true);
  }

  public deleteSupplier(id: string): void {
    const sups = this.getSuppliers().filter(s => s.supplier_id !== id);
    setLocalItem(STORAGE_KEYS.SUPPLIERS, sups);
    this.setPendingCloudPush(true);
  }

  // Transactions
  public getTransactions(): Transaction[] {
    return getLocalItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  }

  /**
   * Process & Save Transaction with inventory deduction, stock movements, and audit log
   */
  public createTransaction(tx: Transaction, createdByUserId: string): { success: boolean; error?: string } {
    const transactions = this.getTransactions();

    // Idempotency check: prevent duplicate submission
    if (transactions.some(t => t.transaction_id === tx.transaction_id)) {
      return { success: true };
    }

    const products = this.getProducts();
    const ingredients = this.getIngredients();
    const recipes = this.getRecipes();
    const movements = this.getStockMovements();
    const settings = this.getSettings();

    // Inventory deduction
    for (const item of tx.items) {
      const prod = products.find(p => p.product_id === item.product_id);
      if (!prod) continue;

      if (prod.stock_type === 'recipe') {
        // Find recipes for this product
        const itemRecipes = recipes.filter(r => r.product_id === prod.product_id);
        for (const rec of itemRecipes) {
          const ing = ingredients.find(i => i.ingredient_id === rec.ingredient_id);
          if (ing) {
            const deductQty = rec.quantity_used * item.quantity;
            if (!settings.allow_negative_stock && ing.stock_qty < deductQty) {
              // low stock warning, continue or deduct
            }
            ing.stock_qty = Math.max(0, ing.stock_qty - deductQty);
            ing.updated_at = new Date().toISOString();

            // Record movement
            movements.push({
              movement_id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              movement_date: new Date().toISOString(),
              item_type: 'ingredient',
              item_id: ing.ingredient_id,
              item_name: ing.ingredient_name,
              movement_type: 'sale',
              quantity_in: 0,
              quantity_out: deductQty,
              balance_after: ing.stock_qty,
              reference_id: tx.invoice_number,
              notes: `Penjualan ${item.quantity}x ${prod.product_name}`,
              created_by: createdByUserId,
            });
          }
        }
      } else {
        // Finished good direct deduction
        prod.stock_qty = Math.max(0, prod.stock_qty - item.quantity);
        prod.updated_at = new Date().toISOString();

        movements.push({
          movement_id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          movement_date: new Date().toISOString(),
          item_type: 'product',
          item_id: prod.product_id,
          item_name: prod.product_name,
          movement_type: 'sale',
          quantity_in: 0,
          quantity_out: item.quantity,
          balance_after: prod.stock_qty,
          reference_id: tx.invoice_number,
          notes: `Penjualan kasir POS: ${item.quantity} ${prod.unit}`,
          created_by: createdByUserId,
        });
      }
    }

    // Save updated products and ingredients
    setLocalItem(STORAGE_KEYS.PRODUCTS, products);
    setLocalItem(STORAGE_KEYS.INGREDIENTS, ingredients);
    setLocalItem(STORAGE_KEYS.STOCK_MOVEMENTS, movements);

    // Save transaction
    transactions.unshift(tx);
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, transactions);

    // Add to audit log
    this.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: createdByUserId,
      user_name: tx.cashier_name,
      action: 'TRANSAKSI_SELESAI',
      entity_type: 'TRANSAKSI',
      entity_id: tx.transaction_id,
      timestamp: new Date().toISOString(),
      details: `Invoice: ${tx.invoice_number}, Total: Rp ${tx.total.toLocaleString('id-ID')}, Metode: ${tx.payment_method}`,
    });

    // Queue for sync to Google Sheets if connected
    this.enqueueSync({
      operation_id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      device_id: 'web_pos_client',
      local_transaction_id: tx.transaction_id,
      operation_type: 'CREATE_TRANSACTION',
      payload_json: JSON.stringify(tx),
      status: 'PENDING',
      retry_count: 0,
      created_at: new Date().toISOString(),
    });

    return { success: true };
  }

  public deleteTransaction(transactionId: string): void {
    const txs = this.getTransactions();
    const target = txs.find(t => t.transaction_id === transactionId);
    const updated = txs.filter(t => t.transaction_id !== transactionId);
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, updated);

    if (target) {
      this.addAuditLog({
        log_id: 'log_' + Date.now(),
        user_id: 'admin',
        user_name: 'Admin',
        action: 'HAPUS_TRANSAKSI',
        entity_type: 'TRANSAKSI',
        entity_id: transactionId,
        timestamp: new Date().toISOString(),
        details: `Hapus transaksi invoice ${target.invoice_number} (Total: Rp ${target.total.toLocaleString('id-ID')})`,
      });
    }
    this.setPendingCloudPush(true);
  }

  // Stock Movements
  public getStockMovements(): StockMovement[] {
    return getLocalItem<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []);
  }

  public recordStockAdjustment(
    itemType: 'ingredient' | 'product',
    itemId: string,
    adjustmentQty: number, // positive for addition, negative for reduction
    reason: string,
    userId: string,
    userName: string
  ): void {
    const movements = this.getStockMovements();
    let balanceAfter = 0;
    let itemName = '';

    if (itemType === 'product') {
      const prods = this.getProducts();
      const p = prods.find(item => item.product_id === itemId);
      if (p) {
        p.stock_qty = Math.max(0, p.stock_qty + adjustmentQty);
        balanceAfter = p.stock_qty;
        itemName = p.product_name;
        this.saveProduct(p);
      }
    } else {
      const ings = this.getIngredients();
      const i = ings.find(item => item.ingredient_id === itemId);
      if (i) {
        i.stock_qty = Math.max(0, i.stock_qty + adjustmentQty);
        balanceAfter = i.stock_qty;
        itemName = i.ingredient_name;
        this.saveIngredient(i);
      }
    }

    movements.unshift({
      movement_id: 'mov_' + Date.now(),
      movement_date: new Date().toISOString(),
      item_type: itemType,
      item_id: itemId,
      item_name: itemName,
      movement_type: 'adjustment',
      quantity_in: adjustmentQty > 0 ? adjustmentQty : 0,
      quantity_out: adjustmentQty < 0 ? Math.abs(adjustmentQty) : 0,
      balance_after: balanceAfter,
      reference_id: 'ADJUSTMENT',
      notes: reason,
      created_by: userName,
    });

    setLocalItem(STORAGE_KEYS.STOCK_MOVEMENTS, movements);
    this.setPendingCloudPush(true);
  }

  // Expenses
  public getExpenses(): Expense[] {
    return getLocalItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  }

  public saveExpense(exp: Expense): void {
    const expenses = this.getExpenses();
    expenses.unshift(exp);
    setLocalItem(STORAGE_KEYS.EXPENSES, expenses);

    this.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: exp.created_by,
      user_name: 'User',
      action: 'CATAT_PENGELUARAN',
      entity_type: 'PENGELUARAN',
      entity_id: exp.expense_id,
      timestamp: new Date().toISOString(),
      details: `${exp.category}: ${exp.description} (Rp ${exp.amount.toLocaleString('id-ID')})`,
    });
    this.setPendingCloudPush(true);
  }

  public deleteExpense(id: string): void {
    const expenses = this.getExpenses().filter(e => e.expense_id !== id);
    setLocalItem(STORAGE_KEYS.EXPENSES, expenses);
    this.setPendingCloudPush(true);
  }

  // Purchases (Pembelian Bahan Baku)
  public getPurchases(): Purchase[] {
    return getLocalItem<Purchase[]>(STORAGE_KEYS.PURCHASES, []);
  }

  public savePurchase(purchase: Purchase): void {
    const purchases = this.getPurchases();
    purchases.unshift(purchase);
    setLocalItem(STORAGE_KEYS.PURCHASES, purchases);

    // Auto-update raw ingredient stock & cost
    const ingredients = this.getIngredients();
    const movements = this.getStockMovements();

    for (const item of purchase.items) {
      if (item.ingredient_id) {
        const ing = ingredients.find(i => i.ingredient_id === item.ingredient_id);
        if (ing) {
          ing.stock_qty += item.quantity;
          if (item.unit_cost > 0) {
            ing.cost_per_unit = item.unit_cost;
          }
          ing.updated_at = new Date().toISOString();

          movements.unshift({
            movement_id: 'mov_p_' + Date.now(),
            movement_date: new Date().toISOString(),
            item_type: 'ingredient',
            item_id: ing.ingredient_id,
            item_name: ing.ingredient_name,
            movement_type: 'purchase',
            quantity_in: item.quantity,
            quantity_out: 0,
            balance_after: ing.stock_qty,
            reference_id: purchase.purchase_number,
            notes: `Pembelian dari ${purchase.supplier_name || 'Supplier'}`,
            created_by: purchase.created_by,
          });
        }
      }
    }

    setLocalItem(STORAGE_KEYS.INGREDIENTS, ingredients);
    setLocalItem(STORAGE_KEYS.STOCK_MOVEMENTS, movements);
    this.setPendingCloudPush(true);
  }

  public deletePurchase(id: string): void {
    const purchases = this.getPurchases();
    const target = purchases.find(p => p.purchase_id === id);
    const updated = purchases.filter(p => p.purchase_id !== id);
    setLocalItem(STORAGE_KEYS.PURCHASES, updated);

    if (target) {
      this.addAuditLog({
        log_id: 'log_' + Date.now(),
        user_id: 'admin',
        user_name: 'Admin',
        action: 'HAPUS_PEMBELIAN',
        entity_type: 'PEMBELIAN',
        entity_id: id,
        timestamp: new Date().toISOString(),
        details: `Hapus invoice PO ${target.purchase_number} dari ${target.supplier_name}`,
      });
    }
    this.setPendingCloudPush(true);
  }

  // Cash Shifts (Kas & Shift)
  public getCashSessions(): CashSession[] {
    return getLocalItem<CashSession[]>(STORAGE_KEYS.CASH_SESSIONS, []);
  }

  public getActiveCashSession(cashierId?: string): CashSession | null {
    const sessions = this.getCashSessions();
    if (cashierId) {
      return sessions.find(s => s.cashier_id === cashierId && s.status === 'OPEN') || null;
    }
    return sessions.find(s => s.status === 'OPEN') || null;
  }

  public openCashSession(cashierId: string, cashierName: string, openingCash: number): CashSession {
    const sessions = this.getCashSessions();
    const newSession: CashSession = {
      session_id: 'ses_' + Date.now(),
      cashier_id: cashierId,
      cashier_name: cashierName,
      opening_time: new Date().toISOString(),
      opening_cash: openingCash,
      expected_cash: openingCash,
      status: 'OPEN',
    };
    sessions.unshift(newSession);
    setLocalItem(STORAGE_KEYS.CASH_SESSIONS, sessions);

    this.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: cashierId,
      user_name: cashierName,
      action: 'BUKA_SHIFT',
      entity_type: 'SHIFT',
      entity_id: newSession.session_id,
      timestamp: new Date().toISOString(),
      details: `Modal Awal Kasir: Rp ${openingCash.toLocaleString('id-ID')}`,
    });
    this.setPendingCloudPush(true);

    return newSession;
  }

  public closeCashSession(sessionId: string, actualCash: number, notes?: string): CashSession | null {
    const sessions = this.getCashSessions();
    const session = sessions.find(s => s.session_id === sessionId);
    if (!session) return null;

    // Calculate expected cash from transactions & movements during this shift
    const transactions = this.getTransactions().filter(
      t => t.cashier_id === session.cashier_id &&
           new Date(t.created_at) >= new Date(session.opening_time) &&
           t.payment_method === 'TUNAI' &&
           t.transaction_status === 'COMPLETED'
    );
    const cashSales = transactions.reduce((acc, curr) => acc + curr.total, 0);

    const movements = this.getCashMovements().filter(m => m.session_id === sessionId);
    const cashIn = movements.filter(m => m.movement_type === 'CASH_IN').reduce((acc, c) => acc + c.amount, 0);
    const cashOut = movements.filter(m => m.movement_type === 'CASH_OUT').reduce((acc, c) => acc + c.amount, 0);

    const expected = session.opening_cash + cashSales + cashIn - cashOut;
    const diff = actualCash - expected;

    session.closing_time = new Date().toISOString();
    session.expected_cash = expected;
    session.actual_cash = actualCash;
    session.cash_difference = diff;
    session.status = 'CLOSED';
    session.notes = notes;

    setLocalItem(STORAGE_KEYS.CASH_SESSIONS, sessions);

    this.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: session.cashier_id,
      user_name: session.cashier_name,
      action: 'TUTUP_SHIFT',
      entity_type: 'SHIFT',
      entity_id: sessionId,
      timestamp: new Date().toISOString(),
      details: `Fisik: Rp ${actualCash.toLocaleString('id-ID')}, Sistem: Rp ${expected.toLocaleString('id-ID')}, Selisih: Rp ${diff.toLocaleString('id-ID')}`,
    });
    this.setPendingCloudPush(true);

    return session;
  }

  // Cash Movements (Kas Masuk / Kas Keluar Drawer)
  public getCashMovements(): CashMovement[] {
    return getLocalItem<CashMovement[]>(STORAGE_KEYS.CASH_MOVEMENTS, []);
  }

  public addCashMovement(movement: CashMovement): void {
    const movs = this.getCashMovements();
    movs.unshift(movement);
    setLocalItem(STORAGE_KEYS.CASH_MOVEMENTS, movs);
    this.setPendingCloudPush(true);
  }

  // Audit Log
  public getAuditLog(): AuditLog[] {
    return getLocalItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOG, []);
  }

  public addAuditLog(entry: AuditLog): void {
    const logs = this.getAuditLog();
    logs.unshift(entry);
    if (logs.length > 500) logs.pop(); // Keep last 500 logs
    setLocalItem(STORAGE_KEYS.AUDIT_LOG, logs);
  }

  // Refunds
  public getRefunds(): RefundRecord[] {
    return getLocalItem<RefundRecord[]>(STORAGE_KEYS.REFUNDS, []);
  }

  public createRefund(
    txId: string,
    amount: number,
    reason: string,
    requestedBy: string,
    restock: boolean
  ): RefundRecord {
    const refunds = this.getRefunds();
    const transactions = this.getTransactions();
    const tx = transactions.find(t => t.transaction_id === txId);

    const refund: RefundRecord = {
      refund_id: 'ref_' + Date.now(),
      transaction_id: txId,
      refund_number: 'REF-' + Date.now().toString().slice(-6),
      amount,
      reason,
      status: 'APPROVED',
      approved_by: requestedBy,
      created_by: requestedBy,
      created_at: new Date().toISOString(),
      restock_items: restock,
    };

    refunds.unshift(refund);
    setLocalItem(STORAGE_KEYS.REFUNDS, refunds);

    if (tx) {
      tx.transaction_status = 'REFUNDED';
      tx.payment_status = 'REFUNDED';
      setLocalItem(STORAGE_KEYS.TRANSACTIONS, transactions);

      // If restock requested, return quantities to stock
      if (restock) {
        const products = this.getProducts();
        for (const item of tx.items) {
          const prod = products.find(p => p.product_id === item.product_id);
          if (prod && prod.stock_type === 'finished') {
            prod.stock_qty += item.quantity;
          }
        }
        setLocalItem(STORAGE_KEYS.PRODUCTS, products);
      }
    }

    this.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: requestedBy,
      user_name: 'Admin',
      action: 'PROSES_REFUND',
      entity_type: 'TRANSAKSI',
      entity_id: txId,
      timestamp: new Date().toISOString(),
      details: `Refund ${refund.refund_number}: Rp ${amount.toLocaleString('id-ID')} (${reason})`,
    });
    this.setPendingCloudPush(true);

    return refund;
  }

  // Offline Sync Queue
  public getSyncQueue(): SyncQueueItem[] {
    return getLocalItem<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  public enqueueSync(item: SyncQueueItem): void {
    const queue = this.getSyncQueue();
    queue.push(item);
    setLocalItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  public removeSyncQueueItem(opId: string): void {
    const queue = this.getSyncQueue().filter(q => q.operation_id !== opId);
    setLocalItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  // Multi-Spreadsheet Volume & Archive Registry
  public getSpreadsheetVolumes(): SpreadsheetVolume[] {
    const settings = this.getSettings();
    const volumes = [...(settings.spreadsheet_volumes || [])];
    // Ensure current google_sheet_id is represented if volumes list is empty
    if (volumes.length === 0 && settings.google_sheet_id) {
      const est = this.estimateLocalCellUsage();
      const maxCells = settings.spreadsheet_cell_limit || 10000000;
      const pct = Math.min(100, Number(((est.usedCells / maxCells) * 100).toFixed(2)));
      volumes.push({
        volume_id: 'vol_1',
        volume_number: 1,
        title: `VaiMart - ${settings.cafe_name || 'Swalayan'} Database Vol. 1`,
        spreadsheet_id: settings.google_sheet_id,
        spreadsheet_url:
          settings.google_spreadsheet_url ||
          `https://docs.google.com/spreadsheets/d/${settings.google_sheet_id}/edit`,
        folder_id: settings.google_drive_folder_id,
        status: 'ACTIVE',
        used_cells: est.usedCells,
        max_cells: maxCells,
        usage_percent: pct,
        transaction_count: this.getTransactions().length,
        created_at: settings.google_auto_created_at || settings.updated_at || new Date().toISOString(),
      });
    }
    return volumes.sort((a, b) => b.volume_number - a.volume_number);
  }

  public getArchivedVolumes(): SpreadsheetVolume[] {
    return this.getSpreadsheetVolumes().filter(v => v.status === 'ARCHIVED');
  }

  public getActiveVolume(): SpreadsheetVolume | null {
    return this.getSpreadsheetVolumes().find(v => v.status === 'ACTIVE') || null;
  }

  public upsertSpreadsheetVolume(vol: SpreadsheetVolume): void {
    const settings = this.getSettings();
    const existing = [...(settings.spreadsheet_volumes || [])];
    const idx = existing.findIndex(v => v.spreadsheet_id === vol.spreadsheet_id || v.volume_id === vol.volume_id);
    if (idx >= 0) {
      existing[idx] = vol;
    } else {
      existing.push(vol);
    }
    this.updateSettings({ spreadsheet_volumes: existing });
  }

  public estimateLocalCellUsage(): { usedCells: number; totalRows: number; breakdown: Record<string, number> } {
    const txs = this.getTransactions();
    const txItemsCount = txs.reduce((acc, t) => acc + (t.items?.length || 0), 0);
    const purchases = this.getPurchases();
    const purchaseItemsCount = purchases.reduce((acc, p) => acc + (p.items?.length || 0), 0);

    const rowsBySheet: Record<string, number> = {
      SETTINGS: 12,
      USERS: this.getUsers().length + 1,
      CATEGORIES: this.getCategories().length + 1,
      PRODUCTS: this.getProducts().length + 1,
      RECIPES: this.getRecipes().length + 1,
      INGREDIENTS: this.getIngredients().length + 1,
      SUPPLIERS: this.getSuppliers().length + 1,
      TRANSACTIONS: txs.length + 1,
      TRANSACTION_ITEMS: txItemsCount + 1,
      PAYMENTS: txs.length + 1,
      EXPENSES: this.getExpenses().length + 1,
      PURCHASES: purchases.length + 1,
      PURCHASE_ITEMS: purchaseItemsCount + 1,
      STOCK_MOVEMENTS: this.getStockMovements().length + 1,
      CASH_SESSIONS: this.getCashSessions().length + 1,
      CASH_MOVEMENTS: this.getCashMovements().length + 1,
      AUDIT_LOG: this.getAuditLog().length + 1,
      SYNC_QUEUE: this.getSyncQueue().length + 1,
      REFUNDS: this.getRefunds().length + 1,
    };

    const avgCols: Record<string, number> = {
      SETTINGS: 3,
      USERS: 9,
      CATEGORIES: 7,
      PRODUCTS: 16,
      RECIPES: 6,
      INGREDIENTS: 8,
      SUPPLIERS: 7,
      TRANSACTIONS: 17,
      TRANSACTION_ITEMS: 13,
      PAYMENTS: 11,
      EXPENSES: 9,
      PURCHASES: 10,
      PURCHASE_ITEMS: 7,
      STOCK_MOVEMENTS: 11,
      CASH_SESSIONS: 10,
      CASH_MOVEMENTS: 7,
      AUDIT_LOG: 7,
      SYNC_QUEUE: 10,
      REFUNDS: 9,
    };

    let usedCells = 0;
    let totalRows = 0;
    const breakdown: Record<string, number> = {};

    Object.entries(rowsBySheet).forEach(([sheet, rows]) => {
      const cells = rows * (avgCols[sheet] || 8);
      breakdown[sheet] = cells;
      usedCells += cells;
      totalRows += rows;
    });

    return { usedCells, totalRows, breakdown };
  }

  public archiveAndSwitchVolume(params: {
    newSpreadsheetId: string;
    newSpreadsheetUrl: string;
    newTitle: string;
    folderId?: string;
    oldUsedCells: number;
    maxCells: number;
    oldUsagePercent: number;
  }): { archivedVolume: SpreadsheetVolume; newVolume: SpreadsheetVolume } {
    const settings = this.getSettings();
    const volumes = this.getSpreadsheetVolumes();
    const now = new Date().toISOString();

    const txs = this.getTransactions();
    const exps = this.getExpenses();
    const pours = this.getPurchases();
    const sessions = this.getCashSessions();
    const movements = this.getCashMovements();

    const closedSessions = sessions.filter(s => s.status === 'CLOSED');
    const openSessions = sessions.filter(s => s.status === 'OPEN');

    const sortedDates = txs
      .map(t => t.business_date || t.created_at.slice(0, 10))
      .sort();

    const currentActive = volumes.find(v => v.status === 'ACTIVE');
    const currentVolNum = currentActive?.volume_number || volumes.length || 1;
    const oldSpreadsheetId = settings.google_sheet_id || currentActive?.spreadsheet_id || `archive_${Date.now()}`;
    const oldSpreadsheetUrl =
      settings.google_spreadsheet_url ||
      currentActive?.spreadsheet_url ||
      `https://docs.google.com/spreadsheets/d/${oldSpreadsheetId}/edit`;

    const archivedVolume: SpreadsheetVolume = {
      volume_id: currentActive?.volume_id || `vol_${currentVolNum}_${Date.now()}`,
      volume_number: currentVolNum,
      title: currentActive?.title || `${settings.cafe_name} Database Vol. ${currentVolNum}`,
      spreadsheet_id: oldSpreadsheetId,
      spreadsheet_url: oldSpreadsheetUrl,
      folder_id: params.folderId || settings.google_drive_folder_id,
      status: 'ARCHIVED',
      used_cells: params.oldUsedCells,
      max_cells: params.maxCells,
      usage_percent: params.oldUsagePercent,
      transaction_count: txs.length,
      created_at: currentActive?.created_at || settings.google_auto_created_at || now,
      archived_at: now,
      date_range_start: sortedDates[0] || now.slice(0, 10),
      date_range_end: sortedDates[sortedDates.length - 1] || now.slice(0, 10),
      local_snapshot: {
        transactions: txs,
        expenses: exps,
        purchases: pours,
        cash_sessions: closedSessions,
        cash_movements: movements,
      },
    };

    const nextVolNum = currentVolNum + 1;
    const newVolume: SpreadsheetVolume = {
      volume_id: `vol_${nextVolNum}_${Date.now()}`,
      volume_number: nextVolNum,
      title: params.newTitle,
      spreadsheet_id: params.newSpreadsheetId,
      spreadsheet_url: params.newSpreadsheetUrl,
      folder_id: params.folderId || settings.google_drive_folder_id,
      status: 'ACTIVE',
      used_cells: this.getProducts().length * 16 + this.getUsers().length * 9 + 120,
      max_cells: params.maxCells,
      usage_percent: 0.1,
      transaction_count: 0,
      created_at: now,
    };

    const updatedVolumes = [
      newVolume,
      archivedVolume,
      ...volumes.filter(v => v.volume_id !== archivedVolume.volume_id && v.spreadsheet_id !== oldSpreadsheetId),
    ];

    // Rotate active transactional logs to keep active spreadsheet clean while preserving open shift
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, []);
    setLocalItem(STORAGE_KEYS.EXPENSES, []);
    setLocalItem(STORAGE_KEYS.PURCHASES, []);
    setLocalItem(STORAGE_KEYS.CASH_SESSIONS, openSessions);
    setLocalItem(STORAGE_KEYS.CASH_MOVEMENTS, []);

    this.updateSettings({
      google_sheet_id: params.newSpreadsheetId,
      google_spreadsheet_url: params.newSpreadsheetUrl,
      google_drive_folder_id: params.folderId || settings.google_drive_folder_id,
      spreadsheet_volumes: updatedVolumes,
    });

    this.addAuditLog({
      log_id: 'log_' + Date.now(),
      user_id: 'SYSTEM_ROTATION',
      user_name: 'Auto-Rotate 80% Engine',
      action: 'SPREADSHEET_AUTO_ROTATE',
      entity_type: 'DATABASE',
      entity_id: params.newSpreadsheetId,
      timestamp: now,
      details: `Spreadsheet Vol. ${currentVolNum} (${params.oldUsagePercent.toFixed(1)}%) diarsipkan (${txs.length} transaksi) dan otomatis membuat Spreadsheet baru Vol. ${nextVolNum}.`,
    });

    return { archivedVolume, newVolume };
  }

  public getTransactionsByVolume(volumeSelector: 'ACTIVE' | 'ALL' | string): Transaction[] {
    const active = this.getTransactions();
    if (volumeSelector === 'ACTIVE') return active;
    const archivedVols = this.getArchivedVolumes();
    if (volumeSelector === 'ALL') {
      const archivedTxs = archivedVols.flatMap(v => v.local_snapshot?.transactions || []);
      return [...active, ...archivedTxs];
    }
    const target = archivedVols.find(v => v.volume_id === volumeSelector || v.spreadsheet_id === volumeSelector);
    return target?.local_snapshot?.transactions || [];
  }

  public getExpensesByVolume(volumeSelector: 'ACTIVE' | 'ALL' | string): Expense[] {
    const active = this.getExpenses();
    if (volumeSelector === 'ACTIVE') return active;
    const archivedVols = this.getArchivedVolumes();
    if (volumeSelector === 'ALL') {
      const archivedExps = archivedVols.flatMap(v => v.local_snapshot?.expenses || []);
      return [...active, ...archivedExps];
    }
    const target = archivedVols.find(v => v.volume_id === volumeSelector || v.spreadsheet_id === volumeSelector);
    return target?.local_snapshot?.expenses || [];
  }

  public getPurchasesByVolume(volumeSelector: 'ACTIVE' | 'ALL' | string): Purchase[] {
    const active = this.getPurchases();
    if (volumeSelector === 'ACTIVE') return active;
    const archivedVols = this.getArchivedVolumes();
    if (volumeSelector === 'ALL') {
      const archivedPurs = archivedVols.flatMap(v => v.local_snapshot?.purchases || []);
      return [...active, ...archivedPurs];
    }
    const target = archivedVols.find(v => v.volume_id === volumeSelector || v.spreadsheet_id === volumeSelector);
    return target?.local_snapshot?.purchases || [];
  }

  public getCashSessionsByVolume(volumeSelector: 'ACTIVE' | 'ALL' | string): CashSession[] {
    const active = this.getCashSessions();
    if (volumeSelector === 'ACTIVE') return active;
    const archivedVols = this.getArchivedVolumes();
    if (volumeSelector === 'ALL') {
      const archivedSessions = archivedVols.flatMap(v => v.local_snapshot?.cash_sessions || []);
      return [...active, ...archivedSessions];
    }
    const target = archivedVols.find(v => v.volume_id === volumeSelector || v.spreadsheet_id === volumeSelector);
    return target?.local_snapshot?.cash_sessions || [];
  }

  public getCashMovementsByVolume(volumeSelector: 'ACTIVE' | 'ALL' | string): CashMovement[] {
    const active = this.getCashMovements();
    if (volumeSelector === 'ACTIVE') return active;
    const archivedVols = this.getArchivedVolumes();
    if (volumeSelector === 'ALL') {
      const archivedMovs = archivedVols.flatMap(v => v.local_snapshot?.cash_movements || []);
      return [...active, ...archivedMovs];
    }
    const target = archivedVols.find(v => v.volume_id === volumeSelector || v.spreadsheet_id === volumeSelector);
    return target?.local_snapshot?.cash_movements || [];
  }

  // Financial Summary Calculation
  public calculateFinancialSummary(
    startDate?: string,
    endDate?: string,
    volumeSelector: 'ACTIVE' | 'ALL' | string = 'ACTIVE'
  ): DailySummary {
    const transactions = this.getTransactionsByVolume(volumeSelector).filter(t => {
      if (t.transaction_status === 'CANCELLED') return false;
      const txDate = t.business_date || t.created_at.slice(0, 10);
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });

    const expenses = this.getExpensesByVolume(volumeSelector).filter(e => {
      const expDate = e.expense_date;
      if (startDate && expDate < startDate) return false;
      if (endDate && expDate > endDate) return false;
      return true;
    });

    let grossSales = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalService = 0;
    let cashSales = 0;
    let qrisSales = 0;
    let otherSales = 0;
    let cogs = 0; // HPP

    for (const tx of transactions) {
      if (tx.transaction_status === 'REFUNDED') continue;

      grossSales += tx.subtotal;
      totalDiscount += tx.discount;
      totalTax += tx.tax;
      totalService += tx.service_charge;

      if (tx.payment_method === 'TUNAI') cashSales += tx.total;
      else if (tx.payment_method === 'QRIS_STATIS' || tx.payment_method === 'QRIS_DINAMIS') qrisSales += tx.total;
      else otherSales += tx.total;

      for (const item of tx.items) {
        cogs += (item.cost_snapshot || 0) * item.quantity;
      }
    }

    const netSales = grossSales - totalDiscount;
    const grossProfit = netSales - cogs;
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    return {
      business_date: startDate || new Date().toISOString().slice(0, 10),
      gross_sales: grossSales,
      discounts: totalDiscount,
      refunds: 0,
      net_sales: netSales,
      tax: totalTax,
      service_charge: totalService,
      cash_sales: cashSales,
      qris_sales: qrisSales,
      other_sales: otherSales,
      expenses: totalExpenses,
      cogs,
      gross_profit: grossProfit,
      net_profit: netProfit,
      transaction_count: transactions.length,
    };
  }

  // Backup & Restore
  public exportFullBackup(): string {
    const data = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      settings: this.getSettings(),
      users: this.getStoreUsers(),
      categories: this.getCategories(),
      products: this.getProducts(),
      ingredients: this.getIngredients(),
      recipes: this.getRecipes(),
      suppliers: this.getSuppliers(),
      transactions: this.getTransactions(),
      expenses: this.getExpenses(),
      purchases: this.getPurchases(),
      stock_movements: this.getStockMovements(),
      cash_sessions: this.getCashSessions(),
      cash_movements: this.getCashMovements(),
      audit_log: this.getAuditLog(),
      refunds: this.getRefunds(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importFullBackup(jsonString: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.settings || !data.products) {
        return { success: false, error: 'Format data backup tidak valid' };
      }
      if (data.settings) setLocalItem(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.users) setLocalItem(STORAGE_KEYS.USERS, data.users);
      if (data.categories) setLocalItem(STORAGE_KEYS.CATEGORIES, data.categories);
      if (data.products) setLocalItem(STORAGE_KEYS.PRODUCTS, data.products);
      if (data.ingredients) setLocalItem(STORAGE_KEYS.INGREDIENTS, data.ingredients);
      if (data.recipes) setLocalItem(STORAGE_KEYS.RECIPES, data.recipes);
      if (data.suppliers) setLocalItem(STORAGE_KEYS.SUPPLIERS, data.suppliers);
      if (data.transactions) setLocalItem(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (data.expenses) setLocalItem(STORAGE_KEYS.EXPENSES, data.expenses);
      if (data.purchases) setLocalItem(STORAGE_KEYS.PURCHASES, data.purchases);
      if (data.stock_movements) setLocalItem(STORAGE_KEYS.STOCK_MOVEMENTS, data.stock_movements);
      if (data.cash_sessions) setLocalItem(STORAGE_KEYS.CASH_SESSIONS, data.cash_sessions);
      if (data.cash_movements) setLocalItem(STORAGE_KEYS.CASH_MOVEMENTS, data.cash_movements);
      if (data.audit_log) setLocalItem(STORAGE_KEYS.AUDIT_LOG, data.audit_log);
      if (data.refunds) setLocalItem(STORAGE_KEYS.REFUNDS, data.refunds);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Hydrate full local store database from an existing Google Spreadsheet snapshot (Multi-Device / Multi-User Pull)
   */
  public hydrateFromCloud(payload: {
    settings?: Partial<CafeSettings>;
    users?: User[];
    categories?: Category[];
    products?: Product[];
    ingredients?: Ingredient[];
    recipes?: Recipe[];
    suppliers?: Supplier[];
    transactions?: Transaction[];
    expenses?: Expense[];
    purchases?: Purchase[];
    stock_movements?: StockMovement[];
    cash_sessions?: CashSession[];
    cash_movements?: CashMovement[];
    audit_log?: AuditLog[];
    refunds?: RefundRecord[];
  }): void {
    const mergedSettings: CafeSettings = {
      ...DEFAULT_SETTINGS,
      ...(payload.settings || {}),
      updated_at: new Date().toISOString(),
    };
    setLocalItem(STORAGE_KEYS.SETTINGS, mergedSettings);

    if (payload.users && payload.users.length > 0) {
      const storeUsers = payload.users.filter(
        u => u.role !== 'SUPERADMIN' && u.username.toLowerCase() !== 'divailean'
      );
      setLocalItem(STORAGE_KEYS.USERS, storeUsers.length > 0 ? storeUsers : DEFAULT_USERS);
    }
    if (payload.categories && payload.categories.length > 0) {
      setLocalItem(STORAGE_KEYS.CATEGORIES, payload.categories);
    }
    if (payload.products && payload.products.length > 0) {
      setLocalItem(STORAGE_KEYS.PRODUCTS, payload.products);
    }
    if (payload.ingredients) setLocalItem(STORAGE_KEYS.INGREDIENTS, payload.ingredients);
    if (payload.recipes) setLocalItem(STORAGE_KEYS.RECIPES, payload.recipes);
    if (payload.suppliers) setLocalItem(STORAGE_KEYS.SUPPLIERS, payload.suppliers);
    if (payload.transactions) setLocalItem(STORAGE_KEYS.TRANSACTIONS, payload.transactions);
    if (payload.expenses) setLocalItem(STORAGE_KEYS.EXPENSES, payload.expenses);
    if (payload.purchases) setLocalItem(STORAGE_KEYS.PURCHASES, payload.purchases);
    if (payload.stock_movements) setLocalItem(STORAGE_KEYS.STOCK_MOVEMENTS, payload.stock_movements);
    if (payload.cash_sessions) setLocalItem(STORAGE_KEYS.CASH_SESSIONS, payload.cash_sessions);
    if (payload.cash_movements) setLocalItem(STORAGE_KEYS.CASH_MOVEMENTS, payload.cash_movements);
    if (payload.audit_log) setLocalItem(STORAGE_KEYS.AUDIT_LOG, payload.audit_log);
    if (payload.refunds) setLocalItem(STORAGE_KEYS.REFUNDS, payload.refunds);

    // Clear stale offline queue & pending push flags after pulling authoritative cloud data
    setLocalItem(STORAGE_KEYS.SYNC_QUEUE, []);
    setLocalItem(STORAGE_KEYS.VOIDED_ITEMS, []);
    setLocalItem(STORAGE_KEYS.HELD_ORDERS, []);
    setLocalItem(STORAGE_KEYS.PENDING_CLOUD_PUSH, false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('martvai:data-updated'));
    }
  }

  /**
   * Disconnect current Google Spreadsheet workspace cleanly when switching user/account on same device
   */
  public resetWorkspaceToDefaults(): void {
    setLocalItem(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() });
    setLocalItem(STORAGE_KEYS.USERS, DEFAULT_USERS);
    setLocalItem(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    setLocalItem(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    setLocalItem(STORAGE_KEYS.INGREDIENTS, DEFAULT_INGREDIENTS);
    setLocalItem(STORAGE_KEYS.RECIPES, DEFAULT_RECIPES);
    setLocalItem(STORAGE_KEYS.SUPPLIERS, DEFAULT_SUPPLIERS);
    setLocalItem(STORAGE_KEYS.TRANSACTIONS, []);
    setLocalItem(STORAGE_KEYS.EXPENSES, []);
    setLocalItem(STORAGE_KEYS.PURCHASES, []);
    setLocalItem(STORAGE_KEYS.STOCK_MOVEMENTS, []);
    setLocalItem(STORAGE_KEYS.CASH_SESSIONS, []);
    setLocalItem(STORAGE_KEYS.CASH_MOVEMENTS, []);
    setLocalItem(STORAGE_KEYS.AUDIT_LOG, []);
    setLocalItem(STORAGE_KEYS.REFUNDS, []);
    setLocalItem(STORAGE_KEYS.SYNC_QUEUE, []);
    setLocalItem(STORAGE_KEYS.VOIDED_ITEMS, []);
    setLocalItem(STORAGE_KEYS.HELD_ORDERS, []);
    setLocalItem(STORAGE_KEYS.PENDING_CLOUD_PUSH, false);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('martvai:data-updated'));
    }
  }
}

export const db = DatabaseService.getInstance();
