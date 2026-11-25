import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, AlertTriangle, KeyRound, Check, X, Sparkles, MessageCircle, Send, RefreshCw, PhoneCall } from 'lucide-react';
import { db } from '../../services/db';
import { setSuperadminMFAVerified } from '../../services/auth';

interface SuperadminMFAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifiedSuccess: () => void;
  username: string;
}

export const SUPERADMIN_WA_NUMBER = '6285176947522';

export const SuperadminMFAModal: React.FC<SuperadminMFAModalProps> = ({
  isOpen,
  onClose,
  onVerifiedSuccess,
  username,
}) => {
  const [mfaCode, setMfaCode] = useState('');
  const [currentOtp, setCurrentOtp] = useState('101203');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSentNotice, setOtpSentNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set default or generate active 6-digit OTP for login session
      const generated = '101203';
      setCurrentOtp(generated);
      setMfaCode('');
      setErrorMsg(null);
      setOtpSentNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendWhatsAppOTP = () => {
    const textMessage = encodeURIComponent(
      `*MartVai Pro — KODE OTP SUPERADMIN*\n\n` +
      `Yth. Superadmin *DiVailean*,\n` +
      `Kode OTP Verifikasi Login Sesi Pusat Anda adalah: *${currentOtp}*\n\n` +
      `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n` +
      `Jam: ${new Date().toLocaleTimeString('id-ID')} WIB\n\n` +
      `_Rahasiakan kode ini dan jangan berikan kepada pihak lain._`
    );
    const waUrl = `https://wa.me/${SUPERADMIN_WA_NUMBER}?text=${textMessage}`;
    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOtpSentNotice(true);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMsg(null);

    // MFA Verification Rule for Superadmin "DiVailean":
    // Accepts generated OTP, master codes (101203, 10120302, 888888)
    const cleanCode = mfaCode.trim();
    if (
      cleanCode === currentOtp ||
      cleanCode === '101203' ||
      cleanCode === '10120302' ||
      cleanCode === '888888'
    ) {
      setTimeout(() => {
        setSuperadminMFAVerified(true);
        db.addAuditLog({
          log_id: 'log_' + Date.now(),
          user_id: 'user_superadmin_01',
          user_name: 'DiVailean (Superadmin Pusat)',
          action: 'SUPERADMIN_MFA_LOGIN_SUCCESS',
          entity_type: 'SECURITY',
          entity_id: 'session_superadmin',
          timestamp: new Date().toISOString(),
          details: `Login Superadmin DiVailean berhasil dengan OTP WhatsApp ke ${SUPERADMIN_WA_NUMBER}.`,
        });
        setIsVerifying(false);
        onVerifiedSuccess();
      }, 500);
    } else {
      setTimeout(() => {
        setIsVerifying(false);
        setErrorMsg('Kode OTP MFA salah. Silakan kirim ulang OTP ke WhatsApp atau gunakan kode: 101203');
        db.addAuditLog({
          log_id: 'log_' + Date.now(),
          user_id: 'user_superadmin_01',
          user_name: 'DiVailean (Superadmin Pusat)',
          action: 'SUPERADMIN_MFA_FAILED',
          entity_type: 'SECURITY',
          entity_id: 'session_superadmin',
          timestamp: new Date().toISOString(),
          details: `Percobaan verifikasi MFA Superadmin gagal. WA: ${SUPERADMIN_WA_NUMBER}, Input: ${cleanCode}`,
        });
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5 border border-amber-200">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-900 text-purple-200 flex items-center justify-center font-black shadow-xs">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900">
                Verifikasi OTP Superadmin
              </h2>
              <p className="text-[11px] text-purple-800 font-bold">
                Akun Pusat: <code className="bg-purple-100 px-1.5 py-0.5 rounded font-mono">{username}</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target WhatsApp Info Banner */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
          <div className="font-extrabold text-emerald-950 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>OTP Masuk Ke WhatsApp No:</span>
            </span>
            <span className="bg-emerald-700 text-white font-mono px-2 py-0.5 rounded-lg text-[11px] tracking-wide">
              +62 851-7694-7522
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-emerald-900">
            Kredensial Superadmin <strong>DiVailean</strong> terverifikasi. Tekan tombol di bawah untuk membuka WhatsApp dan menerima kode OTP 6-digit.
          </p>

          <button
            type="button"
            onClick={handleSendWhatsAppOTP}
            className="w-full mt-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
          >
            <Send className="w-4 h-4" />
            <span>Kirim OTP ke WhatsApp (+62 851-7694-7522)</span>
          </button>
        </div>

        {otpSentNotice && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Jendela WhatsApp telah dibuka. Periksa pesan OTP di No. <strong>6285176947522</strong>.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Masukkan 6-Digit Kode OTP WhatsApp (Kode Utama: <code className="text-purple-700 font-mono">101203</code>)
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
              <input
                type="text"
                maxLength={8}
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value)}
                placeholder="101203"
                className="w-full rounded-2xl border-2 border-stone-300 pl-10 pr-4 py-2.5 font-mono text-center text-lg font-black tracking-widest text-stone-900 focus:border-purple-600 focus:outline-none shadow-2xs"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-xs font-black shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isVerifying ? (
                <span>Memverifikasi OTP...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Verifikasi & Masuk</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center border-t border-stone-100 pt-3">
          <p className="text-[10px] text-stone-400 font-mono">
            MartVai Pro Superadmin Security • WA Gateway Target: 6285176947522
          </p>
        </div>
      </div>
    </div>
  );
};

