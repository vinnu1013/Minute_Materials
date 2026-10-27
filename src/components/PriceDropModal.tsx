import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingDown,
  Tag,
  ShoppingCart,
  Flame,
  Plus,
  Minus,
  Droplets,
  Zap,
  Fan,
  Lightbulb,
  Wrench,
  Package,
} from 'lucide-react';
import { Product, CartItem, CategoryConfig } from '../types';
import { groupProductsByBaseName } from '../utils/productGrouping';
import { SizeSelectorModal } from './SizeSelectorModal';
import { getCategoryDisplayName } from '../data/categories';

interface PriceDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  cartItems?: CartItem[];
  onUpdateQuantity?: (productId: string, delta: number) => void;
  onOpenWhatsAppForProduct?: (product: Product) => void;
  categories?: CategoryConfig[];
}

export const PriceDropModal: React.FC<PriceDropModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddToCart,
  cartItems = [],
  onUpdateQuantity,
  onOpenWhatsAppForProduct,
  categories,
}) => {
  const [activeSizeGroupKey, setActiveSizeGroupKey] = useState<string | null>(null);

  // Group discounted products so multi-size items show one card and ask size on Add
  const discountedGroups = useMemo(() => {
    const discounted = products.filter(
      (p) => p.originalPrice && p.originalPrice > p.price && p.price > 0
    );
    return groupProductsByBaseName(discounted);
  }, [products]);

  const getCartQuantity = (productId: string) => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    const item = cartItems.find((i) => i && i.product && i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const activeModalGroup = useMemo(() => {
    if (!activeSizeGroupKey) return null;
    return discountedGroups.find((g) => g.key === activeSizeGroupKey) || null;
  }, [activeSizeGroupKey, discountedGroups]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center min-h-screen">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl lg:max-w-5xl w-full p-4 sm:p-6 text-slate-900 shadow-2xl relative my-auto sm:my-8 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center text-rose-600">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500 fill-amber-500" /> Hot Trade Deals
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Instant Price Drop Alert!
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subtitle */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl my-3 text-xs text-amber-900">
            ⚡ Discounted wholesale prices updated by Depot Admin today. Save up to 25% on essential
            plumbing & electrical materials!
          </div>

          {/* Discounted Product Grid (3 items in a row) */}
          <div className="overflow-y-auto py-2 flex-1 pr-1">
            {discountedGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No active price drops currently. Check back soon for flash trade discounts!
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                {discountedGroups.map((group) => {
                  const hasMultipleSizes = group.variants.length > 1;
                  const sortedByPrice = [...group.variants].sort((a, b) => a.price - b.price);
                  const product = sortedByPrice[0];
                  const maxPrice = sortedByPrice[sortedByPrice.length - 1].price;
                  const orig = product.originalPrice || product.price;
                  const maxDiscountPercent = Math.max(
                    ...group.variants.map((v) => {
                      const o = v.originalPrice || v.price;
                      return o > v.price ? Math.round(((o - v.price) / o) * 100) : 0;
                    })
                  );

                  const singleQtyInCart = getCartQuantity(product.id);
                  const totalGroupCartQty = hasMultipleSizes
                    ? group.variants.reduce((sum, v) => sum + getCartQuantity(v.id), 0)
                    : singleQtyInCart;

                  return (
                    <div
                      key={group.key}
                      className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-2 sm:p-3 flex flex-col justify-between transition shadow-sm h-full group"
                    >
                      <div>
                        {/* Image & Discount Badge */}
                        <div className="relative mb-2 bg-slate-50 rounded-lg overflow-hidden aspect-square flex items-center justify-center border border-slate-100">
                          {product.image && product.image.trim() !== '' ? (
                            <img
                              src={product.image}
                              alt={hasMultipleSizes ? group.baseName : product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-1 text-amber-600 shadow-sm">
                                {product.category === 'plumbing' ? (
                                  <Droplets className="w-4 h-4" />
                                ) : product.category === 'electrical' ? (
                                  <Zap className="w-4 h-4" />
                                ) : product.category === 'fans' ? (
                                  <Fan className="w-4 h-4" />
                                ) : product.category === 'lights' ? (
                                  <Lightbulb className="w-4 h-4" />
                                ) : product.category === 'tools' ? (
                                  <Wrench className="w-4 h-4" />
                                ) : (
                                  <Package className="w-4 h-4" />
                                )}
                              </div>
                            </div>
                          )}
                          <span className="absolute top-1 left-1 bg-rose-600 text-white font-extrabold text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 shadow">
                            <Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> SAVE {maxDiscountPercent}%
                          </span>
                          {hasMultipleSizes && (
                            <span className="absolute bottom-1 left-1 bg-slate-800/80 text-white text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded">
                              {group.variants.length} Sizes
                            </span>
                          )}
                        </div>

                        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold text-amber-600 block truncate mb-0.5">
                          {getCategoryDisplayName(product.category, categories)}
                          {hasMultipleSizes ? ` · ${group.variants.length} sizes` : ''}
                        </span>
                        <h4 className="font-bold text-slate-900 text-[11px] sm:text-sm leading-tight line-clamp-2 mb-1">
                          {hasMultipleSizes ? group.baseName : product.name}
                        </h4>

                        {product.description && (
                          <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2 mb-2 hidden sm:block">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* Price & Add Button */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-auto">
                        <div>
                          {hasMultipleSizes && maxPrice > product.price ? (
                            <div className="text-[8px] sm:text-[10px] text-slate-500 font-semibold">
                              From
                            </div>
                          ) : (
                            <div className="text-[9px] sm:text-xs text-slate-400 line-through font-mono tabular-nums">
                              ₹{orig.toFixed(2)}
                            </div>
                          )}
                          <div className="text-xs sm:text-sm md:text-base font-black text-amber-700 font-mono tabular-nums">
                            ₹{product.price.toFixed(2)}{' '}
                            <span className="text-[8px] sm:text-[10px] text-slate-500 font-normal">
                              /{product.unit}
                            </span>
                          </div>
                        </div>

                        {hasMultipleSizes ? (
                          <button
                            type="button"
                            onClick={() => setActiveSizeGroupKey(group.key)}
                            className={`font-bold px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs transition flex items-center justify-center gap-1 shadow-xs shrink-0 ${
                              totalGroupCartQty > 0
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            }`}
                          >
                            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>
                              {totalGroupCartQty > 0 ? `${totalGroupCartQty} · Sizes` : '+ Add'}
                            </span>
                          </button>
                        ) : singleQtyInCart > 0 ? (
                          <div className="flex items-center justify-between bg-amber-50 text-slate-900 rounded-lg p-0.5 border border-amber-300 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity
                                  ? onUpdateQuantity(product.id, -1)
                                  : onAddToCart(product, -1)
                              }
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center transition"
                            >
                              <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                            </button>
                            <span className="px-1.5 font-black font-mono tabular-nums text-[10px] sm:text-xs">
                              {singleQtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => onAddToCart(product, 1)}
                              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition"
                            >
                              <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAddToCart(product, 1)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs transition flex items-center justify-center gap-1 shadow-xs shrink-0"
                          >
                            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> + Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
            >
              Return to Store Catalog
            </button>
          </div>
        </div>
      </div>

      <SizeSelectorModal
        group={activeModalGroup}
        onClose={() => setActiveSizeGroupKey(null)}
        cartItems={cartItems}
        onAddToCart={(prod, qty) => onAddToCart(prod, qty)}
        onUpdateQuantity={onUpdateQuantity}
        onOpenWhatsAppForProduct={onOpenWhatsAppForProduct}
      />
    </>
  );
};

