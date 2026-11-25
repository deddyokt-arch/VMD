import React, { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Category } from '../types';
import { db } from '../services/db';
import { useDialog } from '../contexts/DialogContext';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(db.getCategories());
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const { confirmAction, toast } = useDialog();

  const refresh = () => setCategories(db.getCategories());

  const handleAddNew = () => {
    setEditingCat({
      category_id: 'cat_' + Date.now(),
      category_name: '',
      description: '',
      active: true,
      sort_order: categories.length + 1,
      created_at: new Date().toISOString(),
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.category_name?.trim()) return;

    db.saveCategory({
      category_id: editingCat.category_id || 'cat_' + Date.now(),
      category_name: editingCat.category_name.trim(),
      description: editingCat.description || '',
      active: editingCat.active ?? true,
      sort_order: Number(editingCat.sort_order) || 1,
      created_at: editingCat.created_at || new Date().toISOString(),
    });

    refresh();
    setEditingCat(null);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Kategori',
      message: `Hapus kategori "${name}"?`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.deleteCategory(id);
      refresh();
      toast(`Kategori "${name}" berhasil dihapus.`, 'success');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Kategori & Departemen Swalayan</h1>
          <p className="text-xs text-slate-500">
            Kelola pengelompokan departemen produk seperti Sembako, Minuman & Susu, Perawatan Diri, Kebutuhan Rumah, dll.
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(c => {
          const productCount = db.getProducts().filter(p => p.category_id === c.category_id).length;
          return (
            <div
              key={c.category_id}
              className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-900 font-bold text-xs">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{c.category_name}</h3>
                      <span className="text-[10px] text-slate-400">Urutan: #{c.sort_order}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {c.active ? 'Aktif' : 'Non-aktif'}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{c.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-semibold">{productCount} item produk</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingCat(c)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-800" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.category_id, c.category_name)}
                    className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm">
                {editingCat.created_at ? 'Edit Kategori Swalayan' : 'Tambah Kategori Swalayan'}
              </h3>
              <button onClick={() => setEditingCat(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kategori / Departemen *</label>
                <input
                  type="text"
                  value={editingCat.category_name || ''}
                  onChange={e => setEditingCat({ ...editingCat, category_name: e.target.value })}
                  placeholder="Contoh: Sembako & Minyak Goreng"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>


              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={editingCat.description || ''}
                  onChange={e => setEditingCat({ ...editingCat, description: e.target.value })}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Urutan Tampilan</label>
                  <input
                    type="number"
                    value={editingCat.sort_order || 1}
                    onChange={e => setEditingCat({ ...editingCat, sort_order: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingCat.active ?? true}
                      onChange={e => setEditingCat({ ...editingCat, active: e.target.checked })}
                      className="rounded text-amber-800"
                    />
                    <span>Kategori Aktif</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
