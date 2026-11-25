import React from 'react';
import { Smartphone, Monitor, Terminal, CheckCircle2, Copy, Download, ExternalLink } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

export const AndroidWindowsGuidePage: React.FC = () => {
  const { toast } = useDialog();
  const copyCmd = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('Perintah berhasil disalin ke clipboard!', 'success');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-stone-900 tracking-tight">
          Panduan Build Android APK &amp; Aplikasi Windows Desktop
        </h1>
        <p className="text-xs text-stone-500">
          Petunjuk langkah demi langkah mengemas MartVai Pro menjadi aplikasi kasir swalayan mandiri untuk Android dan PC Kasir Windows.
        </p>
      </div>

      {/* PWA Direct Installation Card */}
      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-stone-800 space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
          <CheckCircle2 className="w-5 h-5 text-amber-700" />
          <span>Cara Paling Cepat: Pasang Langsung sebagai PWA (Progressive Web App)</span>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          MartVai Pro telah dilengkapi dengan Web App Manifest dan Service Worker. Anda dapat langsung menginstalnya di HP Android (Chrome), Windows PC (Chrome/Edge), atau iPad/iPhone (Safari) tanpa perlu kompilasi APK:
        </p>
        <ul className="list-disc pl-5 text-xs text-stone-600 space-y-1">
          <li><strong>Android / PC:</strong> Klik tombol <strong>"Install App"</strong> di bilah atas aplikasi, atau klik menu titik tiga di browser &gt; <em>"Install MartVai Pro"</em>.</li>
          <li><strong>iPhone / iPad:</strong> Buka di Safari &gt; Tap tombol <em>Share</em> &gt; Pilih <em>"Add to Home Screen"</em>.</li>
        </ul>
      </div>

      {/* Section 1: Android APK Build Guide */}
      <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-stone-900">1. Build Android APK via Capacitor</h2>
            <p className="text-[11px] text-stone-500">Untuk instalasi file .apk di tablet kasir, smartphone Android, atau POS Android.</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-stone-700">
          <p>
            Konfigurasi Capacitor telah disiapkan di root proyek: <code className="bg-stone-100 px-2 py-0.5 rounded font-mono text-[11px]">capacitor.config.json</code> dengan Package ID <code className="font-mono text-amber-900 font-bold">id.martvai.pos</code>.
          </p>

          <div className="space-y-2">
            <div className="font-bold text-stone-800">Langkah-langkah di terminal komputer Anda:</div>

            <div className="p-3 bg-stone-900 text-stone-200 rounded-xl font-mono text-xs space-y-2">
              <div className="flex justify-between items-center text-stone-400 border-b border-stone-800 pb-1">
                <span>Perintah Build Android:</span>
                <button
                  onClick={() => copyCmd('npm run build\nnpx cap add android\nnpx cap sync android\nnpx cap open android')}
                  className="hover:text-white flex items-center gap-1 text-[10px]"
                >
                  <Copy className="w-3 h-3" /> Salin
                </button>
              </div>
              <pre className="text-amber-400">
{`# 1. Build aset web production
npm run build

# 2. Pasang Capacitor Android
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android

# 3. Sinkronisasikan aset dist ke project Android
npx cap sync android

# 4. Buka Android Studio untuk Build APK Release/Debug
npx cap open android`}
              </pre>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1 text-[11px]">
            <div className="font-bold text-stone-800">Izin Perangkat yang Diperlukan (AndroidManifest.xml):</div>
            <div>• <code className="font-mono text-amber-900">android.permission.CAMERA</code> (untuk memindai barcode via kamera HP)</div>
            <div>• <code className="font-mono text-amber-900">android.permission.INTERNET</code> (untuk sinkronisasi ke Google Sheets)</div>
            <div>• <code className="font-mono text-amber-900">android.permission.BLUETOOTH_CONNECT</code> (untuk printer thermal bluetooth)</div>
          </div>
        </div>
      </div>

      {/* Section 2: Windows Desktop App Guide */}
      <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-stone-900">2. Build Windows Desktop (.exe / Installer)</h2>
            <p className="text-[11px] text-stone-500">Untuk komputer kasir PC Windows, laptop, dan integrasi laci kasir USB.</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-stone-700">
          <p>
            Untuk PC kasir Windows, Anda dapat mengemas frontend ini menggunakan <strong>Tauri</strong> (sangat ringan ~5MB) atau <strong>Electron</strong>.
          </p>

          <div className="p-3 bg-stone-900 text-stone-200 rounded-xl font-mono text-xs space-y-2">
            <div className="flex justify-between items-center text-stone-400 border-b border-stone-800 pb-1">
              <span>Perintah Build Windows Installer (Tauri):</span>
              <button
                onClick={() => copyCmd('npm create tauri-app@latest\nnpm run tauri build')}
                className="hover:text-white flex items-center gap-1 text-[10px]"
              >
                <Copy className="w-3 h-3" /> Salin
              </button>
            </div>
            <pre className="text-amber-400">
{`# 1. Tambahkan Tauri ke proyek
npm install -D @tauri-apps/cli

# 2. Inisialisasi Tauri
npx tauri init

# 3. Kompilasi Installer Windows (.msi / .exe)
npm run build
npx tauri build`}
            </pre>
          </div>

          <p className="text-[11px] text-stone-500">
            Hasil build akan berada di folder <code className="font-mono bg-stone-100 px-1 py-0.5 rounded">src-tauri/target/release/bundle/msi/</code> yang dapat langsung didistribusikan ke PC kasir manapun.
          </p>
        </div>
      </div>
    </div>
  );
};
