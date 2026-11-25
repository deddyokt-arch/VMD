import { Transaction, CafeSettings } from '../types';

export function formatRupiah(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Safe print helper that handles iframe sandbox constraints (allow-modals) gracefully
 */
export function safePrint(): void {
  try {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  } catch (err) {
    console.warn('Cetak terhalang oleh kebijakan sandbox iframe browser:', err);
  }
}

/**
 * Generate formatted plain-text receipt suitable for ESC/POS Bluetooth thermal printers
 */
export function generateTextReceipt(tx: Transaction, settings: CafeSettings, isCopy = false): string {
  const lineChar = '-';
  const width = settings.receipt_paper_size === '80mm' ? 42 : 32;
  const separator = lineChar.repeat(width);

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const justify = (left: string, right: string) => {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  let out = '';
  if (isCopy) {
    out += center('*** SALINAN / DUPLIKAT ***') + '\n';
  }
  out += center((settings.cafe_name || 'VAIMART SWALAYAN').toUpperCase()) + '\n';
  if (settings.address) out += center(settings.address) + '\n';
  if (settings.phone) out += center('Telp: ' + settings.phone) + '\n';
  out += separator + '\n';
  out += justify('No: ' + tx.invoice_number, tx.order_type || 'SWALAYAN') + '\n';
  out += justify('Waktu:', formatDateTime(tx.created_at)) + '\n';
  out += justify('Kasir:', tx.cashier_name) + '\n';
  if (tx.table_number) out += justify('Keranjang/Ref:', tx.table_number) + '\n';
  if (tx.customer_name) out += justify('Pelanggan:', tx.customer_name) + '\n';
  out += separator + '\n';

  // Items
  let totalQty = 0;
  for (const item of tx.items) {
    totalQty += item.quantity;
    out += item.product_name_snapshot + '\n';
    if (item.sku_snapshot) {
      out += `  [SKU: ${item.sku_snapshot}]\n`;
    }
    if (item.variant_snapshot) {
      out += `  (${item.variant_snapshot})\n`;
    }
    const qtyPrice = `${item.quantity}x @${formatRupiah(item.unit_price)}`;
    const lineTotal = formatRupiah(item.line_total);
    out += justify('  ' + qtyPrice, lineTotal) + '\n';
    if (item.notes) {
      out += `  * ${item.notes}\n`;
    }
  }

  out += separator + '\n';
  out += justify('TOTAL ITEM:', `${totalQty} PCS`) + '\n';
  out += justify('Subtotal:', formatRupiah(tx.subtotal)) + '\n';
  if (tx.discount > 0) {
    out += justify('Diskon:', '-' + formatRupiah(tx.discount)) + '\n';
  }
  if (tx.tax > 0) {
    out += justify(`Pajak (${settings.tax_percentage}%):`, formatRupiah(tx.tax)) + '\n';
  }
  out += separator + '\n';
  out += justify('TOTAL BELANJA:', formatRupiah(tx.total)) + '\n';
  out += justify('Metode Bayar:', tx.payment_method) + '\n';
  out += justify('Bayar:', formatRupiah(tx.paid_amount)) + '\n';
  out += justify('Kembali:', formatRupiah(tx.change_amount)) + '\n';
  out += separator + '\n';
  out += center(settings.receipt_footer || 'Terima kasih telah berbelanja di Swalayan Kami!') + '\n';
  out += center('Barang yang sudah dibeli tidak dapat ditukar.') + '\n\n\n';

  return out;
}

/**
 * Print receipt using HTML thermal styling
 */
export function printReceiptWindow(tx: Transaction, settings: CafeSettings, isCopy = false): void {
  const paperWidth = settings.receipt_paper_size === '80mm' ? '76mm' : '56mm';
  const totalQty = tx.items.reduce((acc, i) => acc + i.quantity, 0);

  const itemsHtml = tx.items
    .map(
      item => `
    <div style="margin-bottom: 6px;">
      <div style="font-weight: 600;">${item.product_name_snapshot}</div>
      ${item.sku_snapshot ? `<div style="font-size: 10px; color: #666;">SKU: ${item.sku_snapshot}</div>` : ''}
      ${item.variant_snapshot ? `<div style="font-size: 11px; color: #555;">${item.variant_snapshot}</div>` : ''}
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>${item.quantity} x ${formatRupiah(item.unit_price)}</span>
        <span>${formatRupiah(item.line_total)}</span>
      </div>
      ${item.notes ? `<div style="font-size: 10px; font-style: italic; color: #666;">Catatan: ${item.notes}</div>` : ''}
    </div>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk Belanja - ${tx.invoice_number}</title>
        <style>
          @page { margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            width: ${paperWidth};
            margin: 0 auto;
            padding: 12px 6px;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .flex { display: flex; justify-content: space-between; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .bold { font-weight: bold; }
          .badge {
            display: inline-block;
            border: 1px solid #000;
            padding: 2px 6px;
            font-size: 10px;
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <div class="center">
          ${isCopy ? '<div class="badge">*** SALINAN STRUK ***</div><br/>' : ''}
          <div style="font-size: 15px; font-weight: bold;">${settings.cafe_name || 'VAIMART SWALAYAN'}</div>
          <div>${settings.address || ''}</div>
          <div>Telp: ${settings.phone || '-'}</div>
        </div>
        <div class="divider"></div>
        <div class="flex"><span>No: ${tx.invoice_number}</span><span>${tx.order_type || 'SWALAYAN'}</span></div>
        <div class="flex"><span>Waktu:</span><span>${formatDateTime(tx.created_at)}</span></div>
        <div class="flex"><span>Kasir:</span><span>${tx.cashier_name}</span></div>
        ${tx.table_number ? `<div class="flex"><span>Ref/Keranjang:</span><span>${tx.table_number}</span></div>` : ''}
        ${tx.customer_name ? `<div class="flex"><span>Pelanggan:</span><span>${tx.customer_name}</span></div>` : ''}
        <div class="divider"></div>
        
        ${itemsHtml}
        
        <div class="divider"></div>
        <div class="flex"><span>Total Item</span><span>${totalQty} PCS</span></div>
        <div class="flex"><span>Subtotal</span><span>${formatRupiah(tx.subtotal)}</span></div>
        ${tx.discount > 0 ? `<div class="flex"><span>Diskon</span><span>-${formatRupiah(tx.discount)}</span></div>` : ''}
        ${tx.tax > 0 ? `<div class="flex"><span>Pajak (${settings.tax_percentage}%)</span><span>${formatRupiah(tx.tax)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="flex bold" style="font-size: 13px;"><span>TOTAL BELANJA</span><span>${formatRupiah(tx.total)}</span></div>
        <div class="flex"><span>Metode</span><span>${tx.payment_method}</span></div>
        <div class="flex"><span>Bayar</span><span>${formatRupiah(tx.paid_amount)}</span></div>
        <div class="flex bold"><span>Kembali</span><span>${formatRupiah(tx.change_amount)}</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size: 11px;">
          ${settings.receipt_footer || 'Terima kasih telah berbelanja di Swalayan Kami!'}<br/>
          <em>MartVai POS Supermarket Terintegrasi</em>
        </div>
      </body>
    </html>
  `;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      safePrint();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        safePrint();
      }
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1500);
    }, 250);
  } catch (err) {
    console.warn('Cetak struk iframe fallback:', err);
    safePrint();
  }
}

/**
 * Generate WhatsApp share message with full receipt
 */
export function getWhatsAppReceiptURL(phone: string, tx: Transaction, settings: CafeSettings): string {
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }
  const text = generateTextReceipt(tx, settings);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
