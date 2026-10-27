import React, { useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  MessageSquare,
  Edit2,
  Trash2,
  Droplets,
  Zap,
  Fan,
  Lightbulb,
  Wrench,
  Package,
} from 'lucide-react';
import { Product, CartItem, CategoryConfig } from '../types';
import { ProductGroup, getVariantSizeLabel } from '../utils/productGrouping';
import { getCategoryDisplayName } from '../data/categories';

interface SizeSelectorModalProps {
  group: ProductGroup | null;
  onClose: () => void;
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity: number) => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  onOpenWhatsAppForProduct?: (product: Product) => void;
  highlightedVariantIds?: Set<string>;
  isAdmin?: boolean;
  onQuickEditPrice?: (product?: Product) => void;
  onRequestDeleteProduct?: (product: Product) => void;
  categories?: CategoryConfig[];
}

function renderCategoryFallbackIcon(category: string) {
  const cat = (category || '').toLowerCase();
  if (cat === 'plumbing') return <Droplets className="w-5 h-5 text-amber-600" />;
  if (cat === 'electrical') return <Zap className="w-5 h-5 text-amber-600" />;
  if (cat === 'fans') return <Fan className="w-5 h-5 text-amber-600" />;
  if (cat === 'lights') return <Lightbulb className="w-5 h-5 text-amber-600" />;
  if (cat === 'tools') return <Wrench className="w-5 h-5 text-amber-600" />;
  return <Package className="w-5 h-5 text-amber-600" />;
}

export const SizeSelectorModal: React.FC<SizeSelectorModalProps> = ({
  group,
  onClose,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onOpenWhatsAppForProduct,
  highlightedVariantIds,
  isAdmin = false,
  onQuickEditPrice,
  onRequestDeleteProduct,
  categories,
}) => {
  useEffect(() => {
    if (!group) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [group, onClose]);

  if (!group) return null;

  const getCartQuantity = (productId: string): number => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    const item = cartItems.find((i) => i && i.product && i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const primaryVariant =
    group.variants.find((v) => v.image && v.image.trim() !== '') || group.variants[0];

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-selector-title"
    >
      <div
        className="bg-white border-t sm:border border-slate-200 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl text-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {primaryVariant?.image && primaryVariant.image.trim() !== '' ? (
                <img
                  src={primaryVariant.image}
                  alt={group.baseName}
                  className="w-full h-full object-cover"
                />
              ) : (
                renderCategoryFallbackIcon(group.category)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                <span className="text-amber-700 font-semibold">
                  {getCategoryDisplayName(group.category, categories)}
                </span>
                {group.subcategory && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{group.subcategory}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{group.variants.length} sizes</span>
              </div>
              <h3
                id="size-selector-title"
                className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-2 mt-0.5"
              >
                {group.baseName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select required size and quantity to add to cart
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center shrink-0 transition focus-visible:outline-2 focus-visible:outline-amber-500"
            aria-label="Close size selector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Variant Rows */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 px-4 sm:px-5">
          {group.variants.map((variant) => {
            const sizeLabel = getVariantSizeLabel(variant);
            const qty = getCartQuantity(variant.id);
            const isHighlighted = highlightedVariantIds?.has(variant.id);
            const hasDiscount =
              variant.originalPrice &&
              variant.originalPrice > variant.price &&
              variant.price > 0;
            const discountPct = hasDiscount
              ? Math.round(
                  (((variant.originalPrice as number) - variant.price) /
                    (variant.originalPrice as number)) *
                    100
                )
              : 0;

            return (
              <div
                key={variant.id}
                className={`py-3 sm:py-3.5 flex items-center justify-between gap-3 transition-colors ${
                  qty > 0 ? 'bg-amber-50/35 -mx-4 px-4 sm:-mx-5 sm:px-5' : ''
                }`}
              >
                {/* Left: Size Name & Part Metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums">
                      {sizeLabel}
                    </span>
                    {isHighlighted && (
                      <span className="text-[11px] font-semibold text-amber-700">
                        · Matches search
                      </span>
                    )}
                    {variant.stockStatus === 'low_stock' && (
                      <span className="text-[11px] font-semibold text-amber-700">
                        · Low stock
                      </span>
                    )}
                    {variant.stockStatus === 'out_of_stock' && (
                      <span className="text-[11px] font-semibold text-rose-600">
                        · Out of stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span>Per {variant.unit}</span>
                    {isAdmin && variant.hsnCode && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">HSN {variant.hsnCode}</span>
                      </>
                    )}
                  </div>

                  {isAdmin && (onQuickEditPrice || onRequestDeleteProduct) && (
                    <div className="flex items-center gap-3 mt-1.5">
                      {onQuickEditPrice && (
                        <button
                          type="button"
                          onClick={() => onQuickEditPrice(variant)}
                          className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit variant
                        </button>
                      )}
                      {onRequestDeleteProduct && (
                        <button
                          type="button"
                          onClick={() => onRequestDeleteProduct(variant)}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Price + Stepper / Add Button */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <div className="text-right">
                    {variant.price > 0 ? (
                      <>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tabular-nums leading-tight">
                          ₹{variant.price.toFixed(2)}
                        </div>
                        {hasDiscount ? (
                          <div className="flex items-center justify-end gap-1 text-[11px] mt-0.5">
                            <span className="text-slate-400 line-through font-mono tabular-nums">
                              ₹{(variant.originalPrice as number).toFixed(2)}
                            </span>
                            <span className="text-emerald-700 font-bold">{discountPct}% off</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">/{variant.unit}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-xs sm:text-sm font-bold text-amber-700">
                          Ask Price
                        </div>
                        <div className="text-[11px] text-slate-400">Quote</div>
                      </>
                    )}
                  </div>

                  {/* Action Control */}
                  <div className="w-28 sm:w-32 flex justify-end">
                    {variant.price <= 0 ? (
                      onOpenWhatsAppForProduct ? (
                        <button
                          type="button"
                          onClick={() => onOpenWhatsAppForProduct(variant)}
                          className="w-full min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition active:scale-95"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Quote</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">On request</span>
                      )
                    ) : qty > 0 ? (
                      <div className="w-full min-h-[40px] flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity
                              ? onUpdateQuantity(variant.id, -1)
                              : onAddToCart(variant, -1)
                          }
                          className="w-8 h-8 rounded-md bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center transition"
                          aria-label={`Decrease quantity for size ${sizeLabel}`}
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <span className="px-2 font-extrabold font-mono tabular-nums text-xs sm:text-sm text-slate-900">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddToCart(variant, 1)}
                          disabled={variant.stockStatus === 'out_of_stock'}
                          className="w-8 h-8 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition disabled:opacity-40"
                          aria-label={`Increase quantity for size ${sizeLabel}`}
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddToCart(variant, 1)}
                        disabled={variant.stockStatus === 'out_of_stock'}
                        className={`w-full min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                          variant.stockStatus === 'out_of_stock'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs active:scale-95'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 stroke-[2.25]" />
                        <span>+ Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
