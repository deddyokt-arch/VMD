import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  CartItem,
  OrderType,
  PaymentMethod,
  Transaction,
  User,
  TransactionItemSnapshot,
} from '../../types';
import { db } from '../../services/db';
import { syncManager } from '../../services/offlineSync';
import { formatRupiah } from '../../services/printer';
import { generateDynamicQRISPayload, generateQRCodeSVG } from '../../services/qris';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  orderType: OrderType;
  tableNumber: string;
  customerName: string;
  cartDiscount: number;
  currentUser: User;
  onCheckoutSuccess: (tx: Transaction) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  orderType,
  tableNumber,
  customerName,
  cartDiscount,
  currentUser,
  onCheckoutSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('TUNAI');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dynamicQRISCountdown, setDynamicQRISCountdown] = useState(900); // 15 mins
  const [isQRISVerified, setIsQRISVerified] = useState(false);
  const [manualQRISVerified, setManualQRISVerified] = useState(false);
  const [transferRef, setTransferRef] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const settings = db.getSettings();

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.line_total, 0);
  const discountTotal = cartDiscount;
  const taxableBase = Math.max(0, subtotal - discountTotal);
  const tax = settings.tax_enabled ? Math.round((taxableBase * settings.tax_percentage) / 100) : 0;
  const serviceCharge = settings.service_charge_enabled
    ? Math.round((taxableBase * settings.service_charge_percentage) / 100)
    : 0;
  const finalTotal = taxableBase + tax + serviceCharge;

  // Invoice Number
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

  // Dynamic QRIS Payload & SVG
  const qrisPayload = generateDynamicQRISPayload({
    merchantName: settings.cafe_name,
    merchantCity: 'JAKARTA',
    nmid: settings.qris_nmid,
    amount: finalTotal,
    invoiceNumber,
  });
  const qrisSVG = generateQRCodeSVG(qrisPayload, 220);

  useEffect(() => {
    if (isOpen) {
      setCashGiven(finalTotal);
      setIsSubmitting(false);
      setIsQRISVerified(false);
      setManualQRISVerified(false);
      setErrorMsg(null);
      setDynamicQRISCountdown(900);
    }
  }, [isOpen, finalTotal]);

  // Countdown timer for dynamic QRIS
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'QRIS_DINAMIS') return;
    const timer = setInterval(() => {
      setDynamicQRISCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, selectedMethod]);

  if (!isOpen) return null;

  const changeAmount = Math.max(0, cashGiven - finalTotal);
  const isCashInsufficient = selectedMethod === 'TUNAI' && cashGiven < finalTotal;

  // Quick cash buttons
  const quickCashOptions = [
    { label: 'Uang Pas', amount: finalTotal },
    { label: 'Rp 20.000', amount: 20000 },
    { label: 'Rp 50.000', amount: 50000 },
    { label: 'Rp 100.000', amount: 100000 },
    { label: 'Rp 200.000', amount: 200000 },
  ].filter(opt => opt.amount >= finalTotal || opt.label === 'Uang Pas');

  const handleProcessCheckout = () => {
    if (isSubmitting) return;

    // Validation
    if (selectedMethod === 'TUNAI' && cashGiven < finalTotal) {
      setErrorMsg('Nominal uang tunai yang diberikan kurang dari total belanja.');
      return;
    }

    if (selectedMethod === 'QRIS_STATIS' && !manualQRISVerified) {
      setErrorMsg('Harap lakukan verifikasi manual struk/notifikasi QRIS pelanggan terlebih dahulu.');
      return;
    }

    if (selectedMethod === 'QRIS_DINAMIS' && !isQRISVerified) {
      setErrorMsg('Harap konfirmasi status pembayaran QRIS dinamis berhasil.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const transactionId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Build items snapshot
    const itemSnapshots: TransactionItemSnapshot[] = cartItems.map((item, idx) => ({
      item_id: 'txi_' + Date.now() + '_' + idx,
      transaction_id: transactionId,
      product_id: item.product.product_id,
      product_name_snapshot: item.product.product_name,
      sku_snapshot: item.product.sku,
      quantity: item.quantity,
      unit_price: item.item_price,
      discount: item.discount,
      tax: settings.tax_enabled ? Math.round((item.line_total * settings.tax_percentage) / 100) : 0,
      cost_snapshot: item.item_cost || item.product.cost_price,
      line_total: item.line_total,
      notes: item.notes,
      variant_snapshot: item.selected_variants.map(v => v.name).join(', '),
    }));

    const newTx: Transaction = {
      transaction_id: transactionId,
      invoice_number: invoiceNumber,
      business_date: new Date().toISOString().slice(0, 10),
      cashier_id: currentUser.user_id,
      cashier_name: currentUser.full_name,
      order_type: orderType,
      table_number: tableNumber,
      customer_name: customerName,
      subtotal,
      discount: discountTotal,
      tax,
      service_charge: serviceCharge,
      total: finalTotal,
      paid_amount: selectedMethod === 'TUNAI' ? cashGiven : finalTotal,
      change_amount: selectedMethod === 'TUNAI' ? changeAmount : 0,
      payment_method: selectedMethod,
      payment_status: 'PAID',
      transaction_status: 'COMPLETED',
      notes: '',
      created_at: new Date().toISOString(),
      items: itemSnapshots,
    };

    const res = db.createTransaction(newTx, currentUser.user_id);
    if (!res.success) {
      setErrorMsg(res.error || 'Gagal menyimpan transaksi');
      setIsSubmitting(false);
      return;
    }

    // Trigger background sync + 80% spreadsheet auto-rotation check
    syncManager.syncPendingTransactions().catch(() => {});

    onCheckoutSuccess(newTx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-800 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#2D1B14] px-6 py-4 text-white">
          <div>
            <h2 className="text-base font-bold">Proses Pembayaran POS</h2>
            <p className="text-xs text-amber-200">
              No. Invoice: <span className="font-mono font-bold">{invoiceNumber}</span> • {orderType}
              {tableNumber ? ` • Troli/Member: ${tableNumber}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-300 hover:bg-stone-800 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('TUNAI')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer gap-1.5 ${
                  selectedMethod === 'TUNAI'
                    ? 'border-amber-700 bg-amber-50 text-amber-900 ring-2 ring-amber-700/50'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span>Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('QRIS_STATIS')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer gap-1.5 ${
                  selectedMethod === 'QRIS_STATIS'
                    ? 'border-amber-700 bg-amber-50 text-amber-900 ring-2 ring-amber-700/50'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <QrCode className="w-5 h-5 text-amber-600" />
                <span>QRIS Statis</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('QRIS_DINAMIS')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer gap-1.5 ${
                  selectedMethod === 'QRIS_DINAMIS'
                    ? 'border-amber-700 bg-amber-50 text-amber-900 ring-2 ring-amber-700/50'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>QRIS Dinamis</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('DEBIT_KREDIT')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer gap-1.5 ${
                  selectedMethod === 'DEBIT_KREDIT'
                    ? 'border-amber-700 bg-amber-50 text-amber-900 ring-2 ring-amber-700/50'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Kartu / Debit</span>
              </button>
            </div>
          </div>

          {/* Method Details */}
          {selectedMethod === 'TUNAI' && (
            <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <label className="block text-xs font-bold text-stone-700">
                Uang Tunai Diterima (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-sm">Rp</span>
                <input
                  type="number"
                  value={cashGiven || ''}
                  onChange={e => setCashGiven(Number(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 py-2.5 text-base font-extrabold text-stone-800 focus:border-amber-600 focus:outline-none"
                />
              </div>

              {/* Quick Bill Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickCashOptions.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setCashGiven(opt.amount)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-amber-400 text-xs font-medium text-stone-700 transition cursor-pointer shadow-2xs"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <span className="text-xs font-semibold text-stone-600">Kembalian:</span>
                <span
                  className={`text-base font-extrabold ${
                    isCashInsufficient ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {isCashInsufficient
                    ? `Kurang ${formatRupiah(finalTotal - cashGiven)}`
                    : formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {selectedMethod === 'QRIS_STATIS' && (
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3 text-center">
              <div className="max-w-[200px] mx-auto p-3 bg-white rounded-xl shadow-xs border border-stone-200">
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateQRCodeSVG(
                      `https://qris.id/${settings.qris_nmid || 'ID1020030040050'}`,
                      180
                    ),
                  }}
                  className="mx-auto"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-800">{settings.qris_merchant_name || settings.cafe_name}</p>
                <p className="text-[11px] font-mono text-stone-500">NMID: {settings.qris_nmid || 'ID1020030040050'}</p>
                <p className="text-xs text-amber-800 font-semibold mt-1">
                  Tagihan: {formatRupiah(finalTotal)}
                </p>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-left">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualQRISVerified}
                    onChange={e => setManualQRISVerified(e.target.checked)}
                    className="mt-0.5 rounded text-amber-700 focus:ring-amber-500 w-4 h-4"
                  />
                  <div className="text-xs text-stone-700 leading-tight">
                    <span className="font-bold">Konfirmasi Kasir:</span> Saya telah memeriksa bukti pembayaran pelanggan dan dana telah masuk ke rekening toko swalayan.
                    <p className="text-[10px] text-stone-500 mt-0.5">Diverifikasi oleh: {currentUser.full_name}</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {selectedMethod === 'QRIS_DINAMIS' && (
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3 text-center">
              <div className="flex items-center justify-between px-2 text-xs text-stone-600">
                <span className="flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  QRIS Dinamis Otomatis
                </span>
                <span className="flex items-center gap-1 text-amber-700 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {Math.floor(dynamicQRISCountdown / 60)}:
                  {(dynamicQRISCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="max-w-[240px] mx-auto p-3 bg-white rounded-xl shadow-xs border border-stone-200">
                <div dangerouslySetInnerHTML={{ __html: qrisSVG }} className="mx-auto" />
              </div>

              <div className="text-xs">
                <p className="font-bold text-stone-800">{settings.cafe_name}</p>
                <p className="text-base font-extrabold text-amber-900">{formatRupiah(finalTotal)}</p>
                <p className="text-[10px] text-stone-500 mt-0.5 font-mono">Invoice: {invoiceNumber}</p>
              </div>

              {/* Status Simulation */}
              <div className="pt-2">
                {isQRISVerified ? (
                  <div className="flex items-center justify-center gap-1.5 p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold">
                    <CheckCircle className="w-4 h-4" />
                    Pembayaran Berhasil Terverifikasi!
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Menunggu pelanggan memindai & membayar...
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQRISVerified(true)}
                      className="mx-auto px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Simulasi: Terima Notifikasi Bank Berhasil
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedMethod === 'DEBIT_KREDIT' && (
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                Nomor Referensi EDC / Approval Code
              </label>
              <input
                type="text"
                value={transferRef}
                onChange={e => setTransferRef(e.target.value)}
                placeholder="Contoh: EDC BCA #998124"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs focus:border-amber-600 focus:outline-none"
              />
              <p className="text-[11px] text-stone-500 leading-tight">
                Masukkan approval code dari struk mesin EDC fisik kasir sebagai bukti rekonsiliasi.
              </p>
            </div>
          )}

          {/* Bill Summary */}
          <div className="space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal ({cartItems.length} item produk)</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Diskon Transaksi</span>
                <span>-{formatRupiah(discountTotal)}</span>
              </div>
            )}
            {settings.tax_enabled && (
              <div className="flex justify-between">
                <span>PPN Retail ({settings.tax_percentage}%)</span>
                <span>{formatRupiah(tax)}</span>
              </div>
            )}
            {settings.service_charge_enabled && (
              <div className="flex justify-between">
                <span>Service Charge ({settings.service_charge_percentage}%)</span>
                <span>{formatRupiah(serviceCharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-stone-900 pt-2 border-t border-stone-200">
              <span>Total yang Wajib Dibayar</span>
              <span className="text-amber-900">{formatRupiah(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleProcessCheckout}
            disabled={isSubmitting || isCashInsufficient}
            className="flex items-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white px-6 py-2.5 text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            <span>{isSubmitting ? 'Memproses...' : 'Selesaikan Transaksi'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
