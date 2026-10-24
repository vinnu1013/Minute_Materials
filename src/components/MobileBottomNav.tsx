import React, { useState } from 'react';
import { Store, ShoppingCart } from 'lucide-react';

interface MobileBottomNavProps {
  cartCount: number;
  onOpenCart: () => void;
  onNavigateHome?: () => void;
  onOpenBookingMode?: (mode: 'cart_delivery' | 'phone_callback' | 'image_upload' | 'whatsapp_order') => void;
  onOpenPriceDrops?: () => void;
  priceDropCount?: number;
  isAdmin?: boolean;
  onToggleAdmin?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  cartCount,
  onOpenCart,
  onNavigateHome,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog');

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/60 px-4 py-2 flex justify-around items-center text-xs text-slate-500 select-none shadow-lg">
      {/* 1. Catalog */}
      <button
        onClick={() => {
          setActiveTab('catalog');
          if (onNavigateHome) {
            onNavigateHome();
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition ${
          activeTab === 'catalog' ? 'text-amber-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Store className="w-5 h-5" />
        <span className="text-[11px] font-bold">Materials</span>
      </button>

      {/* 2. Cart */}
      <button
        onClick={() => {
          setActiveTab('cart');
          onOpenCart();
        }}
        className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition relative ${
          activeTab === 'cart' ? 'text-amber-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5 text-amber-600" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-slate-950 font-black text-[10px] min-w-[18px] h-4.5 px-1 rounded-full flex items-center justify-center shadow">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[11px] font-bold">View Cart</span>
      </button>
    </nav>
  );
};


