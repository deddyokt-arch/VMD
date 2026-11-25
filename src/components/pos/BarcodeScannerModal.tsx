import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, ScanBarcode, AlertCircle } from 'lucide-react';
import { db } from '../../services/db';
import { Product } from '../../types';
import { useDialog } from '../../contexts/DialogContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound?: (product: Product) => void;
  mode?: 'lookup' | 'capture';
  onBarcodeCaptured?: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductFound,
  mode = 'lookup',
  onBarcodeCaptured,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorIntervalRef = useRef<number | null>(null);
  const { toast } = useDialog();

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode('');
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (detectorIntervalRef.current !== null) {
      window.clearInterval(detectorIntervalRef.current);
      detectorIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleSubmitCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    if (mode === 'capture') {
      if (onBarcodeCaptured) {
        onBarcodeCaptured(trimmed);
      }
      stopCamera();
      onClose();
      return;
    }

    const products = db.getProducts();
    const found = products.find(
      p => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase()
    );

    if (found) {
      if (onProductFound) {
        onProductFound(found);
      }
      stopCamera();
      onClose();
    } else {
      toast(`Produk dengan Barcode / SKU "${trimmed}" tidak ditemukan.`, 'error');
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);

      // Native BarcodeDetector API (supported in modern Chrome / Android WebView)
      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (BarcodeDetectorCtor && videoRef.current) {
        try {
          const detector = new BarcodeDetectorCtor({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });
          detectorIntervalRef.current = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const detected = await detector.detect(videoRef.current);
              if (detected && detected.length > 0 && detected[0].rawValue) {
                const rawCode = String(detected[0].rawValue).trim();
                if (rawCode) {
                  handleSubmitCode(rawCode);
                }
              }
            } catch {
              // Ignore single-frame detection errors
            }
          }, 350);
        } catch {
          // Ignore if BarcodeDetector format initialization fails
        }
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError(
        'Kamera tidak dapat diakses atau izin ditolak. Anda dapat memasukkan kode barcode secara manual atau langsung memindai menggunakan scanner barcode USB/Bluetooth.'
      );
      setIsCameraActive(false);
    }
  };

  if (!isOpen) return null;

  const sampleProducts = db.getProducts().slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden text-stone-800">
        <div className="flex items-center justify-between border-b border-stone-100 bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">
              {mode === 'capture' ? 'Scan Barcode Produk Baru' : 'Pindai Barcode Produk'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Viewfinder */}
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-stone-900 flex items-center justify-center">
            {cameraError ? (
              <div className="p-4 text-center text-xs text-stone-300 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
                <p>{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-dashed border-emerald-400/80 m-8 rounded-lg pointer-events-none animate-pulse flex items-center justify-center">
                  <span className="text-[11px] font-medium text-emerald-200 bg-black/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    {isCameraActive
                      ? 'Arahkan kamera ke barcode kemasan produk'
                      : 'Menyiapkan kamera...'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Manual Input or Physical Scanner Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {mode === 'capture'
                ? 'Scan dengan Scanner USB/Bluetooth atau Ketik Angka Barcode'
                : 'Input Barcode Manual / Scanner USB & Bluetooth'}
            </label>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSubmitCode(manualCode);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Contoh: 8992761139014 atau scan langsung..."
                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-mono focus:border-emerald-600 focus:bg-white focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold transition cursor-pointer shrink-0"
              >
                {mode === 'capture' ? 'Gunakan Barcode' : 'Cari'}
              </button>
            </form>
          </div>

          {mode === 'lookup' && sampleProducts.length > 0 && (
            <div>
              <p className="text-[11px] text-stone-500 mb-2 font-medium">
                Uji Coba Cepat (Pilih Barcode Terdaftar):
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {sampleProducts.map(p => (
                  <button
                    key={p.product_id}
                    type="button"
                    onClick={() => handleSubmitCode(p.barcode)}
                    className="text-left p-2 rounded-lg border border-stone-200 hover:border-emerald-400 hover:bg-emerald-50 text-[11px] transition cursor-pointer"
                  >
                    <div className="font-semibold truncate text-stone-800">{p.product_name}</div>
                    <div className="text-stone-500 font-mono text-[10px]">{p.barcode}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-stone-100 bg-stone-50 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
