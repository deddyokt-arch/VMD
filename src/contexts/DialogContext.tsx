import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, Trash2, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface AlertOptions {
  title?: string;
  message: string;
  variant?: ToastType;
}

interface DialogContextValue {
  confirmAction: (options: ConfirmOptions | string) => Promise<boolean>;
  showAlert: (options: AlertOptions | string, variant?: ToastType) => Promise<void>;
  toast: (message: string, type?: ToastType) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const useDialog = (): DialogContextValue => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used inside DialogProvider');
  }
  return ctx;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [alertState, setAlertState] = useState<{
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);

  const toastCounter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    toastCounter.current += 1;
    const id = `toast_${Date.now()}_${toastCounter.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  }, []);

  const confirmAction = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions =
      typeof options === 'string'
        ? {
            title: 'Konfirmasi Aksi',
            message: options,
            confirmLabel: 'Ya, Lanjutkan',
            cancelLabel: 'Batal',
            variant: options.toLowerCase().includes('hapus') ? 'danger' : 'warning',
          }
        : options;

    return new Promise<boolean>(resolve => {
      setConfirmState({ options: normalized, resolve });
    });
  }, []);

  const showAlert = useCallback(
    (options: AlertOptions | string, variant: ToastType = 'info'): Promise<void> => {
      const normalized: AlertOptions =
        typeof options === 'string'
          ? {
              title:
                variant === 'error'
                  ? 'Perhatian'
                  : variant === 'success'
                  ? 'Berhasil'
                  : variant === 'warning'
                  ? 'Peringatan'
                  : 'Informasi',
              message: options,
              variant,
            }
          : options;

      return new Promise<void>(resolve => {
        setAlertState({ options: normalized, resolve });
      });
    },
    []
  );

  const handleConfirmClose = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const handleAlertClose = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  return (
    <DialogContext.Provider value={{ confirmAction, showAlert, toast }}>
      {children}

      {/* Floating Toasts */}
      <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold shadow-xl border backdrop-blur-sm transition-all ${
              t.type === 'success'
                ? 'bg-emerald-900/95 text-white border-emerald-700'
                : t.type === 'error'
                ? 'bg-red-900/95 text-white border-red-700'
                : t.type === 'warning'
                ? 'bg-amber-800/95 text-white border-amber-600'
                : 'bg-slate-900/95 text-white border-slate-700'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />}
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Modal (Replaces native window.confirm blocked by sandboxed iframe) */}
      {confirmState && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden text-stone-800">
            <div
              className={`flex items-center justify-between px-5 py-3.5 border-b ${
                confirmState.options.variant === 'danger'
                  ? 'bg-red-50 border-red-100 text-red-900'
                  : 'bg-amber-50 border-amber-100 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-2 font-extrabold text-sm">
                {confirmState.options.variant === 'danger' ? (
                  <Trash2 className="w-4 h-4 text-red-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                )}
                <span>{confirmState.options.title || 'Konfirmasi'}</span>
              </div>
              <button
                onClick={() => handleConfirmClose(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs text-stone-700 leading-relaxed whitespace-pre-line">
              {confirmState.options.message}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3.5 bg-stone-50 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 cursor-pointer transition"
              >
                {confirmState.options.cancelLabel || 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer transition ${
                  confirmState.options.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {confirmState.options.confirmLabel ||
                  (confirmState.options.variant === 'danger' ? 'Ya, Hapus' : 'Ya, Lanjutkan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal (Replaces native window.alert blocked by sandboxed iframe) */}
      {alertState && (
        <div className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden text-stone-800">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2 font-extrabold text-sm text-stone-900">
                {alertState.options.variant === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : alertState.options.variant === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : alertState.options.variant === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Info className="w-4 h-4 text-sky-600" />
                )}
                <span>{alertState.options.title || 'Informasi'}</span>
              </div>
              <button
                onClick={handleAlertClose}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs text-stone-700 leading-relaxed whitespace-pre-line">
              {alertState.options.message}
            </div>

            <div className="flex justify-end px-5 py-3.5 bg-stone-50 border-t border-stone-100">
              <button
                type="button"
                onClick={handleAlertClose}
                className="px-5 py-2 rounded-xl bg-[#2D1B14] hover:bg-stone-800 text-xs font-bold text-white cursor-pointer transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
