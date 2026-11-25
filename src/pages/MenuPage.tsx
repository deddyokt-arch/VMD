import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  ScanBarcode,
  AlertTriangle,
  X,
  Package,
  RefreshCw,
} from 'lucide-react';
import { Product, Category, ProductVariant, StockType } from '../types';
import { db } from '../services/db';
import { formatRupiah, safePrint } from '../services/printer';
import { generateNewProductCode, generateBarcodeSVG } from '../services/barcode';
import { BarcodeScannerModal } from '../components/pos/BarcodeScannerModal';
import { useDialog } from '../contexts/DialogContext';

export const MenuPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [categories, setCategories] = useState<Category[]>(db.getCategories());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [quickBarcodeInput, setQuickBarcodeInput] = useState('');

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [barcodePreviewProduct, setBarcodePreviewProduct] = useState<Product | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'new_product' | 'modal_field'>('new_product');

  const productNameInputRef = useRef<HTMLInputElement>(null);
  const { confirmAction, toast } = useDialog();

  const refreshList = () => {
    setProducts(db.getProducts());
    setCategories(db.getCategories());
  };

  const filtered = products.filter(p => {
    const matchesCat = selectedCat === 'ALL' || p.category_id === selectedCat;
    const matchesSearch =
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  const openNewProductWithBarcode = (barcodeValue?: string) => {
    const codes = generateNewProductCode('PRD');
    const cleanBarcode = barcodeValue?.trim() || codes.barcode;

    setEditingProduct({
      product_id: 'prod_' + Date.now(),
      sku: codes.sku,
      barcode: cleanBarcode,
      product_name: '',
      category_id: categories[0]?.category_id || 'cat_sembako',
      description: '',
      image_url: '',
      selling_price: 15000,
      cost_price: 12000,
      stock_type: 'finished',
      stock_qty: 100,
      minimum_stock: 15,
      unit: 'Pcs',
      brand: '',
      rack_location: 'Rak A-01',
      wholesale_price: 14000,
      active: true,
      variants: [],
    });
    setIsEditModalOpen(true);
    setTimeout(() => {
      productNameInputRef.current?.focus();
    }, 80);
  };

  const handleAddNew = () => {
    openNewProductWithBarcode();
  };

  const handleBarcodeCapturedForProduct = (scannedCode: string) => {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    if (scannerTarget === 'modal_field' && isEditModalOpen && editingProduct) {
      setEditingProduct({ ...editingProduct, barcode: cleanCode });
      toast(`Barcode "${cleanCode}" berhasil dimasukkan ke produk.`, 'success');
      return;
    }

    // Check if barcode already exists in catalog
    const existing = db
      .getProducts()
      .find(p => p.barcode.toLowerCase() === cleanCode.toLowerCase());

    if (existing) {
      toast(
        `Barcode "${cleanCode}" sudah terdaftar pada "${existing.product_name}". Membuka detail untuk edit stok/harga.`,
        'info'
      );
      handleEdit(existing);
      return;
    }

    toast(`Barcode baru "${cleanCode}" siap ditambahkan. Lengkapi nama & harga produk.`, 'success');
    openNewProductWithBarcode(cleanCode);
  };

  const handleQuickBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBarcodeInput.trim()) {
      toast('Ketik atau scan barcode produk terlebih dahulu.', 'warning');
      return;
    }
    setScannerTarget('new_product');
    handleBarcodeCapturedForProduct(quickBarcodeInput);
    setQuickBarcodeInput('');
  };

  const handleEdit = (p: Product) => {
    setEditingProduct({ ...p, variants: p.variants ? [...p.variants] : [] });
    setIsEditModalOpen(true);
  };

  const handleDuplicate = (p: Product) => {
    const codes = generateNewProductCode('PRD');
    const duplicated: Product = {
      ...p,
      product_id: 'prod_' + Date.now(),
      sku: codes.sku,
      barcode: codes.barcode,
      product_name: p.product_name + ' (Salinan)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.saveProduct(duplicated);
    refreshList();
    toast(`Produk ${duplicated.product_name} berhasil diduplikasi!`, 'success');
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Produk',
      message: `Yakin ingin menghapus produk "${name}"?`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.deleteProduct(id);
      refreshList();
      toast(`Produk "${name}" berhasil dihapus.`, 'success');
    }
  };

  // Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.product_name?.trim()) {
      toast('Nama produk swalayan wajib diisi.', 'error');
      return;
    }

    const cleanBarcode = editingProduct.barcode?.trim() || '899' + Date.now().toString().slice(-7);

    // Prevent duplicate barcode collision on new product
    const duplicateBarcode = products.find(
      p => p.barcode === cleanBarcode && p.product_id !== editingProduct.product_id
    );
    if (duplicateBarcode) {
      toast(
        `Barcode "${cleanBarcode}" sudah digunakan oleh produk "${duplicateBarcode.product_name}".`,
        'error'
      );
      return;
    }

    const prod: Product = {
      product_id: editingProduct.product_id || 'prod_' + Date.now(),
      sku: editingProduct.sku || 'SKU-' + Date.now(),
      barcode: cleanBarcode,
      product_name: editingProduct.product_name.trim(),
      category_id: editingProduct.category_id || categories[0]?.category_id || '',
      description: editingProduct.description || '',
      image_url: '',
      selling_price: Number(editingProduct.selling_price) || 0,
      cost_price: Number(editingProduct.cost_price) || 0,
      stock_type: (editingProduct.stock_type as StockType) || 'finished',
      stock_qty: Number(editingProduct.stock_qty) || 0,
      minimum_stock: Number(editingProduct.minimum_stock) || 0,
      unit: editingProduct.unit || 'Pcs',
      brand: editingProduct.brand || '',
      rack_location: editingProduct.rack_location || '',
      wholesale_price: Number(editingProduct.wholesale_price) || 0,
      active: editingProduct.active ?? true,
      created_at: editingProduct.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      variants: editingProduct.variants || [],
    };

    db.saveProduct(prod);
    refreshList();
    setIsEditModalOpen(false);
    toast(`Produk "${prod.product_name}" (Barcode: ${prod.barcode}) berhasil disimpan.`, 'success');
  };

  // Variant addition inside modal
  const handleAddVariant = () => {
    if (!editingProduct) return;
    const newVariant: ProductVariant = {
      variant_id: 'var_' + Date.now(),
      product_id: editingProduct.product_id || '',
      variant_name: 'Eceran Satuan',
      group_name: 'Kemasan',
      additional_price: 0,
      active: true,
    };
    setEditingProduct({
      ...editingProduct,
      variants: [...(editingProduct.variants || []), newVariant],
    });
  };

  const handleRemoveVariant = (variantId: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      variants: (editingProduct.variants || []).filter(v => v.variant_id !== variantId),
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Katalog Produk & Master Barcode Swalayan
          </h1>
          <p className="text-xs text-slate-500">
            Kelola stok rak barang swalayan, tambah produk cepat dengan scan barcode EAN-13/UPC, harga eceran & grosir, serta HPP toko.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScannerTarget('new_product');
              setIsCameraScannerOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <ScanBarcode className="w-4 h-4 text-emerald-400" />
            <span>Tambah Produk via Barcode</span>
          </button>

          <button
            type="button"
            onClick={handleAddNew}
            className="flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Swalayan</span>
          </button>
        </div>
      </div>

      {/* Quick Barcode Scanner Strip (USB/Bluetooth Scanner & Direct Input) */}
      <form
        onSubmit={handleQuickBarcodeSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 shrink-0">
          <ScanBarcode className="w-4 h-4 text-emerald-700" />
          <span>Input Cepat Barcode (Scanner USB / Manual):</span>
        </div>
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={quickBarcodeInput}
            onChange={e => setQuickBarcodeInput(e.target.value)}
            placeholder="Scan barcode kemasan barang atau ketik kode barcode baru lalu tekan Enter..."
            className="flex-1 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-mono font-semibold text-stone-900 focus:border-emerald-700 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shrink-0"
          >
            Proses Barcode
          </button>
        </div>
      </form>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-2.5 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama barang swalayan, SKU, barcode..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-4 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none cursor-pointer"
        >
          <option value="ALL">Semua Kategori Swalayan</option>
          {categories.map(c => (
            <option key={c.category_id} value={c.category_id}>
              {c.category_name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Produk & Barcode</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Harga Jual</th>
                <th className="px-4 py-3">HPP (Modal)</th>
                <th className="px-4 py-3">Margin Laba</th>
                <th className="px-4 py-3">Tipe Stok</th>
                <th className="px-4 py-3">Stok Rak Saat Ini</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(p => {
                const profitMargin = p.selling_price - p.cost_price;
                const marginPercent =
                  p.selling_price > 0 ? Math.round((profitMargin / p.selling_price) * 100) : 0;
                const isUnderCost = p.selling_price < p.cost_price;

                return (
                  <tr key={p.product_id} className="hover:bg-emerald-50/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center text-emerald-900 font-bold shrink-0">
                          <Package className="w-4 h-4 text-emerald-800" />
                        </div>
                        <div>
                          <div className="font-bold text-stone-900 text-xs">{p.product_name}</div>
                          <div className="text-[10px] font-mono text-stone-500">
                            Barcode: {p.barcode} • SKU: {p.sku}
                            {p.rack_location ? ` • ${p.rack_location}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                        {categories.find(c => c.category_id === p.category_id)?.category_name || '-'}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-900">
                      {formatRupiah(p.selling_price)}
                    </td>

                    <td className="px-4 py-3 font-semibold text-stone-500">
                      {formatRupiah(p.cost_price)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold text-[11px] ${
                          isUnderCost ? 'text-red-600 font-bold' : 'text-emerald-700'
                        }`}
                      >
                        {formatRupiah(profitMargin)} ({marginPercent}%)
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold">
                        {p.stock_type === 'recipe' ? 'Paket / Racikan' : 'Stok Barang Rak'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {p.stock_type === 'recipe' ? (
                        <span className="text-[10px] text-stone-400 italic">Auto paket bahan</span>
                      ) : (
                        <span
                          className={`font-bold ${
                            p.stock_qty <= p.minimum_stock ? 'text-red-600' : 'text-stone-800'
                          }`}
                        >
                          {p.stock_qty} {p.unit}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setBarcodePreviewProduct(p)}
                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                          title="Lihat Label Barcode"
                        >
                          <ScanBarcode className="w-3.5 h-3.5 text-stone-600" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(p)}
                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                          title="Duplikasi Produk"
                        >
                          <Copy className="w-3.5 h-3.5 text-stone-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 transition cursor-pointer"
                          title="Edit Produk"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.product_id, p.product_name)}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition cursor-pointer"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Product Modal (No Photo Upload, Barcode-First) */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-800">
            <div className="flex items-center justify-between border-b border-stone-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <ScanBarcode className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">
                  {editingProduct.created_at
                    ? 'Edit Produk Swalayan'
                    : 'Tambah Produk Swalayan Baru'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Barcode Scanner & Preview Panel */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <ScanBarcode className="w-4 h-4 text-emerald-700" />
                    <span>Kode Barcode Produk (EAN-13 / Scanner USB & Kamera)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('modal_field');
                        setIsCameraScannerOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      <ScanBarcode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Scan Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const codes = generateNewProductCode('PRD');
                        setEditingProduct({ ...editingProduct, barcode: codes.barcode });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-[11px] font-bold transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Buat Barcode</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Kode Barcode Kemasan *
                      </label>
                      <input
                        type="text"
                        value={editingProduct.barcode || ''}
                        onChange={e =>
                          setEditingProduct({ ...editingProduct, barcode: e.target.value })
                        }
                        placeholder="Scan barcode atau ketik angka..."
                        className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:border-emerald-700 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Kode SKU Toko
                      </label>
                      <input
                        type="text"
                        value={editingProduct.sku || ''}
                        onChange={e =>
                          setEditingProduct({ ...editingProduct, sku: e.target.value })
                        }
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-mono focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {editingProduct.barcode && (
                    <div className="bg-white rounded-xl border border-emerald-200 p-1.5 flex items-center justify-center">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSVG(editingProduct.barcode, 160, 44),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nama Produk Swalayan *
                  </label>
                  <input
                    ref={productNameInputRef}
                    type="text"
                    value={editingProduct.product_name || ''}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, product_name: e.target.value })
                    }
                    placeholder="Contoh: Indomie Goreng Spesial 85g"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Kategori Produk
                  </label>
                  <select
                    value={editingProduct.category_id || ''}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, category_id: e.target.value })
                    }
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Merek / Brand
                  </label>
                  <input
                    type="text"
                    value={editingProduct.brand || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    placeholder="Contoh: Indofood, Unilever, Wings"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Lokasi Rak / Etalase
                  </label>
                  <input
                    type="text"
                    value={editingProduct.rack_location || ''}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, rack_location: e.target.value })
                    }
                    placeholder="Contoh: Rak A-01 / Lorong 2"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Price & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Harga Jual Eceran (Rp) *
                  </label>
                  <input
                    type="number"
                    value={editingProduct.selling_price || 0}
                    onChange={e =>
                      setEditingProduct({
                        ...editingProduct,
                        selling_price: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    HPP / Harga Beli Pokok (Rp)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.cost_price || 0}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, cost_price: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Satuan Jual</label>
                  <input
                    type="text"
                    value={editingProduct.unit || 'Pcs'}
                    onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    placeholder="Pcs, Pack, Dus, Kg, Botol"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {Number(editingProduct.selling_price) < Number(editingProduct.cost_price) && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Peringatan: Harga jual lebih rendah dari harga pokok penjualan (HPP)!</span>
                </div>
              )}

              {/* Stock type */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="text-xs font-bold text-stone-700">Model Pengurangan Stok</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg bg-white border border-stone-200">
                    <input
                      type="radio"
                      name="stock_type"
                      checked={editingProduct.stock_type === 'finished'}
                      onChange={() => setEditingProduct({ ...editingProduct, stock_type: 'finished' })}
                      className="text-emerald-700"
                    />
                    <div>
                      <div className="font-bold">Stok Barang Jadi (Retail Rak)</div>
                      <div className="text-[10px] text-stone-500">
                        Sembako, snack kemasan, minuman botol, kebutuhan rumah
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg bg-white border border-stone-200">
                    <input
                      type="radio"
                      name="stock_type"
                      checked={editingProduct.stock_type === 'recipe'}
                      onChange={() => setEditingProduct({ ...editingProduct, stock_type: 'recipe' })}
                      className="text-emerald-700"
                    />
                    <div>
                      <div className="font-bold">Otomatis Paket / Racikan Bahan</div>
                      <div className="text-[10px] text-stone-500">
                        Mengurangi stok komponen paket atau barang curah otomatis
                      </div>
                    </div>
                  </label>
                </div>

                {editingProduct.stock_type === 'finished' && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600">
                        Jumlah Stok Rak
                      </label>
                      <input
                        type="number"
                        value={editingProduct.stock_qty || 0}
                        onChange={e =>
                          setEditingProduct({
                            ...editingProduct,
                            stock_qty: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 p-1.5 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600">
                        Peringatan Stok Minimum
                      </label>
                      <input
                        type="number"
                        value={editingProduct.minimum_stock || 0}
                        onChange={e =>
                          setEditingProduct({
                            ...editingProduct,
                            minimum_stock: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 p-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Variants Section */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-stone-700">
                    Pilihan Varian Kemasan / Ukuran (Opsional)
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    + Tambah Opsi Varian
                  </button>
                </div>

                <div className="space-y-2">
                  {(editingProduct.variants || []).map((v, idx) => (
                    <div key={v.variant_id} className="flex gap-2 items-center text-xs">
                      <input
                        type="text"
                        placeholder="Grup (cth: Kemasan)"
                        value={v.group_name || ''}
                        onChange={e => {
                          const next = [...(editingProduct.variants || [])];
                          next[idx].group_name = e.target.value;
                          setEditingProduct({ ...editingProduct, variants: next });
                        }}
                        className="w-28 rounded-lg border border-stone-300 p-1.5 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Nama (cth: 1 Karton / Pack)"
                        value={v.variant_name}
                        onChange={e => {
                          const next = [...(editingProduct.variants || [])];
                          next[idx].variant_name = e.target.value;
                          setEditingProduct({ ...editingProduct, variants: next });
                        }}
                        className="flex-1 rounded-lg border border-stone-300 p-1.5 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="+Harga"
                        value={v.additional_price}
                        onChange={e => {
                          const next = [...(editingProduct.variants || [])];
                          next[idx].additional_price = Number(e.target.value);
                          setEditingProduct({ ...editingProduct, variants: next });
                        }}
                        className="w-24 rounded-lg border border-stone-300 p-1.5 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.variant_id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Camera/Scanner Capture Modal */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        mode="capture"
        onBarcodeCaptured={handleBarcodeCapturedForProduct}
      />

      {/* Barcode Label Preview Modal */}
      {barcodePreviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center space-y-4 text-stone-800">
            <h3 className="font-bold text-sm">Label Barcode Rak Swalayan</h3>
            <div className="p-4 border border-stone-200 rounded-xl bg-white shadow-xs">
              <div className="font-bold text-xs mb-1">{barcodePreviewProduct.product_name}</div>
              <div className="text-sm font-black text-emerald-900 mb-2">
                {formatRupiah(barcodePreviewProduct.selling_price)}
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: generateBarcodeSVG(barcodePreviewProduct.barcode, 260, 75),
                }}
                className="mx-auto"
              />
              <div className="text-[10px] text-stone-400 font-mono mt-1">
                SKU: {barcodePreviewProduct.sku}
              </div>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => safePrint()}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 cursor-pointer"
              >
                Cetak Label
              </button>
              <button
                onClick={() => setBarcodePreviewProduct(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
