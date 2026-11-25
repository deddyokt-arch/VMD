import React, { useState } from 'react';
import { Store, ShoppingBag, Lock, User as UserIcon, Shield, KeyRound, ArrowRight, Sparkles, Database, CheckCircle2 } from 'lucide-react';
import { User, CafeSettings } from '../types';
import { db } from '../services/db';
import { hashString, setStoredUser } from '../services/auth';
import { GoogleWorkspaceSetupModal } from '../components/setup/GoogleWorkspaceSetupModal';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onOpenRegistration?: () => void;
  onOpenSuperadminPortal?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onOpenRegistration,
  onOpenSuperadminPortal,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [pin, setPin] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'pin'>('pin');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [settings, setSettings] = useState<CafeSettings>(db.getSettings());
  const [users, setUsers] = useState<User[]>(() =>
    db.getUsers().filter(u => u.active && u.role !== 'SUPERADMIN')
  );

  React.useEffect(() => {
    const onDataUpdated = () => {
      setSettings(db.getSettings());
      setUsers(db.getUsers().filter(u => u.active && u.role !== 'SUPERADMIN'));
    };
    window.addEventListener('martvai:data-updated', onDataUpdated);
    return () => window.removeEventListener('martvai:data-updated', onDataUpdated);
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const cleanUsername = username.trim();

    // Reject Superadmin login inside store POS login page (must use isolated Superadmin Portal)
    if (cleanUsername.toLowerCase() === 'divailean' || cleanUsername.toLowerCase() === 'superadmin') {
      setErrorMsg('Login Superadmin tidak tergabung di kasir toko. Silakan buka Portal Lisensi Superadmin tersendiri di bagian bawah.');
      setIsSubmitting(false);
      return;
    }

    // Standard Tenant Admin / Kasir Login
    const user = db.getStoreUsers().find(u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.active);
    if (!user) {
      setErrorMsg('Username tidak terdaftar.');
      setIsSubmitting(false);
      return;
    }

    const hashedInput = await hashString(password);
    if (hashedInput !== user.password_hash) {
      setErrorMsg('Password salah.');
      setIsSubmitting(false);
      return;
    }

    user.last_login = new Date().toISOString();
    db.saveUser(user);
    setStoredUser(user);
    onLoginSuccess(user);
  };

  const handlePinLogin = async (pinInput: string) => {
    setErrorMsg(null);
    if (pinInput.length < 4) return;

    setIsSubmitting(true);
    const hashedPin = await hashString(pinInput);
    // Find active non-superadmin user matching PIN
    const user = db.getUsers().find(u => u.pin_hash === hashedPin && u.active && u.role !== 'SUPERADMIN');

    if (user) {
      user.last_login = new Date().toISOString();
      db.saveUser(user);
      setStoredUser(user);
      onLoginSuccess(user);
    } else {
      setErrorMsg('PIN salah. Coba 1234 (Admin) atau 2026 (Kasir).');
      setPin('');
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (targetUser: User) => {
    targetUser.last_login = new Date().toISOString();
    db.saveUser(targetUser);
    setStoredUser(targetUser);
    onLoginSuccess(targetUser);
  };

  const handlePinNumClick = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handlePinLogin(nextPin);
      }
    }
  };

  const handleGoogleSetupSuccess = () => {
    const updatedSettings = db.getSettings();
    setSettings(updatedSettings);
    const refreshedUsers = db.getUsers().filter(u => u.active && u.role !== 'SUPERADMIN');
    setUsers(refreshedUsers);

    if (updatedSettings.google_account_email) {
      const existingAdmin =
        refreshedUsers.find(u => u.role === 'ADMIN') ||
        db.ensureAdminForGoogleUser(
          updatedSettings.google_account_email,
          updatedSettings.google_connected_user_name || 'Admin Toko'
        );
      setShowGoogleModal(false);
      setStoredUser(existingAdmin);
      onLoginSuccess(existingAdmin);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-4 text-slate-800">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 sm:p-8 space-y-5">
        {/* Brand header */}
        <div className="text-center space-y-1.5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-md text-white font-black">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            MartVai Pro
          </h1>
          <p className="text-xs text-slate-500">
            {settings.cafe_name || 'VaiMart Supermarket & Swalayan'} • Kasir & Barcode
          </p>

          {onOpenRegistration && (
            <button
              onClick={onOpenRegistration}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-extrabold transition cursor-pointer border border-emerald-300 mt-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>Registrasi Lisensi MartVai Pro Baru →</span>
            </button>
          )}
        </div>


        {/* Google Workspace Auto-Setup Card */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/90 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Database Google Workspace</span>
            </span>
            {settings.google_oauth_connected ? (
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                21 Sheet Terhubung
              </span>
            ) : (
              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                Setup Otomatis
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white border border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-stone-800 text-xs font-bold shadow-2xs transition active:scale-98 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{settings.google_oauth_connected ? 'Kelola Database Google Drive & Sheets' : 'Hubungkan Akun Google'}</span>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl text-xs font-bold text-stone-600">
          <button
            type="button"
            onClick={() => {
              setLoginMode('pin');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              loginMode === 'pin' ? 'bg-white shadow-xs text-amber-900' : 'hover:text-stone-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Quick PIN Shift</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('password');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              loginMode === 'password' ? 'bg-white shadow-xs text-amber-900' : 'hover:text-stone-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Username & Sandi</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* PIN Numpad Mode */}
        {loginMode === 'pin' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-xs text-stone-500 mb-2">
                Masukkan 4-digit PIN Kasir / Admin
              </div>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      pin.length > idx
                        ? 'bg-amber-800 border-amber-800 scale-110'
                        : 'border-stone-300 bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinNumClick(num)}
                  className="h-14 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-400 text-xl font-bold text-stone-800 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="h-14 rounded-2xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-600 transition active:scale-95 cursor-pointer"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => handlePinNumClick('0')}
                className="h-14 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-400 text-xl font-bold text-stone-800 transition active:scale-95 cursor-pointer shadow-2xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPin(prev => prev.slice(0, -1))}
                className="h-14 rounded-2xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-600 transition active:scale-95 cursor-pointer"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* Username & Password Mode */}
        {loginMode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-amber-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-amber-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white py-2.5 text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <span>{isSubmitting ? 'Memeriksa...' : 'Masuk Aplikasi'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Quick Demo Switcher */}
        <div className="border-t border-stone-100 pt-4">
            <p className="text-[11px] font-semibold text-stone-400 text-center mb-2">
            Pilihan Akun Cepat Pengujian (Kasir & Admin):
          </p>
          <div className="space-y-1.5">
            {users.map(u => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => handleQuickLogin(u)}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/70 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
                      u.role === 'ADMIN' ? 'bg-amber-800' : 'bg-emerald-700'
                    }`}
                  >
                    {u.role === 'ADMIN' ? 'AD' : 'KS'}
                  </div>
                  <div className="truncate text-xs">
                    <div className="font-bold text-stone-800 truncate">{u.full_name}</div>
                    <div className="text-[10px] text-stone-500">
                      User: <code className="font-mono text-stone-700 font-semibold">{u.username}</code>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    PIN {u.role === 'ADMIN' ? '1234' : '2026'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {onOpenSuperadminPortal && (
            <div className="pt-3 mt-3 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={onOpenSuperadminPortal}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-800 hover:text-purple-950 hover:underline transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Portal Khusus Lisensi Superadmin →</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Google Workspace Setup Modal */}
      <GoogleWorkspaceSetupModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={handleGoogleSetupSuccess}
      />
    </div>
  );
};
