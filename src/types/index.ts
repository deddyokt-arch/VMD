export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'KASIR';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export type RegistrationStatus =
  | 'MENUNGGU_PERSETUJUAN'
  | 'DIPROSES'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'DIBATALKAN';

export interface CustomerRegistration {
  registration_id: string; // e.g. "REG-VAI-20261027-1092"
  owner_name: string;
  business_name: string;
  email: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string; // Default: "Indonesia"
  business_type: string; // e.g. "Supermarket & Swalayan", "Minimarket", "Toko Kelontong", "Lainnya"
  outlets_count: number;
  devices_count: number;
  platform: 'Android' | 'Windows' | 'Both';
  notes?: string;
  agreed_terms: boolean;
  status: RegistrationStatus;
  package_assigned?: LicenseType;
  package_duration_days?: number;
  submitted_at: string;
  updated_at: string;
  approved_at?: string;
  rejection_reason?: string;
  tenant_id?: string;
  license_key?: string;
}

export interface Tenant {
  tenant_id: string;
  business_name: string;
  owner_user_id: string;
  owner_name: string;
  owner_email: string;
  spreadsheet_id: string;
  drive_folder_id: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface User {
  user_id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  pin_hash?: string;
  tenant_id?: string;
  created_at: string;
  last_login?: string;
}

export type LicenseType = 'DEMO' | 'MONTHLY' | 'ANNUAL' | 'FULL';
export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'REVOKED';

export interface AppLicense {
  license_key: string;
  license_type: LicenseType;
  client_name: string;
  client_email: string;
  activated_at: string;
  expires_at: string | null; // null for lifetime full
  max_transactions: number | null; // e.g. 50 for demo
  status: LicenseStatus;
  created_by: string;
  created_at: string;
  notes?: string;
}

export interface SpreadsheetArchiveSnapshot {
  transactions: Transaction[];
  expenses: Expense[];
  purchases: Purchase[];
  cash_sessions: CashSession[];
  cash_movements: CashMovement[];
}

export interface SpreadsheetVolume {
  volume_id: string;
  volume_number: number;
  title: string;
  spreadsheet_id: string;
  spreadsheet_url: string;
  folder_id?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  used_cells: number;
  max_cells: number;
  usage_percent: number;
  transaction_count: number;
  created_at: string;
  archived_at?: string;
  date_range_start?: string;
  date_range_end?: string;
  local_snapshot?: SpreadsheetArchiveSnapshot;
}

export interface CafeSettings {
  cafe_name: string;
  owner_name: string;
  address: string;
  phone: string;
  email: string;
  currency: string; // e.g. "IDR"
  currency_symbol: string; // e.g. "Rp"
  timezone: string; // e.g. "Asia/Jakarta"
  logo_url?: string;
  tax_percentage: number; // e.g. 10 for PPN
  tax_enabled: boolean;
  service_charge_percentage: number; // e.g. 5
  service_charge_enabled: boolean;
  receipt_footer: string;
  receipt_paper_size: '58mm' | '80mm';
  qris_static_image?: string;
  qris_merchant_name?: string;
  qris_nmid?: string;
  google_account_email?: string;
  google_sheet_id?: string;
  google_spreadsheet_url?: string;
  google_drive_folder_id?: string;
  google_drive_folder_url?: string;
  google_script_url?: string;
  google_auto_synced?: boolean;
  google_auto_created_at?: string;
  google_oauth_connected?: boolean;
  google_connected_user_name?: string;
  google_last_diagnostics?: { success: boolean; message: string; timestamp: string };
  spreadsheet_volumes?: SpreadsheetVolume[];
  spreadsheet_cell_limit?: number; // Default 10,000,000 cells (Google Sheets limit), configurable for monitoring/testing
  spreadsheet_rotation_threshold?: number; // Default 80 (%)
  is_configured: boolean;
  allow_negative_stock: boolean;
  active_license_key?: string;
  updated_at: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  description: string;
  image_url?: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProductVariant {
  variant_id: string;
  product_id: string;
  variant_name: string; // e.g. "Regular", "Large", "Less Sugar", "Extra Shot"
  group_name?: string; // e.g. "Ukuran", "Gula", "Topping"
  additional_price: number;
  sku?: string;
  barcode?: string;
  active: boolean;
}

export type StockType = 'finished' | 'recipe'; // 'finished': direct product stock, 'recipe': deducts raw ingredients

export interface Product {
  product_id: string;
  sku: string;
  barcode: string;
  product_name: string;
  category_id: string;
  description: string;
  image_url: string;
  selling_price: number;
  cost_price: number; // HPP (Harga Pokok Penjualan)
  stock_type: StockType;
  stock_qty: number;
  minimum_stock: number;
  unit: string; // "Pcs", "Pack", "Dus", "Kg", "Botol"
  brand?: string; // Brand/Merk (Indofood, Unilever, dll.)
  rack_location?: string; // Lokasi Rak (Rak A-01, Cold Display)
  wholesale_price?: number; // Harga Grosir / Partai
  active: boolean;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

export interface Ingredient {
  ingredient_id: string;
  ingredient_name: string;
  unit: string; // "gram", "ml", "pcs", "kg", "liter"
  stock_qty: number;
  minimum_stock: number;
  cost_per_unit: number; // Harga per satuan
  supplier_id?: string;
  updated_at: string;
}

export interface Recipe {
  recipe_id: string;
  product_id: string;
  ingredient_id: string;
  quantity_used: number;
  unit: string;
  created_at: string;
}

export type OrderType = 'Belanja Reguler' | 'Grosir / Partai' | 'Online / Delivery';

export type PaymentMethod = 'TUNAI' | 'QRIS_STATIS' | 'QRIS_DINAMIS' | 'DEBIT_KREDIT' | 'TRANSFER' | 'SPLIT';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type TransactionStatus = 'COMPLETED' | 'HOLD' | 'CANCELLED' | 'REFUNDED';

export interface CartItemModifier {
  group: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // unique cart line id
  product: Product;
  quantity: number;
  selected_variants: CartItemModifier[];
  item_price: number; // base + modifiers
  item_cost: number;
  discount: number; // discount per line
  notes: string;
  line_total: number;
}

export interface TransactionItemSnapshot {
  item_id: string;
  transaction_id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  cost_snapshot: number;
  line_total: number;
  notes: string;
  variant_snapshot: string;
}

export interface Transaction {
  transaction_id: string;
  invoice_number: string;
  business_date: string; // YYYY-MM-DD
  cashier_id: string;
  cashier_name: string;
  order_type: OrderType;
  table_number?: string;
  customer_name?: string;
  subtotal: number;
  discount: number;
  tax: number;
  service_charge: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_status: TransactionStatus;
  notes: string;
  created_at: string;
  synced_at?: string;
  items: TransactionItemSnapshot[];
  is_offline_created?: boolean;
}

export interface PaymentRecord {
  payment_id: string;
  transaction_id: string;
  provider: string; // "CASH", "QRIS_BCA", "MIDTRANS", "MANUAL"
  payment_method: PaymentMethod;
  amount: number;
  external_reference?: string;
  provider_status: string;
  paid_at: string;
  verified_by: string; // cashier user id
  idempotency_key: string;
  created_at: string;
}

export interface Expense {
  expense_id: string;
  expense_date: string;
  category: 'Operasional' | 'Listrik & Air' | 'Internet' | 'Gaji Karyawan' | 'Sewa Tempat' | 'Bahan Baku' | 'Peralatan' | 'Lainnya';
  description: string;
  amount: number;
  payment_method: string;
  receipt_url?: string;
  created_by: string;
  created_at: string;
}

export interface Supplier {
  supplier_id: string;
  supplier_name: string;
  phone: string;
  address: string;
  email: string;
  notes: string;
  active: boolean;
}

export interface PurchaseItem {
  purchase_item_id: string;
  purchase_id: string;
  ingredient_id?: string;
  product_id?: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
}

export interface Purchase {
  purchase_id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_date: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_status: 'LUNAS' | 'HUTANG';
  notes: string;
  created_by: string;
  items: PurchaseItem[];
}

export type MovementType = 'in' | 'out' | 'adjustment' | 'sale' | 'purchase' | 'return';

export interface StockMovement {
  movement_id: string;
  movement_date: string;
  item_type: 'ingredient' | 'product';
  item_id: string;
  item_name: string;
  movement_type: MovementType;
  quantity_in: number;
  quantity_out: number;
  balance_after: number;
  reference_id: string; // transaction_id or purchase_id
  notes: string;
  created_by: string;
}

export interface CashSession {
  session_id: string;
  cashier_id: string;
  cashier_name: string;
  opening_time: string;
  opening_cash: number;
  closing_time?: string;
  expected_cash: number; // opening + cash_sales + cash_in - cash_out
  actual_cash?: number;
  cash_difference?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface CashMovement {
  movement_id: string;
  session_id: string;
  movement_type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  description: string;
  created_by: string;
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  details: string;
}

export interface RefundRecord {
  refund_id: string;
  transaction_id: string;
  refund_number: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  created_by: string;
  created_at: string;
  restock_items: boolean;
}

export interface SyncQueueItem {
  operation_id: string;
  device_id: string;
  local_transaction_id: string;
  operation_type: 'CREATE_TRANSACTION' | 'UPDATE_STOCK' | 'EXPENSE' | 'SHIFT_CLOSE';
  payload_json: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  retry_count: number;
  created_at: string;
  synced_at?: string;
  error_message?: string;
}

export interface DailySummary {
  business_date: string;
  gross_sales: number;
  discounts: number;
  refunds: number;
  net_sales: number;
  tax: number;
  service_charge: number;
  cash_sales: number;
  qris_sales: number;
  other_sales: number;
  expenses: number;
  cogs: number; // HPP
  gross_profit: number; // net_sales - cogs
  net_profit: number; // gross_profit - expenses
  transaction_count: number;
}

export interface VoidedItemRecord {
  void_id: string;
  timestamp: string;
  cashier_id: string;
  cashier_name: string;
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reason?: string;
}

export interface HeldTransaction {
  hold_id: string;
  hold_name: string;
  created_at: string;
  cashier_id: string;
  cashier_name: string;
  items: CartItem[];
  order_type: OrderType;
  table_number?: string;
  customer_name?: string;
  discount: number;
  subtotal: number;
}

