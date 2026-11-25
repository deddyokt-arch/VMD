import React, { useState } from 'react';
import { ShoppingBag, Plus, Trash2, Calendar, CheckCircle2, Truck, X } from 'lucide-react';
import { Purchase, PurchaseItem, Supplier, Ingredient, User } from '../types';
import { db } from '../services/db';
import { formatRupiah, formatDateTime } from '../services/printer';
import { useDialog } from '../contexts/DialogContext';

interface PurchasesPageProps {
  currentUser: User;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({ currentUser }) => {
  const [purchases, setPurchases] = useState<Purchase[]>(db.getPurchases());
  const [suppliers, setSuppliers] = useState<Supplier[]>(db.getSuppliers());
  const [ingredients, setIngredients] = useState<Ingredient[]>(db.getIngredients());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { confirmAction, toast } = useDialog();

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState<'LUNAS' | 'HUTANG'>('LUNAS');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{ ingredient_id: string; item_name: string; quantity: number; unit_cost: number }>
  >([
    {
      ingredient_id: ingredients[0]?.ingredient_id || '',
      item_name: ingredients[0]?.ingredient_name || '',
      quantity: 5,
      unit_cost: 25000,
    },
  ]);

  const refresh = () => {
    setPurchases(db.getPurchases());
    setSuppliers(db.getSuppliers());
    setIngredients(db.getIngredients());
  };

  const handleAddItemRow = () => {
    const first = ingredients[0];
    setItems([
      ...items,
      {
        ingredient_id: first?.ingredient_id || '',
        item_name: first?.ingredient_name || '',
        quantity: 1,
        unit_cost: first?.cost_per_unit || 1000,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast('Harap tambahkan minimal 1 item pembelian bahan.', 'error');
      return;
    }

    const selectedSupplier = suppliers.find(s => s.supplier_id === supplierId);
    const purchaseId = 'pur_' + Date.now();
    const purchaseNumber = 'PO-' + Date.now().toString().slice(-6);

    const purchaseItems: PurchaseItem[] = items.map((it, idx) => ({
      purchase_item_id: 'pi_' + Date.now() + '_' + idx,
      purchase_id: purchaseId,
      ingredient_id: it.ingredient_id,
      item_name: it.item_name,
      quantity: Number(it.quantity) || 0,
      unit_cost: Number(it.unit_cost) || 0,
      line_total: (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0),
    }));

    const total = purchaseItems.reduce((acc, curr) => acc + curr.line_total, 0);

    const newPurchase: Purchase = {
      purchase_id: purchaseId,
      purchase_number: purchaseNumber,
      supplier_id: supplierId,
      supplier_name: selectedSupplier?.supplier_name || 'Supplier Luar',
      purchase_date: purchaseDate,
      subtotal: total,
      discount: 0,
      total,
      payment_status: paymentStatus,
      notes,
      created_by: currentUser.full_name,
      items: purchaseItems,
    };

    db.savePurchase(newPurchase);
    refresh();
    setIsModalOpen(false);
    toast(`Pembelian ${purchaseNumber} berhasil disimpan & stok bahan telah bertambah!`, 'success');
  };

  const handleDeletePurchase = async (p: Purchase) => {
    const confirmed = await confirmAction({
      title: 'Hapus Invoice PO',
      message: `Hapus invoice PO "${p.purchase_number}" dari ${p.supplier_name}?`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.deletePurchase(p.purchase_id);
      refresh();
      toast(`Invoice PO ${p.purchase_number} berhasil dihapus.`, 'success');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">
            Pembelian Bahan Baku (Purchase Order)
          </h1>
          <p className="text-xs text-stone-500">
            Catat invoice belanja bahan baku dari pemasok. Stok bahan baku akan otomatis bertambah.
          </p>
        </div>
        <button
          onClick={() => {
            setSupplierId(suppliers[0]?.supplier_id || '');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pembelian Baru</span>
        </button>
      </div>

      {/* Purchase List */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-[#2D1B14] text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">No. PO & Tanggal</th>
                <th className="px-4 py-3">Pemasok</th>
                <th className="px-4 py-3">Rincian Item Bahan</th>
                <th className="px-4 py-3 text-right">Total Belanja</th>
                <th className="px-4 py-3 text-center">Status Pembayaran</th>
                <th className="px-4 py-3">Penerima</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    Belum ada riwayat pembelian bahan dari supplier.
                  </td>
                </tr>
              ) : (
                purchases.map(p => (
                  <tr key={p.purchase_id} className="hover:bg-amber-50/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold font-mono text-stone-900">{p.purchase_number}</div>
                      <div className="text-[10px] text-stone-400">{p.purchase_date}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {p.supplier_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-stone-700">
                        {p.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-amber-950">
                      {formatRupiah(p.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.payment_status === 'LUNAS'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-stone-500">
                      {p.created_by}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN') && (
                        <button
                          onClick={() => handleDeletePurchase(p)}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                          title="Hapus PO Pembelian"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Purchase */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-800">
            <div className="flex items-center justify-between border-b border-stone-100 bg-[#2D1B14] px-6 py-4 text-white">
              <h2 className="text-base font-bold">Input Pembelian Bahan Baku</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Pemasok / Supplier</label>
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none cursor-pointer"
                  >
                    {suppliers.map(s => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Tanggal Pembelian</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Status Pembayaran</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="LUNAS">Lunas (Tunai / Transfer)</option>
                    <option value="HUTANG">Hutang / Tempo</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-stone-700">Daftar Bahan yang Dibeli</div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-amber-800 hover:text-amber-900"
                  >
                    + Tambah Baris Bahan
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center text-xs">
                      <select
                        value={item.ingredient_id}
                        onChange={e => {
                          const next = [...items];
                          const found = ingredients.find(i => i.ingredient_id === e.target.value);
                          next[idx].ingredient_id = e.target.value;
                          next[idx].item_name = found?.ingredient_name || '';
                          setItems(next);
                        }}
                        className="flex-1 rounded-lg border border-stone-300 p-2 focus:outline-none"
                      >
                        {ingredients.map(ing => (
                          <option key={ing.ingredient_id} value={ing.ingredient_id}>
                            {ing.ingredient_name} ({ing.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Jumlah"
                        value={item.quantity || ''}
                        onChange={e => {
                          const next = [...items];
                          next[idx].quantity = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-24 rounded-lg border border-stone-300 p-2 focus:outline-none"
                        required
                      />

                      <input
                        type="number"
                        placeholder="Harga Beli Satuan"
                        value={item.unit_cost || ''}
                        onChange={e => {
                          const next = [...items];
                          next[idx].unit_cost = Number(e.target.value);
                          setItems(next);
                        }}
                        className="w-32 rounded-lg border border-stone-300 p-2 focus:outline-none"
                        required
                      />

                      <div className="w-28 text-right font-bold text-stone-800">
                        {formatRupiah(item.quantity * item.unit_cost)}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="No. Faktur supplier, tanggal jatuh tempo, dll."
                  className="w-full rounded-xl border border-stone-300 p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-stone-100">
                <div>
                  <div className="text-[10px] text-stone-500">Total Nilai Pembelian</div>
                  <div className="text-base font-black text-amber-950">
                    {formatRupiah(items.reduce((acc, c) => acc + c.quantity * c.unit_cost, 0))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900 shadow-xs"
                  >
                    Simpan Pembelian
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
