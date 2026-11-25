import React, { useState } from 'react';
import { Users, Plus, Edit2, Trash2, Shield, KeyRound, Lock, X } from 'lucide-react';
import { User, UserRole } from '../types';
import { db } from '../services/db';
import { hashString } from '../services/auth';
import { useDialog } from '../contexts/DialogContext';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getStoreUsers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('KASIR');
  const [active, setActive] = useState(true);
  const { confirmAction, toast } = useDialog();

  const refresh = () => setUsers(db.getStoreUsers());

  const handleAddNew = () => {
    setEditingUserId(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setPin('');
    setRole('KASIR');
    setActive(true);
    setIsModalOpen(true);
  };

  const handleEdit = (u: User) => {
    setEditingUserId(u.user_id);
    setFullName(u.full_name);
    setUsername(u.username);
    setPassword(''); // leave blank if unchanged
    setPin(''); // leave blank if unchanged
    setRole(u.role);
    setActive(u.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !fullName.trim()) {
      toast('Nama dan Username wajib diisi.', 'error');
      return;
    }
    if (cleanUser === 'divailean' || cleanUser === 'superadmin' || role === 'SUPERADMIN') {
      toast('Username dan hak akses tersebut dicadangkan oleh sistem dan tidak dapat dibuat di menu pengguna toko.', 'error');
      return;
    }

    let passwordHash = '';
    let pinHash = '';

    if (editingUserId) {
      const existing = users.find(u => u.user_id === editingUserId);
      passwordHash = password ? await hashString(password) : existing?.password_hash || '';
      pinHash = pin ? await hashString(pin) : existing?.pin_hash || '';
    } else {
      if (!password || !pin) {
        toast('Password dan PIN 4-digit wajib diisi untuk pengguna baru.', 'error');
        return;
      }
      passwordHash = await hashString(password);
      pinHash = await hashString(pin);
    }

    const updatedUser: User = {
      user_id: editingUserId || 'user_' + Date.now(),
      username: username.trim().toLowerCase(),
      full_name: fullName.trim(),
      password_hash: passwordHash,
      pin_hash: pinHash,
      role,
      active,
      created_at: editingUserId
        ? users.find(u => u.user_id === editingUserId)?.created_at || new Date().toISOString()
        : new Date().toISOString(),
    };

    db.saveUser(updatedUser);
    refresh();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Hapus Akun Pengguna',
      message: `Yakin ingin menghapus akun ${name}?`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    });
    if (confirmed) {
      db.deleteUser(id);
      refresh();
      toast(`Akun ${name} berhasil dihapus.`, 'success');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight">Manajemen Pengguna & Hak Akses</h1>
          <p className="text-xs text-stone-500">
            Kelola akun Admin dan Kasir, kata sandi, serta 4-digit PIN shift login.
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(u => (
          <div
            key={u.user_id}
            className="p-5 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs ${
                    u.role === 'ADMIN' ? 'bg-amber-800' : 'bg-emerald-700'
                  }`}
                >
                  {u.role === 'ADMIN' ? 'AD' : 'KS'}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">{u.full_name}</h3>
                  <div className="text-[11px] font-mono text-stone-400">@{u.username}</div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    u.role === 'ADMIN'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {u.role}
                </span>
                <span className="text-[10px] text-stone-400">
                  {u.active ? 'Status: Aktif' : 'Status: Nonaktif'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 space-y-1">
              <div>
                Hak Akses: {u.role === 'ADMIN' ? 'Akses Penuh Semua Modul & Keuangan' : 'Hanya Kasir POS & Shift Kasir'}
              </div>
              {u.last_login && (
                <div className="text-[10px] text-stone-400">
                  Terakhir Login: {new Date(u.last_login).toLocaleString('id-ID')}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-stone-100">
              <button
                onClick={() => handleEdit(u)}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs transition"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-800" />
              </button>
              {users.length > 1 && (
                <button
                  onClick={() => handleDelete(u.user_id, u.full_name)}
                  className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-stone-800 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-bold text-sm">
                {editingUserId ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Contoh: Kasir Rian"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Username Login *</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="rian"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {editingUserId ? 'Ubah Password (Opsional)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none"
                    required={!editingUserId}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {editingUserId ? 'Ubah PIN (Opsional)' : '4-Digit PIN Shift *'}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="4 digit angka"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none font-mono"
                    required={!editingUserId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Peran / Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="KASIR">Kasir (Terbatas)</option>
                    <option value="ADMIN">Admin (Akses Penuh)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={e => setActive(e.target.checked)}
                      className="rounded text-amber-800"
                    />
                    <span>Akun Aktif</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
