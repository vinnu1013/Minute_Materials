import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, ArrowRight, MapPin, Navigation, AlertCircle, Check, Loader2 } from 'lucide-react';
import { CartItem, StoreSettings } from '../types';
import { fetchCurrentLocationAddress } from '../utils/distance';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: (address?: string) => void;
  storeSettings: StoreSettings;
  deliveryAddress: string;
  setDeliveryAddress: (addr: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  storeSettings,
  deliveryAddress,
  setDeliveryAddress
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [gpsAutoFilled, setGpsAutoFilled] = useState(false);

  // Auto-fetch current location on drawer open if delivery address is empty or default
  useEffect(() => {
    if (isOpen) {
      setAddressError('');
      if (!deliveryAddress || deliveryAddress.includes('LB Nagar')) {
        setIsLocating(true);
        fetchCurrentLocationAddress()
          .then(loc => {
            if (loc && loc.address) {
              setDeliveryAddress(loc.address);
              setGpsAutoFilled(true);
              setAddressError('');
            }
          })
          .catch(err => {
            console.warn('Auto location fetch note:', err);
          })
          .finally(() => {
            setIsLocating(false);
          });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validCartItems = (cartItems || []).filter(item => item && item.product && item.product.id);

  const subtotal = validCartItems.reduce((sum, item) => {
    const price = Number(item?.product?.price) || 0;
    const qty = Number(item?.quantity) || 0;
    return sum + (price * qty);
  }, 0);

  const handleFetchGPS = async () => {
    setIsLocating(true);
    setAddressError('');
    try {
      const loc = await fetchCurrentLocationAddress();
      if (loc && loc.address) {
        setDeliveryAddress(loc.address);
        setGpsAutoFilled(true);
        setAddressError('');
      }
    } catch (err: any) {
      setAddressError(err.message || 'Unable to fetch location. Please enter manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleProceedClick = async () => {
    // If currently locating, wait briefly for GPS to finish and proceed
    if (isLocating) {
      try {
        const loc = await fetchCurrentLocationAddress();
        if (loc && loc.address) {
          setDeliveryAddress(loc.address);
          setGpsAutoFilled(true);
          setAddressError('');
          onProceedToCheckout(loc.address);
          return;
        }
      } catch (e) {
        // Continue to check if any address was already set
      }
    }

    const targetAddress = (deliveryAddress || '').trim();
    if (!targetAddress) {
      setAddressError('Please enter delivery address or click GPS Auto-Fill to proceed.');
      return;
    }
    setAddressError('');
    onProceedToCheckout(targetAddress);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white border-l border-slate-200 text-slate-900 w-full max-w-md h-full flex flex-col justify-between shadow-2xl">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <h2 className="font-extrabold text-lg text-slate-900">Delivery Cart</h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
              {validCartItems.length} items
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">

          {/* Items List */}
          {validCartItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <ShoppingCart className="w-12 h-12 mx-auto stroke-1 opacity-40 text-amber-600" />
              <p className="text-sm font-semibold text-slate-700">Your delivery cart is empty.</p>
              <p className="text-xs text-slate-500">Browse plumbing & electrical materials from the catalog to build your order.</p>
            </div>
          ) : (
            validCartItems.map((item) => {
              const price = Number(item.product.price) || 0;
              return (
                <div
                  key={item.product.id}
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3 shadow-sm"
                >
                  <img
                    src={item.product.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 bg-white shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">
                      {item.product.category || 'General'} • SKU: {item.product.sku || 'N/A'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h4>
                    <div className="text-xs font-mono font-bold text-amber-700 mt-0.5">
                      ₹{price.toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">/ {item.product.unit || 'ea'}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-0.5">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold px-1 min-w-[20px] text-center text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {validCartItems.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            
            {/* Delivery Address Input Section */}
            <div className={`bg-white p-3 rounded-xl border ${addressError ? 'border-rose-400 bg-rose-50/20' : gpsAutoFilled ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200'} space-y-2 shadow-sm transition`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Delivery Address</span>
                  <span className="text-rose-600 font-extrabold">* (Required)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {gpsAutoFilled && !isLocating && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5 bg-emerald-100 px-1.5 py-0.5 rounded">
                      <Check className="w-3 h-3 text-emerald-600" /> GPS Set
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleFetchGPS}
                    disabled={isLocating}
                    className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 rounded-lg border border-amber-300 font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin text-amber-700' : 'text-amber-700'}`} />
                    {isLocating ? 'Locating...' : '📍 GPS Auto-Fill'}
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={deliveryAddress}
                onChange={(e) => {
                  setDeliveryAddress(e.target.value);
                  setGpsAutoFilled(false);
                  if (addressError) setAddressError('');
                }}
                placeholder="Enter complete delivery location, site / landmark (Mandatory)..."
                className={`w-full bg-slate-50 border ${addressError ? 'border-rose-400 focus:border-rose-500' : gpsAutoFilled ? 'border-emerald-300 focus:border-emerald-500' : 'border-slate-300 focus:border-amber-500'} rounded-lg p-2 text-xs text-slate-900 focus:outline-none placeholder:text-slate-400`}
              />

              {addressError && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{addressError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs px-1">
              <span className="text-slate-500 font-semibold">Items Subtotal:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">₹{subtotal.toFixed(2)}</span>
            </div>

            <button
              type="button"
              id="cart-proceed-to-checkout-btn"
              onClick={handleProceedClick}
              disabled={isLocating}
              className={`w-full font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] cursor-pointer ${
                isLocating 
                  ? 'bg-amber-400 text-slate-900 opacity-90 cursor-wait' 
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-lg'
              }`}
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Detecting GPS Location...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
