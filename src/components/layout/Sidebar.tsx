import React from 'react';
import {
  ShoppingCart,
  Receipt,
  Layers,
  Coffee,
  Package,
  TrendingDown,
  ShoppingBag,
  Truck,
  BarChart3,
  Users,
  ShieldAlert,
  Settings,
  HelpCircle,
  X,
  FileSpreadsheet,
  Coins,
  KeyRound,
  Calculator,
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  currentPage: string;
  onSelectPage: (page: string) => void;
  userRole: UserRole;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  category: 'OPERATIONAL' | 'CATALOG' | 'MANAGEMENT' | 'SUPERADMIN';
}

const NAV_ITEMS: NavItem[] = [
  // Operational (Kasir & Admin)
  { id: 'pos', label: 'Kasir Barcode Swalayan', icon: ShoppingCart, roles: ['KASIR', 'ADMIN'], category: 'OPERATIONAL' },
  { id: 'transactions', label: 'Riwayat Struk Penjualan', icon: Receipt, roles: ['KASIR', 'ADMIN'], category: 'OPERATIONAL' },
  { id: 'shifts', label: 'Kas & Shift Kasir', icon: Coins, roles: ['KASIR', 'ADMIN'], category: 'OPERATIONAL' },

  // Catalog & Inventory (Admin only)
  { id: 'menu', label: 'Katalog Produk & Barcode', icon: Package, roles: ['ADMIN'], category: 'CATALOG' },
  { id: 'categories', label: 'Kategori Produk', icon: Layers, roles: ['ADMIN'], category: 'CATALOG' },
  { id: 'stock', label: 'Stok Rak & Opname', icon: Package, roles: ['ADMIN'], category: 'CATALOG' },
  { id: 'expenses', label: 'Beban Operasional Toko', icon: TrendingDown, roles: ['ADMIN'], category: 'CATALOG' },
  { id: 'purchases', label: 'Pembelian Restok PO', icon: ShoppingBag, roles: ['ADMIN'], category: 'CATALOG' },
  { id: 'suppliers', label: 'Distributor & Pemasok', icon: Truck, roles: ['ADMIN'], category: 'CATALOG' },

  // Management & Settings (Admin only)
  { id: 'reports', label: 'Laporan Keuangan Swalayan', icon: BarChart3, roles: ['ADMIN'], category: 'MANAGEMENT' },
  { id: 'cashledger', label: 'Buku Kas Lengkap', icon: Coins, roles: ['ADMIN'], category: 'MANAGEMENT' },
  { id: 'calculator', label: 'Kalkulator Toko & Finansial', icon: Calculator, roles: ['ADMIN'], category: 'MANAGEMENT' },
  { id: 'users', label: 'Manajemen Kasir & Admin', icon: Users, roles: ['ADMIN'], category: 'MANAGEMENT' },
  { id: 'license', label: 'Status Lisensi Aplikasi', icon: KeyRound, roles: ['ADMIN'], category: 'MANAGEMENT' },
  { id: 'audit', label: 'Audit Log & Refund', icon: ShieldAlert, roles: ['ADMIN'], category: 'MANAGEMENT' },
  { id: 'settings', label: 'Pengaturan Toko & Sheets', icon: Settings, roles: ['ADMIN'], category: 'MANAGEMENT' },
];


export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  userRole,
  isOpen,
  onClose,
}) => {
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const operationalItems = visibleItems.filter(i => i.category === 'OPERATIONAL');
  const catalogItems = visibleItems.filter(i => i.category === 'CATALOG');
  const managementItems = visibleItems.filter(i => i.category === 'MANAGEMENT');

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    const isLicenseItem = item.id === 'license';

    return (
      <button
        key={item.id}
        onClick={() => {
          onSelectPage(item.id);
          onClose();
        }}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
          isActive
            ? 'bg-[#2D1B14] text-white shadow-sm'
            : isLicenseItem
            ? 'text-amber-900 font-bold bg-amber-50 hover:bg-amber-100/70'
            : 'text-stone-700 hover:bg-stone-200/70 hover:text-stone-900'
        }`}
      >
        <div className="flex items-center gap-3 truncate">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : isLicenseItem ? 'text-amber-700' : 'text-stone-500'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {isLicenseItem && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 bg-amber-200 text-amber-900">
            Lisensi
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-2xs"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 border-r border-stone-200 bg-[#FAF7F2] p-4 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between overflow-y-auto`}
      >
        <div className="space-y-6">
          {/* Mobile close button */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-200 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Menu Navigasi
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-500 hover:bg-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {operationalItems.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-stone-400">
                Operasional Kasir
              </div>
              {operationalItems.map(renderNavButton)}
            </div>
          )}

          {catalogItems.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-stone-400">
                Katalog & Inventori
              </div>
              {catalogItems.map(renderNavButton)}
            </div>
          )}

          {managementItems.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-stone-400">
                Keuangan & Sistem
              </div>
              {managementItems.map(renderNavButton)}
            </div>
          )}
        </div>

        {/* Database Status Mini Card */}
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets DB</span>
          </div>
          <p className="mt-1 text-[11px] text-stone-500 leading-tight">
            21 tabel terhubung & siap sinkronisasi otomatis.
          </p>
        </div>
      </aside>
    </>
  );
};

