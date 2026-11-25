import React, { useState } from 'react';
import { Truck, Plus, Edit2, Trash2, Phone, Mail, MapPin, X } from 'lucide-react';
import { Supplier } from '../types';
import { db } from '../services/db';
import { useDialog } from '../contexts/DialogContext';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(db.getSuppliers());
  const [editingSup, setEditingSup] = useState<Partial<Supplier> | null>(null);
  const { confirmAction, toast } = useDialog();

  const refresh = () => setSuppliers(db.getSuppliers());

  const handleAddNew = () => {
    setEditingSup({
      supplier_id: 'sup_' + Date.now(),
      supplier_name: '',
      phone: '',
      address: '',
      email: '',
      notes: '',
      active: true,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSup || !editingSup.supplier_name?.trim()) return;

    db.saveSupplier({
      supplier_id: editingSup.supplier_id || 'sup_' + Date.now(),
      supplier_name: editingSup.supplier_name.trim(),
      phone: editingSup.phone || '',
      address: editingSup.address || '',
      email: editingSup.email || '',
      notes: editingSup.notes || '',
      active: editingSup.active ?? true,
    });

    refresh();
    setEditingSup(null);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Pemasok',
      message: `Hapus pemasok "${name}"?`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.deleteSupplier(id);
      refresh();
      toast(`Pemasok "${name}" berhasil dihapus.`, 'success');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">Daftar Pemasok / Supplier</h1>
          <p className="text-xs text-stone-500">
            Buku kontak distributor sembako, grosir kebutuhan rumah tangga, makanan kemasan, dan pemasok barang swalayan.
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pemasok</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <div
            key={s.supplier_id}
            className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">{s.supplier_name}</h3>
                    <span className="text-[10px] text-emerald-700 font-bold">Pemasok Aktif</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-stone-600 pt-1">
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <span>{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
              </div>

              {s.notes && (
                <p className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  {s.notes}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-stone-100">
              <button
                onClick={() => setEditingSup(s)}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs transition"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-800" />
              </button>
              <button
                onClick={() => handleDelete(s.supplier_id, s.supplier_name)}
                className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {editingSup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-stone-800 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm">
                {editingSup.supplier_name ? 'Edit Data Pemasok' : 'Tambah Pemasok Baru'}
              </h3>
              <button onClick={() => setEditingSup(null)} className="text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nama Perusahaan / Supplier *</label>
                <input
                  type="text"
                  value={editingSup.supplier_name || ''}
                  onChange={e => setEditingSup({ ...editingSup, supplier_name: e.target.value })}
                  placeholder="Contoh: PT Indomarco Distributor / Grosir Sembako Jaya"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={editingSup.phone || ''}
                  onChange={e => setEditingSup({ ...editingSup, phone: e.target.value })}
                  placeholder="0812..."
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingSup.email || ''}
                  onChange={e => setEditingSup({ ...editingSup, email: e.target.value })}
                  placeholder="order@supplier.com"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Alamat Gudang / Kantor</label>
                <input
                  type="text"
                  value={editingSup.address || ''}
                  onChange={e => setEditingSup({ ...editingSup, address: e.target.value })}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={editingSup.notes || ''}
                  onChange={e => setEditingSup({ ...editingSup, notes: e.target.value })}
                  placeholder="Jadwal pengiriman, syarat pembayaran, dll."
                  className="w-full rounded-xl border border-stone-300 p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingSup(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900"
                >
                  Simpan Pemasok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
