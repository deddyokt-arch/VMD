import React, { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { Product, ProductVariant, CartItemModifier } from '../../types';
import { formatRupiah } from '../../services/printer';

interface ProductModifierModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    quantity: number,
    modifiers: CartItemModifier[],
    notes: string,
    calculatedPrice: number
  ) => void;
}

export const ProductModifierModal: React.FC<ProductModifierModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedVariants, setSelectedVariants] = useState<{ [variantId: string]: boolean }>({});

  if (!isOpen) return null;

  const variants = product.variants || [];

  // Group variants by group_name
  const groups: { [group: string]: ProductVariant[] } = {};
  variants.forEach(v => {
    const grp = v.group_name || 'Pilihan Tambahan';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(v);
  });

  const toggleVariant = (variantId: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [variantId]: !prev[variantId],
    }));
  };

  // Calculate modifier addition
  const activeModifiers: CartItemModifier[] = variants
    .filter(v => selectedVariants[v.variant_id])
    .map(v => ({
      group: v.group_name || 'Varian',
      name: v.variant_name,
      price: v.additional_price,
    }));

  const additionalPerItem = activeModifiers.reduce((acc, m) => acc + m.price, 0);
  const singleItemPrice = product.selling_price + additionalPerItem;
  const lineTotal = singleItemPrice * quantity;

  const handleAdd = () => {
    onAddToCart(product, quantity, activeModifiers, notes, singleItemPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-stone-800 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-[#2D1B14] px-5 py-4 text-white">
          <div className="truncate">
            <h2 className="text-base font-bold truncate">{product.product_name}</h2>
            <p className="text-xs text-amber-200">
              Harga Dasar: {formatRupiah(product.selling_price)} / {product.unit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-300 hover:bg-stone-800 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {product.image_url && (
            <div className="h-44 w-full rounded-xl overflow-hidden bg-stone-100 relative">
              <img
                src={product.image_url}
                alt={product.product_name}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-xs font-semibold">
                SKU: {product.sku}
              </div>
            </div>
          )}

          {product.description && (
            <p className="text-xs leading-relaxed text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
              {product.description}
            </p>
          )}

          {/* Variants & Modifiers Groups */}
          {Object.entries(groups).map(([groupName, groupVariants]) => (
            <div key={groupName} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {groupName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupVariants.map(v => {
                  const isChecked = !!selectedVariants[v.variant_id];
                  return (
                    <button
                      key={v.variant_id}
                      type="button"
                      onClick={() => toggleVariant(v.variant_id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition cursor-pointer text-left ${
                        isChecked
                          ? 'border-amber-600 bg-amber-50/80 text-amber-950 font-semibold ring-1 ring-amber-600'
                          : 'border-stone-200 hover:border-amber-400 bg-white text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            isChecked
                              ? 'bg-amber-700 border-amber-700 text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{v.variant_name}</span>
                      </div>
                      <span className="text-stone-500 font-semibold">
                        {v.additional_price > 0 ? `+${formatRupiah(v.additional_price)}` : 'Gratis'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              Catatan Pesanan Khusus
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contoh: Less ice, jangan pakai sedotan, pisah gula"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs focus:border-amber-600 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Jumlah Pesanan
            </span>
            <div className="flex items-center gap-3 bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-bold text-stone-900">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-amber-700 text-white shadow-xs flex items-center justify-center hover:bg-amber-800 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 bg-stone-50 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-stone-500">Total Harga Item</div>
            <div className="text-base font-extrabold text-amber-900">
              {formatRupiah(lineTotal)}
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-6 py-2.5 text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            Tambahkan ke Keranjang
          </button>
        </div>
      </div>
    </div>
  );
};
