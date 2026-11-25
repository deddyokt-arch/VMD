import React, { useState } from 'react';
import {
  X,
  Printer,
  Share2,
  Copy,
  Check,
  Send,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Transaction } from '../../types';
import { db } from '../../services/db';
import {
  formatRupiah,
  formatDateTime,
  printReceiptWindow,
  generateTextReceipt,
  getWhatsAppReceiptURL,
} from '../../services/printer';

interface ReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  isDuplicate?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  isOpen,
  onClose,
  isDuplicate = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [showWaInput, setShowWaInput] = useState(false);

  if (!isOpen || !transaction) return null;

  const settings = db.getSettings();

  const handlePrint = () => {
    printReceiptWindow(transaction, settings, isDuplicate);
  };

  const handleCopyText = async () => {
    const text = generateTextReceipt(transaction, settings, isDuplicate);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPhone) return;
    const url = getWhatsAppReceiptURL(waPhone, transaction, settings);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowWaInput(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-800 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#2D1B14] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold">Struk Belanja Kasir</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-300 hover:bg-stone-800 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content Simulation */}
        <div className="p-5 overflow-y-auto flex-1 bg-stone-100/70">
          <div className="mx-auto max-w-[320px] rounded-xl bg-white p-5 shadow-sm border border-stone-200 text-stone-900 font-mono text-[11px] leading-tight space-y-2">
            {isDuplicate && (
              <div className="text-center font-bold text-red-600 border border-red-500 py-0.5 rounded text-[10px]">
                *** SALINAN / DUPLIKAT STRUK ***
              </div>
            )}
            <div className="text-center">
              <div className="font-extrabold text-sm">{settings.cafe_name}</div>
              <div className="text-[10px] text-stone-500">{settings.address}</div>
              <div className="text-[10px] text-stone-500">Telp: {settings.phone}</div>
            </div>

            <div className="border-t border-dashed border-stone-300 my-2" />

            <div className="flex justify-between text-[10px]">
              <span>No: {transaction.invoice_number}</span>
              <span className="font-bold">{transaction.order_type}</span>
            </div>
            <div className="flex justify-between text-[10px] text-stone-500">
              <span>{formatDateTime(transaction.created_at)}</span>
              <span>Kasir: {transaction.cashier_name}</span>
            </div>
            {transaction.table_number && (
              <div className="flex justify-between text-[10px] text-stone-600 font-semibold">
                <span>No. Troli / Member:</span>
                <span>{transaction.table_number}</span>
              </div>
            )}

            <div className="border-t border-dashed border-stone-300 my-2" />

            {/* Items */}
            <div className="space-y-1.5">
              {transaction.items.map(item => (
                <div key={item.item_id}>
                  <div className="font-bold text-stone-800">{item.product_name_snapshot}</div>
                  {item.variant_snapshot && (
                    <div className="text-[9px] text-stone-500 italic">({item.variant_snapshot})</div>
                  )}
                  <div className="flex justify-between text-stone-600">
                    <span>
                      {item.quantity} x {formatRupiah(item.unit_price)}
                    </span>
                    <span>{formatRupiah(item.line_total)}</span>
                  </div>
                  {item.notes && (
                    <div className="text-[9px] text-stone-400">* {item.notes}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-stone-300 my-2" />

            {/* Totals */}
            <div className="space-y-0.5 text-stone-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>Diskon</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div className="flex justify-between">
                  <span>PPN ({settings.tax_percentage}%)</span>
                  <span>{formatRupiah(transaction.tax)}</span>
                </div>
              )}
              {transaction.service_charge > 0 && (
                <div className="flex justify-between">
                  <span>Service ({settings.service_charge_percentage}%)</span>
                  <span>{formatRupiah(transaction.service_charge)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm text-stone-900 pt-1 border-t border-dashed border-stone-300">
                <span>TOTAL</span>
                <span>{formatRupiah(transaction.total)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Metode Bayar:</span>
                <span className="font-semibold">{transaction.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>Bayar:</span>
                <span>{formatRupiah(transaction.paid_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Kembali:</span>
                <span>{formatRupiah(transaction.change_amount)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-stone-300 my-2" />

            <div className="text-center text-[10px] text-stone-500 space-y-0.5">
              <div>{settings.receipt_footer || 'Terima kasih telah berbelanja di Swalayan Kami!'}</div>
              <div className="text-[9px] text-stone-400">Powered by MartVai POS Swalayan</div>
            </div>
          </div>

          {/* WhatsApp share form */}
          {showWaInput && (
            <form onSubmit={handleSendWA} className="mt-4 p-3 bg-white rounded-xl border border-stone-200 space-y-2">
              <label className="block text-xs font-semibold text-stone-700">
                Nomor WhatsApp Pelanggan (08...):
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={waPhone}
                  onChange={e => setWaPhone(e.target.value)}
                  placeholder="08123456789"
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs focus:outline-none focus:border-amber-600"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-100 bg-white p-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (Thermal)</span>
            </button>

            <button
              onClick={() => setShowWaInput(!showWaInput)}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleCopyText}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
          >
            Tutup & Pesanan Baru
          </button>
        </div>
      </div>
    </div>
  );
};
