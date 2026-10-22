import React from 'react';
import { X, TrendingDown, Tag, ShoppingCart, Percent, Flame } from 'lucide-react';
import { Product } from '../types';

interface PriceDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export const PriceDropModal: React.FC<PriceDropModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddToCart
}) => {
  if (!isOpen) return null;

  // Filter products that have originalPrice > price (Discounted / Price Drops)
  const discountedProducts = products.filter(
    p => p.originalPrice && p.originalPrice > p.price
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl lg:max-w-5xl w-full p-4 sm:p-6 text-slate-900 shadow-2xl relative my-auto sm:my-8 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 border border-rose-200 rounded-xl flex items-center justify-center text-rose-600">
              <TrendingDown className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest block flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" /> Hot Trade Deals
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">Instant Price Drop Alert!</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle */}
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl my-3 text-xs text-amber-900">
          ⚡ Discounted wholesale prices updated by Depot Admin today. Save up to 25% on essential plumbing & electrical materials!
        </div>

        {/* Discounted Product Grid (3 items in a row) */}
        <div className="overflow-y-auto py-2 flex-1 pr-1">
          {discountedProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No active price drops currently. Check back soon for flash trade discounts!
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
              {discountedProducts.map((product) => {
                const orig = product.originalPrice || product.price;
                const discountPercent = Math.round(((orig - product.price) / orig) * 100);

                return (
                  <div
                    key={product.id}
                    className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between transition shadow-sm h-full group"
                  >
                    <div>
                      {/* Image & Discount Badge */}
                      <div className="relative mb-2 bg-slate-50 rounded-lg overflow-hidden aspect-square flex items-center justify-center border border-slate-100">
                        <img
                          src={product.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-1 left-1 bg-rose-600 text-white font-extrabold text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                          <Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> SAVE {discountPercent}%
                        </span>
                      </div>

                      <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold text-amber-600 block truncate mb-0.5">
                        {product.category}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight line-clamp-2 mb-1">
                        {product.name}
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
                        <div className="text-[9px] sm:text-xs text-slate-400 line-through font-mono">
                          ₹{orig.toFixed(2)}
                        </div>
                        <div className="text-xs sm:text-sm md:text-base font-black text-amber-700 font-mono">
                          ₹{product.price.toFixed(2)} <span className="text-[8px] sm:text-[10px] text-slate-500 font-normal">/{product.unit}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onAddToCart(product)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs transition flex items-center justify-center gap-1 shadow shrink-0"
                      >
                        <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Add
                      </button>
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
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
          >
            Return to Store Catalog
          </button>
        </div>

      </div>
    </div>
  );
};
