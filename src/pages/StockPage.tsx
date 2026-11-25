import React, { useState } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  History,
  SlidersHorizontal,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { Ingredient, Recipe, StockMovement, Product, User } from '../types';
import { db } from '../services/db';
import { formatRupiah, formatDateTime } from '../services/printer';
import { useDialog } from '../contexts/DialogContext';

interface StockPageProps {
  currentUser: User;
}

export const StockPage: React.FC<StockPageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'movements'>('ingredients');
  const [ingredients, setIngredients] = useState<Ingredient[]>(db.getIngredients());
  const [recipes, setRecipes] = useState<Recipe[]>(db.getRecipes());
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [movements, setMovements] = useState<StockMovement[]>(db.getStockMovements());

  // Ingredient modal state
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Partial<Ingredient> | null>(null);

  // Adjustment modal state
  const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Recipe modal state
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<Product | null>(null);
  const [recipeSelectedIngredientId, setRecipeSelectedIngredientId] = useState('');
  const [recipeQtyUsed, setRecipeQtyUsed] = useState<number>(18);
  const [recipeUnit, setRecipeUnit] = useState('gram');
  const { confirmAction, toast } = useDialog();

  const refresh = () => {
    setIngredients(db.getIngredients());
    setRecipes(db.getRecipes());
    setProducts(db.getProducts());
    setMovements(db.getStockMovements());
  };

  const lowStockIngredients = ingredients.filter(i => i.stock_qty <= i.minimum_stock);

  // Save Ingredient
  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIng || !editingIng.ingredient_name?.trim()) return;

    db.saveIngredient({
      ingredient_id: editingIng.ingredient_id || 'ing_' + Date.now(),
      ingredient_name: editingIng.ingredient_name.trim(),
      unit: editingIng.unit || 'gram',
      stock_qty: Number(editingIng.stock_qty) || 0,
      minimum_stock: Number(editingIng.minimum_stock) || 0,
      cost_per_unit: Number(editingIng.cost_per_unit) || 0,
      supplier_id: editingIng.supplier_id || '',
      updated_at: new Date().toISOString(),
    });

    refresh();
    setIsIngModalOpen(false);
  };

  // Stock Opname / Adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    db.recordStockAdjustment(
      'ingredient',
      adjustTarget.ingredient_id,
      adjustQty,
      adjustReason || 'Penyesuaian stok opname',
      currentUser.user_id,
      currentUser.full_name
    );

    refresh();
    setAdjustTarget(null);
    setAdjustQty(0);
    setAdjustReason('');
    toast('Penyesuaian stok berhasil disimpan!', 'success');
  };

  // Recipe Add
  const handleAddRecipeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForRecipe || !recipeSelectedIngredientId) return;

    const newRecipe: Recipe = {
      recipe_id: 'rec_' + Date.now(),
      product_id: selectedProductForRecipe.product_id,
      ingredient_id: recipeSelectedIngredientId,
      quantity_used: Number(recipeQtyUsed) || 1,
      unit: recipeUnit,
      created_at: new Date().toISOString(),
    };

    db.saveRecipe(newRecipe);
    refresh();
  };

  const handleDeleteRecipe = (id: string) => {
    db.deleteRecipe(id);
    refresh();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">
            Stok Bahan Curah & Paket Bundling Swalayan
          </h1>
          <p className="text-xs text-stone-500">
            Kelola inventori stok curah/kemasan ulang, komposisi paket produk, dan riwayat mutasi stok toko.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingIng({
                ingredient_id: 'ing_' + Date.now(),
                ingredient_name: '',
                unit: 'gram',
                stock_qty: 1000,
                minimum_stock: 200,
                cost_per_unit: 250,
              });
              setIsIngModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bahan Baku</span>
          </button>
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockIngredients.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span>Peringatan Stok Menipis ({lowStockIngredients.length} Bahan Memerlukan Pembelian)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockIngredients.map(i => (
              <span
                key={i.ingredient_id}
                className="px-2.5 py-1 rounded-lg bg-red-100/80 text-red-800 text-[11px] font-semibold"
              >
                {i.ingredient_name}: Sisa {i.stock_qty} {i.unit} (Min: {i.minimum_stock})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'ingredients'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Bahan Baku ({ingredients.length})
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'recipes'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Paket & Racikan Produk ({recipes.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-amber-800 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Riwayat Mutasi Stok ({movements.length})
        </button>
      </div>

      {/* TAB 1: Ingredients Table */}
      {activeTab === 'ingredients' && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">Nama Bahan Baku</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3">Stok Saat Ini</th>
                  <th className="px-4 py-3">Batas Minimum</th>
                  <th className="px-4 py-3">Biaya Pokok per Satuan</th>
                  <th className="px-4 py-3">Estimasi Nilai Total</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ingredients.map(ing => {
                  const isLow = ing.stock_qty <= ing.minimum_stock;
                  const totalVal = ing.stock_qty * ing.cost_per_unit;

                  return (
                    <tr key={ing.ingredient_id} className="hover:bg-amber-50/40 transition">
                      <td className="px-4 py-3 font-bold text-stone-900">
                        {ing.ingredient_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-bold">
                          {ing.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-black text-sm ${
                            isLow ? 'text-red-600' : 'text-stone-800'
                          }`}
                        >
                          {ing.stock_qty.toLocaleString('id-ID')} {ing.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500 font-semibold">
                        {ing.minimum_stock.toLocaleString('id-ID')} {ing.unit}
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-medium">
                        {formatRupiah(ing.cost_per_unit)} / {ing.unit}
                      </td>
                      <td className="px-4 py-3 font-bold text-stone-800">
                        {formatRupiah(totalVal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setAdjustTarget(ing);
                              setAdjustQty(0);
                            }}
                            className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 transition"
                            title="Penyesuaian Stok / Opname"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingIng(ing);
                              setIsIngModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 transition"
                            title="Edit Bahan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirmAction({
                                title: 'Hapus Bahan Baku',
                                message: `Hapus bahan baku ${ing.ingredient_name}?`,
                                confirmLabel: 'Ya, Hapus',
                                variant: 'danger',
                              });
                              if (confirmed) {
                                db.deleteIngredient(ing.ingredient_id);
                                refresh();
                                toast(`Bahan baku ${ing.ingredient_name} berhasil dihapus.`, 'success');
                              }
                            }}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition"
                            title="Hapus Bahan"
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
      )}

      {/* TAB 2: Recipes */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
            <p>
              Setiap produk paket parsel atau barang kemas ulang dapat dihubungkan ke takaran stok bahan/komponen. Saat produk terjual di kasir, stok komponen berkurang secara otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products
              .filter(p => p.stock_type === 'recipe')
              .map(p => {
                const itemRecipes = recipes.filter(r => r.product_id === p.product_id);
                // Compute calculated HPP from recipes
                let calculatedHpp = 0;
                for (const r of itemRecipes) {
                  const ing = ingredients.find(i => i.ingredient_id === r.ingredient_id);
                  if (ing) {
                    calculatedHpp += r.quantity_used * ing.cost_per_unit;
                  }
                }

                return (
                  <div
                    key={p.product_id}
                    className="p-4 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100/80 border border-emerald-200 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-emerald-800" />
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 text-xs">{p.product_name}</h3>
                          <div className="text-[10px] text-stone-400">
                            Harga Jual: {formatRupiah(p.selling_price)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-stone-400">HPP Hitung Resep</div>
                        <div className="font-bold text-xs text-amber-900">
                          {formatRupiah(calculatedHpp)}
                        </div>
                      </div>
                    </div>

                    {/* Ingredient list for this recipe */}
                    <div className="p-2.5 bg-stone-50 rounded-xl space-y-1.5 text-xs">
                      {itemRecipes.length === 0 ? (
                        <div className="text-[11px] text-stone-400 italic">
                          Belum ada resep bahan terhubung.
                        </div>
                      ) : (
                        itemRecipes.map(r => {
                          const ing = ingredients.find(i => i.ingredient_id === r.ingredient_id);
                          return (
                            <div key={r.recipe_id} className="flex justify-between items-center">
                              <span className="font-medium text-stone-700">
                                • {ing?.ingredient_name || 'Bahan'}: {r.quantity_used} {r.unit}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-stone-400">
                                  {ing ? formatRupiah(r.quantity_used * ing.cost_per_unit) : ''}
                                </span>
                                <button
                                  onClick={() => handleDeleteRecipe(r.recipe_id)}
                                  className="text-stone-400 hover:text-red-500"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedProductForRecipe(p);
                        setRecipeSelectedIngredientId(ingredients[0]?.ingredient_id || '');
                        setIsRecipeModalOpen(true);
                      }}
                      className="w-full py-1.5 rounded-lg border border-dashed border-stone-300 hover:border-amber-600 text-xs font-semibold text-stone-600 hover:text-amber-900 transition"
                    >
                      + Tambah Komponen Resep
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: Stock Movement Log */}
      {activeTab === 'movements' && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Tipe Mutasi</th>
                  <th className="px-4 py-3 text-right">Masuk</th>
                  <th className="px-4 py-3 text-right">Keluar</th>
                  <th className="px-4 py-3 text-right">Sisa Stok</th>
                  <th className="px-4 py-3">Referensi & Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      Belum ada catatan mutasi stok.
                    </td>
                  </tr>
                ) : (
                  movements.slice(0, 50).map(m => (
                    <tr key={m.movement_id} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5 text-[10px] font-mono text-stone-400">
                        {formatDateTime(m.movement_date)}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-stone-800">{m.item_name}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                          {m.movement_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                        {m.quantity_in > 0 ? `+${m.quantity_in}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-600">
                        {m.quantity_out > 0 ? `-${m.quantity_out}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-stone-900">
                        {m.balance_after}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-stone-500">
                        {m.reference_id ? `[${m.reference_id}] ` : ''}
                        {m.notes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Add Ingredient Modal */}
      {isIngModalOpen && editingIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-stone-800 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm">
                {editingIng.updated_at ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
              </h3>
              <button onClick={() => setIsIngModalOpen(false)} className="text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nama Bahan Baku *</label>
                <input
                  type="text"
                  value={editingIng.ingredient_name || ''}
                  onChange={e => setEditingIng({ ...editingIng, ingredient_name: e.target.value })}
                  placeholder="Contoh: Beras Premium Curah / Gula Pasir"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Satuan Ukur</label>
                  <select
                    value={editingIng.unit || 'gram'}
                    onChange={e => setEditingIng({ ...editingIng, unit: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="gram">gram (g)</option>
                    <option value="ml">mililiter (ml)</option>
                    <option value="pcs">pcs / lembar</option>
                    <option value="kg">kilogram (kg)</option>
                    <option value="liter">liter (L)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Biaya Pokok per Satuan (Rp)</label>
                  <input
                    type="number"
                    value={editingIng.cost_per_unit || 0}
                    onChange={e => setEditingIng({ ...editingIng, cost_per_unit: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Stok Saat Ini</label>
                  <input
                    type="number"
                    value={editingIng.stock_qty || 0}
                    onChange={e => setEditingIng({ ...editingIng, stock_qty: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Batas Minimum</label>
                  <input
                    type="number"
                    value={editingIng.minimum_stock || 0}
                    onChange={e => setEditingIng({ ...editingIng, minimum_stock: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsIngModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Opname / Adjustment Modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-stone-800 space-y-4">
            <h3 className="font-bold text-sm">Penyesuaian Stok Opname</h3>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <div>Bahan: <strong>{adjustTarget.ingredient_name}</strong></div>
              <div>Stok Sistem: <strong>{adjustTarget.stock_qty} {adjustTarget.unit}</strong></div>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Jumlah Perubahan (+ penambahan, - pengurangan)
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={e => setAdjustQty(Number(e.target.value))}
                  placeholder="Contoh: -50 atau +100"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold focus:outline-none"
                  required
                />
                <span className="text-[10px] text-stone-500">
                  Stok baru akan menjadi: {adjustTarget.stock_qty + adjustQty} {adjustTarget.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Alasan Penyesuaian (Wajib)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Kemasan rusak, selisih hitung fisik akhir bulan"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900"
                >
                  Simpan Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recipe Item Modal */}
      {isRecipeModalOpen && selectedProductForRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-stone-800 space-y-4">
            <h3 className="font-bold text-sm">
              Tambah Resep untuk {selectedProductForRecipe.product_name}
            </h3>

            <form onSubmit={handleAddRecipeItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Pilih Bahan Baku</label>
                <select
                  value={recipeSelectedIngredientId}
                  onChange={e => {
                    setRecipeSelectedIngredientId(e.target.value);
                    const found = ingredients.find(i => i.ingredient_id === e.target.value);
                    if (found) setRecipeUnit(found.unit);
                  }}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none cursor-pointer"
                >
                  {ingredients.map(ing => (
                    <option key={ing.ingredient_id} value={ing.ingredient_id}>
                      {ing.ingredient_name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Takaran Digunakan</label>
                  <input
                    type="number"
                    step="0.1"
                    value={recipeQtyUsed}
                    onChange={e => setRecipeQtyUsed(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={recipeUnit}
                    readOnly
                    className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-xs text-stone-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900"
                >
                  Tambahkan ke Resep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
