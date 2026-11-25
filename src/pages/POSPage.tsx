import React, { useState, useEffect } from 'react';
import {
  Search,
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  Bookmark,
  BookmarkCheck,
  ShoppingBag,
  Sparkles,
  Utensils,
  Coffee,
  CheckCircle,
  Tag,
  ArrowRight,
  User as UserIcon,
  List,
  LayoutGrid,
} from 'lucide-react';
import {
  Product,
  Category,
  CartItem,
  OrderType,
  User,
  Transaction,
  CartItemModifier,
  HeldTransaction,
} from '../types';
import { db } from '../services/db';
import { formatRupiah, formatDateTime } from '../services/printer';
import { licenseManager } from '../services/license';
import { ProductModifierModal } from '../components/pos/ProductModifierModal';
import { BarcodeScannerModal } from '../components/pos/BarcodeScannerModal';
import { CheckoutModal } from '../components/pos/CheckoutModal';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { useDialog } from '../contexts/DialogContext';

interface POSPageProps {
  currentUser: User;
}

interface HeldOrder {
  id: string;
  timestamp: string;
  customerName: string;
  orderType: OrderType;
  tableNumber: string;
  items: CartItem[];
  discount: number;
}

export const POSPage: React.FC<POSPageProps> = ({ currentUser }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('Belanja Reguler');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [heldOrders, setHeldOrders] = useState<HeldTransaction[]>(db.getHeldTransactions());
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);

  // Modals
  const [selectedProductForModifier, setSelectedProductForModifier] = useState<Product | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const settings = db.getSettings();
  const { confirmAction, showAlert, toast } = useDialog();

  useEffect(() => {
    loadData();
  }, []);

  const refreshHeldOrders = () => {
    setHeldOrders(db.getHeldTransactions());
  };

  const playScannerBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  const loadData = () => {
    setCategories(db.getCategories().filter(c => c.active));
    setProducts(db.getProducts().filter(p => p.active));
    refreshHeldOrders();
  };

  // Filtered products
  const filteredProducts = products.filter(p => {
    const matchesCategory =
      selectedCategoryId === 'ALL' || p.category_id === selectedCategoryId;
    const matchesSearch =
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Handle instant Barcode Scan on Enter or fast scanner input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      // Try exact barcode or SKU match first
      const exactMatch = products.find(
        p => p.barcode.toLowerCase() === query || p.sku.toLowerCase() === query
      );

      if (exactMatch) {
        playScannerBeep();
        handleProductCardClick(exactMatch);
        setSearchQuery('');
      } else if (filteredProducts.length === 1) {
        playScannerBeep();
        handleProductCardClick(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  // Cart Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.line_total, 0);
  const discountTotal = cartDiscount;
  const taxableBase = Math.max(0, subtotal - discountTotal);
  const tax = settings.tax_enabled ? Math.round((taxableBase * settings.tax_percentage) / 100) : 0;
  const serviceCharge = settings.service_charge_enabled
    ? Math.round((taxableBase * settings.service_charge_percentage) / 100)
    : 0;
  const grandTotal = taxableBase + tax + serviceCharge;

  // Add product: if it has variants, open modifier modal; otherwise add directly
  const handleProductCardClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForModifier(product);
    } else {
      addToCartDirect(product, 1, [], '', product.selling_price);
    }
  };

  const addToCartDirect = (
    product: Product,
    quantity: number,
    modifiers: CartItemModifier[],
    notes: string,
    calculatedPrice: number
  ) => {
    setCartItems(prev => {
      // Check if same product with same modifiers and notes already in cart
      const modKey = modifiers.map(m => m.name).sort().join('|');
      const existingIdx = prev.findIndex(
        i =>
          i.product.product_id === product.product_id &&
          i.selected_variants.map(m => m.name).sort().join('|') === modKey &&
          i.notes === notes
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        const item = next[existingIdx];
        const newQty = item.quantity + quantity;
        next[existingIdx] = {
          ...item,
          quantity: newQty,
          line_total: item.item_price * newQty - item.discount,
        };
        return next;
      }

      const newItem: CartItem = {
        id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        product,
        quantity,
        selected_variants: modifiers,
        item_price: calculatedPrice,
        item_cost: product.cost_price,
        discount: 0,
        notes,
        line_total: calculatedPrice * quantity,
      };
      return [...prev, newItem];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(item => {
          if (item.id === cartId) {
            const nextQty = item.quantity + delta;
            if (delta < 0) {
              // Record voided item log for admin
              db.recordVoidedItem({
                void_id: 'void_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                timestamp: new Date().toISOString(),
                cashier_id: currentUser.user_id,
                cashier_name: currentUser.full_name,
                product_id: item.product.product_id,
                product_name: item.product.product_name,
                sku: item.product.sku,
                barcode: item.product.barcode,
                quantity: Math.abs(delta),
                unit_price: item.item_price,
                total_price: item.item_price * Math.abs(delta),
                reason: 'Pengurangan Qty di Keranjang Kasir',
              });
            }
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              line_total: item.item_price * nextQty - item.discount,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (cartId: string) => {
    const item = cartItems.find(i => i.id === cartId);
    if (item) {
      db.recordVoidedItem({
        void_id: 'void_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        cashier_id: currentUser.user_id,
        cashier_name: currentUser.full_name,
        product_id: item.product.product_id,
        product_name: item.product.product_name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        quantity: item.quantity,
        unit_price: item.item_price,
        total_price: item.line_total,
        reason: 'Hapus Item dari Keranjang Kasir',
      });
    }
    setCartItems(prev => prev.filter(i => i.id !== cartId));
  };

  const clearCart = () => {
    if (cartItems.length > 0) {
      for (const item of cartItems) {
        db.recordVoidedItem({
          void_id: 'void_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          timestamp: new Date().toISOString(),
          cashier_id: currentUser.user_id,
          cashier_name: currentUser.full_name,
          product_id: item.product.product_id,
          product_name: item.product.product_name,
          sku: item.product.sku,
          barcode: item.product.barcode,
          quantity: item.quantity,
          unit_price: item.item_price,
          total_price: item.line_total,
          reason: 'Kosongkan Seluruh Keranjang Kasir',
        });
      }
    }
    setCartItems([]);
    setCartDiscount(0);
    setTableNumber('');
    setCustomerName('');
  };

  // Hold / Recall Order
  const handleHoldOrder = () => {
    if (cartItems.length === 0) return;
    const refName = customerName || tableNumber || 'Hold #' + (heldOrders.length + 1);
    const held: HeldTransaction = {
      hold_id: 'hold_' + Date.now(),
      hold_name: refName,
      created_at: new Date().toISOString(),
      cashier_id: currentUser.user_id,
      cashier_name: currentUser.full_name,
      items: [...cartItems],
      order_type: orderType,
      table_number: tableNumber,
      customer_name: customerName,
      discount: cartDiscount,
      subtotal: grandTotal,
    };

    db.saveHeldTransaction(held);
    refreshHeldOrders();
    setCartItems([]);
    setCartDiscount(0);
    setTableNumber('');
    setCustomerName('');
    toast(`Keranjang belanja "${refName}" berhasil ditahan sementara!`, 'success');
  };

  const handleRecallOrder = (held: HeldTransaction) => {
    setCartItems(held.items);
    setOrderType(held.order_type);
    setTableNumber(held.table_number || '');
    setCustomerName(held.customer_name || '');
    setCartDiscount(held.discount);
    db.deleteHeldTransaction(held.hold_id);
    refreshHeldOrders();
    setShowHeldOrdersModal(false);
  };

  const handleDeleteHeldOrder = async (holdId: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Keranjang Ditahan',
      message: 'Yakin ingin menghapus keranjang yang ditahan ini?',
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.deleteHeldTransaction(holdId);
      refreshHeldOrders();
      toast('Keranjang yang ditahan berhasil dihapus.', 'success');
    }
  };

  const handleCheckoutSuccess = (tx: Transaction) => {
    setIsCheckoutOpen(false);
    clearCart();
    loadData(); // refresh stock numbers
    setCompletedTx(tx);
    setIsReceiptOpen(true);
  };

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden bg-slate-50">
      {/* LEFT SECTION: Search, Categories, Products Grid */}
      <div className="flex flex-1 flex-col overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 h-full">
        {/* Top Controls Bar */}
        <div className="border-b border-slate-200 bg-white p-3 sm:p-4 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Pindai barcode / ketik nama produk, SKU, atau Merk (Tekan Enter untuk scan)..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none font-medium"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={() => setIsBarcodeScannerOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800 transition cursor-pointer"
              title="Pindai Barcode via Kamera atau Barcode Scanner"
            >
              <ScanBarcode className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>

            {/* View Mode Switcher (List vs Grid) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('list')}
                title="Tampilan List / Daftar Baris (Rekomendasi Kasir Supermarket)"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'list' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Tampilan Grid Tombol"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {heldOrders.length > 0 && (
              <button
                onClick={() => setShowHeldOrdersModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                <Bookmark className="w-4 h-4 text-amber-800" />
                <span>{heldOrders.length} Ditahan</span>
              </button>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId('ALL')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategoryId === 'ALL'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Produk ({products.length})
            </button>
            {categories.map(cat => {
              const count = products.filter(p => p.category_id === cat.category_id).length;
              const isSelected = selectedCategoryId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => setSelectedCategoryId(cat.category_id)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.category_name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Display (List vs Grid) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 opacity-40 text-emerald-800" />
              <p className="text-xs font-medium">Tidak ada produk supermarket yang sesuai kriteria.</p>
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW MODE */
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-3 py-2.5">Barcode / SKU</th>
                      <th className="px-3 py-2.5">Nama Produk & Merk</th>
                      <th className="px-3 py-2.5">Lokasi Rak</th>
                      <th className="px-3 py-2.5 text-center">Stok</th>
                      <th className="px-3 py-2.5 text-right">Harga Jual</th>
                      <th className="px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(product => {
                      const isOutOfStock = product.stock_qty <= 0;
                      return (
                        <tr
                          key={product.product_id}
                          onClick={() => !isOutOfStock && handleProductCardClick(product)}
                          className={`hover:bg-amber-50/70 transition cursor-pointer ${
                            isOutOfStock ? 'opacity-50 bg-slate-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700 whitespace-nowrap">
                            {product.barcode || product.sku}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-900 text-xs">{product.product_name}</div>
                            {product.brand && (
                              <span className="text-[9px] font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 inline-block mt-0.5">
                                {product.brand}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">
                            {product.rack_location ? (
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold border border-slate-200">
                                {product.rack_location}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                                product.stock_qty <= product.minimum_stock ? 'bg-red-600' : 'bg-emerald-800'
                              }`}
                            >
                              {product.stock_qty} {product.unit}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-black text-emerald-900 text-xs sm:text-sm whitespace-nowrap">
                            {formatRupiah(product.selling_price)}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <button
                              disabled={isOutOfStock}
                              onClick={e => {
                                e.stopPropagation();
                                !isOutOfStock && handleProductCardClick(product);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-30 text-white font-bold text-[11px] transition shadow-2xs cursor-pointer"
                            >
                              + Tambah
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID VIEW MODE */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock_qty <= 0;

                return (
                  <button
                    key={product.product_id}
                    onClick={() => !isOutOfStock && handleProductCardClick(product)}
                    disabled={isOutOfStock}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-600 hover:shadow-md cursor-pointer ${
                      isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'active:scale-98'
                    }`}
                  >
                    <div className="space-y-1.5">
                      {/* Top Barcodes and Stock */}
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold truncate max-w-[110px]">
                          {product.barcode || product.sku}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-white ${
                            product.stock_qty <= product.minimum_stock ? 'bg-red-600' : 'bg-emerald-800'
                          }`}
                        >
                          Stok: {product.stock_qty}
                        </span>
                      </div>

                      {/* Product Title */}
                      <h3 className="line-clamp-2 text-xs font-black text-slate-900 leading-snug pt-1">
                        {product.product_name}
                      </h3>

                      {/* Extra Badges: Brand & Rack */}
                      <div className="flex flex-wrap items-center gap-1 text-[9px] text-slate-500 font-medium">
                        {product.brand && (
                          <span className="text-amber-900 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200/60">
                            {product.brand}
                          </span>
                        )}
                        {product.rack_location && (
                          <span className="bg-stone-100 text-stone-700 px-1 py-0.2 rounded font-semibold border border-stone-200">
                            {product.rack_location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-xs sm:text-sm font-black text-emerald-800">
                        {formatRupiah(product.selling_price)}
                      </span>
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 group-hover:bg-emerald-700 group-hover:text-white transition">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Cart & POS Checkout Panel */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white border-t md:border-t-0 md:border-l border-slate-200 shrink-0 h-full">
        {/* Cart Header */}
        <div className="border-b border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-800" />
              <h2 className="text-sm font-extrabold text-slate-900">Keranjang Kasir</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items
              </span>
            </div>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Order Type & Table */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold text-slate-600">
            {(['Belanja Reguler', 'Grosir / Partai', 'Online / Delivery'] as OrderType[]).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1.5 rounded-lg transition cursor-pointer text-center truncate px-1 ${
                  orderType === type
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {type.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Reference & Customer Inputs */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="No. Troli / Member ID"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Nama Pelanggan"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>


        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-stone-400 space-y-2">
              <ShoppingBag className="w-8 h-8 opacity-30 text-amber-900" />
              <p className="text-xs text-center">Keranjang masih kosong.<br />Scan barcode atau pilih produk di samping untuk transaksi.</p>
            </div>
          ) : (
            cartItems.map(item => (
              <div
                key={item.id}
                className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs space-y-1.5"
              >
                <div className="flex justify-between items-start">
                  <div className="pr-2">
                    <div className="font-bold text-stone-800">{item.product.product_name}</div>
                    {item.selected_variants.length > 0 && (
                      <div className="text-[10px] text-stone-500">
                        {item.selected_variants.map(m => m.name).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[10px] text-stone-400 italic">* {item.notes}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeCartItem(item.id)}
                    className="text-stone-400 hover:text-red-500 p-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-stone-200/60">
                  <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-stone-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center text-stone-600 hover:bg-stone-100 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="font-bold text-stone-900">
                    {formatRupiah(item.line_total)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary */}
        <div className="border-t border-stone-200 bg-stone-50 p-4 space-y-3">
          <div className="space-y-1 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Diskon</span>
                <span>-{formatRupiah(discountTotal)}</span>
              </div>
            )}
            {settings.tax_enabled && (
              <div className="flex justify-between">
                <span>PPN / Pajak ({settings.tax_percentage}%)</span>
                <span>{formatRupiah(tax)}</span>
              </div>
            )}
            {settings.service_charge_enabled && (
              <div className="flex justify-between">
                <span>Service Charge ({settings.service_charge_percentage}%)</span>
                <span>{formatRupiah(serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
              <span>TOTAL BELANJA</span>
              <span className="text-emerald-900 text-base">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleHoldOrder}
              disabled={cartItems.length === 0}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 px-3 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
              title="Tahan Keranjang Belanja"
            >
              <Bookmark className="w-4 h-4 text-emerald-700" />
              <span>Tahan</span>
            </button>

            <button
              onClick={async () => {
                const check = licenseManager.checkCanProcessTransaction();
                if (!check.allowed) {
                  await showAlert(
                    {
                      title: 'Pemberitahuan Lisensi / Kode Pemakaian',
                      message: `${check.reason}\n\nSilakan perpanjang atau aktivasi kode pemakaian baru melalui menu "Kode Pemakaian".`,
                      variant: 'warning',
                    }
                  );
                  return;
                }
                setIsCheckoutOpen(true);
              }}
              disabled={cartItems.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white py-2.5 text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
            >
              <span>Bayar {formatRupiah(grandTotal)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Product Modifiers Modal */}
      {selectedProductForModifier && (
        <ProductModifierModal
          product={selectedProductForModifier}
          isOpen={!!selectedProductForModifier}
          onClose={() => setSelectedProductForModifier(null)}
          onAddToCart={addToCartDirect}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onProductFound={prod => {
          handleProductCardClick(prod);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        orderType={orderType}
        tableNumber={tableNumber}
        customerName={customerName}
        cartDiscount={cartDiscount}
        currentUser={currentUser}
        onCheckoutSuccess={handleCheckoutSuccess}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        transaction={completedTx}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      {/* Held Orders Modal */}
      {showHeldOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5 space-y-4 text-stone-800">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm">Daftar Pesanan Ditahan</h3>
              <button
                onClick={() => setShowHeldOrdersModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {heldOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  Tidak ada keranjang belanja yang sedang ditahan.
                </div>
              ) : (
                heldOrders.map(order => (
                  <div
                    key={order.hold_id}
                    className="flex justify-between items-center p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-800">
                        {order.hold_name} ({order.order_type})
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {order.items.length} item • Kasir: {order.cashier_name}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {formatDateTime(order.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRecallOrder(order)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition cursor-pointer"
                      >
                        Buka Lagi
                      </button>
                      <button
                        onClick={() => handleDeleteHeldOrder(order.hold_id)}
                        className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition cursor-pointer"
                        title="Hapus Hold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
