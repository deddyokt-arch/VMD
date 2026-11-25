import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running standalone as PWA, don't show
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
        title="Pasang MartVai Pro sebagai Aplikasi (PWA)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 text-xs font-medium transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-stone-900 animate-in fade-in zoom-in duration-150">
              <h3 className="text-base font-bold text-stone-900">Pasang MartVai Pro di iPhone / iPad</h3>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                1. Ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak tanda panah ke atas) di Safari.<br />
                2. Geser ke bawah lalu pilih <strong>Add to Home Screen (Tambahkan ke Layar Utama)</strong>.<br />
                3. MartVai Pro akan terpasang sebagai aplikasi kasir swalayan mandiri tanpa bilah browser.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-amber-800 text-white py-2 text-xs font-bold hover:bg-amber-900 transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
