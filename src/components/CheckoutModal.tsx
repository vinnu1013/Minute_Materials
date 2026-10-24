import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Truck, AlertCircle, MapPin, Navigation, User, Loader2, FileText, ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { CartItem, StoreSettings, UserAccount, UserRole } from '../types';
import { getEstimateForAddress, fetchCurrentLocationAddress } from '../utils/distance';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToCart?: () => void;
  cartItems: CartItem[];
  storeSettings: StoreSettings;
  deliveryAddress: string;
  setDeliveryAddress: (addr: string) => void;
  currentUser?: UserAccount | null;
  onOrderCompleted: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onBackToCart,
  cartItems,
  storeSettings,
  deliveryAddress,
  setDeliveryAddress,
  currentUser,
  onOrderCompleted
}) => {
  const [userRole, setUserRole] = useState<UserRole>(currentUser?.userRole || 'plumber_electrician');
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [plumberPhone, setPlumberPhone] = useState(currentUser?.phone || '8332869926');
  
  // Recipient Details Selection (Me vs Others)
  const [recipientType, setRecipientType] = useState<'me' | 'others'>('me');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  // Address Inputs
  const [houseBuilding, setHouseBuilding] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [cityPincode, setCityPincode] = useState('Hyderabad, Telangana - 500035');
  
  const [notes, setNotes] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState('');

  // Pricing calculations
  const validItems = (cartItems || []).filter(item => item && item.product && item.product.id);
  const subtotal = validItems.reduce((sum, item) => {
    const price = Number(item?.product?.price) || 0;
    const qty = Number(item?.quantity) || 0;
    return sum + (price * qty);
  }, 0);

  // Delivery Charges: Removed completely (₹0)
  const deliveryFee = 0;

  // Platform Fee: ₹15.00 (Flat, no discounts)
  const platformFee = 15;

  // Handling Fee: 5/-
  const handlingFee = 5;

  const gstAmount = 0;

  const totalPrice = subtotal + deliveryFee + platformFee + handlingFee;

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMessage('');
    try {
      const loc = await fetchCurrentLocationAddress();
      setDeliveryAddress(loc.address);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to fetch location. Please enter address manually.');
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      if (!customerName) setCustomerName(currentUser.name);
      if (!plumberPhone) setPlumberPhone(currentUser.phone);
      if (currentUser.address && (!deliveryAddress || deliveryAddress.includes('LB Nagar'))) {
        setDeliveryAddress(currentUser.address);
      }
    }
    // Auto-fetch current location on open if delivery address is empty or default
    if (isOpen && (!deliveryAddress || deliveryAddress.includes('LB Nagar'))) {
      setIsLocating(true);
      fetchCurrentLocationAddress()
        .then(loc => {
          if (loc && loc.address) {
            setDeliveryAddress(loc.address);
          }
        })
        .catch(err => {
          console.warn('Auto location fetch note:', err);
        })
        .finally(() => {
          setIsLocating(false);
        });
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  // Determine final recipient details to display / save
  const finalRecipientName = recipientType === 'me'
    ? (customerName.trim() || currentUser?.name || 'Registered Account Owner')
    : recipientName.trim();

  const finalRecipientPhone = recipientType === 'me'
    ? (plumberPhone.trim() || currentUser?.phone || 'Registered Account Phone')
    : recipientPhone.trim();

  // Final Order Submission via WhatsApp
  const executeOrderCreation = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let effectiveUserId = currentUser?.id;
      if (!currentUser) {
        const newAccount: UserAccount = {
          id: `usr-${Date.now()}`,
          name: customerName.trim() || 'Customer',
          email: `${plumberPhone.trim()}@minutematerials.com`,
          phone: plumberPhone.trim(),
          userRole: userRole,
          address: deliveryAddress.trim(),
          createdAt: new Date().toISOString()
        };
        effectiveUserId = newAccount.id;
        try {
          localStorage.setItem('instant_supply_user', JSON.stringify(newAccount));
          await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAccount)
          });
        } catch (e) {
          console.warn('Account registration sync note:', e);
        }
      }

      const fullAddress = [
        houseBuilding.trim(),
        streetArea.trim(),
        cityPincode.trim(),
        deliveryAddress.trim()
      ].filter(Boolean).join(', ');

      // Build formatted material list & bill for WhatsApp
      const cleanStorePhone = (storeSettings.whatsappNumber || storeSettings.helplineNumber || '8332869926').replace(/\D/g, '');
      const whatsappTarget = cleanStorePhone.length === 10 ? `91${cleanStorePhone}` : cleanStorePhone;

      const itemsListFormatted = validItems
        .map((i, index) => `${index + 1}. *${i.product.name}*\n   Qty: ${i.quantity} ${i.product.unit || 'unit'} | ₹${i.product.price}/unit | Line Total: ₹${(i.product.price * i.quantity).toFixed(2)}`)
        .join('\n\n');

      const whatsappMsgText = 
`*MINUTE MATERIALS - EXPRESS ORDER*
----------------------------------------
*Status:* Express Order Dispatch

 *Recipient:* ${finalRecipientName} (${finalRecipientPhone})
 *Ordered By:* ${customerName.trim() || finalRecipientName} (${plumberPhone.trim() || finalRecipientPhone})

📍 *Delivery Address:*
${fullAddress || deliveryAddress.trim()}

----------------------------------------
*MATERIALS ORDERED (${validItems.length} items):*
${itemsListFormatted}

----------------------------------------
 *BILL BREAKDOWN:*
• Subtotal: ₹${subtotal.toFixed(2)}
• Platform Fee: ₹${platformFee.toFixed(2)}
• Handling Fee: ₹${handlingFee.toFixed(2)}
----------------------------------------
*TOTAL AMOUNT PAYABLE: ₹${totalPrice.toFixed(2)}*
----------------------------------------
Please confirm material availability & dispatch express courier immediately!`;

      // Redirect to WhatsApp with order & bill details
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappTarget}&text=${encodeURIComponent(whatsappMsgText)}`;
      setLastWhatsappUrl(whatsappUrl);
      window.open(whatsappUrl, '_blank');

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          bookingType: 'whatsapp_order',
          customerName: customerName.trim(),
          userRole,
          plumberPhone: plumberPhone.trim(),
          recipientType,
          recipientName: finalRecipientName,
          recipientPhone: finalRecipientPhone,
          deliveryAddress: fullAddress || deliveryAddress.trim(),
          customerLat: currentUser?.lat,
          customerLng: currentUser?.lng,
          distanceKm: 0,
          driveTimeMins: 0,
          items: cartItems.map(i => ({
            id: i?.product?.id || 'p-unknown',
            name: i?.product?.name || 'Item',
            price: i?.product?.price || 0,
            quantity: i?.quantity || 1,
            category: i?.product?.category || 'general',
            unit: i?.product?.unit || 'pc'
          })),
          subtotal,
          deliveryFee,
          platformFee,
          handlingFee,
          gstAmount,
          totalPrice,
          paymentMethod: 'whatsapp_order',
          paymentStatus: 'pending',
          whatsappMessage: whatsappMsgText,
          notes,
          status: 'new'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit order.');
      }

      setOrderSuccess(true);
      onOrderCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeCustomerName = customerName.trim() || currentUser?.name || 'Trade Account';
    const activePlumberPhone = plumberPhone.trim() || currentUser?.phone || '8332869926';
    const cleanDigits = activePlumberPhone.trim().replace(/\D/g, '');
    const digits = cleanDigits.length > 10 && cleanDigits.startsWith('91') ? cleanDigits.slice(-10) : cleanDigits;
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setErrorMessage('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    // Mandatory Recipient Details Validation for "Others"
    if (recipientType === 'others') {
      if (!recipientName.trim()) {
        setErrorMessage('Recipient Name is mandatory when ordering for someone else.');
        return;
      }
      if (!recipientPhone.trim()) {
        setErrorMessage('Recipient Contact Number is mandatory when ordering for someone else.');
        return;
      }
      const recDigits = recipientPhone.trim().replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(recDigits)) {
        setErrorMessage('Please enter a valid 10-digit mobile number for the Recipient.');
        return;
      }
    }

    const fullAddress = [
      houseBuilding.trim(),
      streetArea.trim(),
      cityPincode.trim(),
      deliveryAddress.trim()
    ].filter(Boolean).join(', ');

    if (!fullAddress.trim()) {
      setErrorMessage('Delivery address is required.');
      return;
    }

    executeOrderCreation();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-4 sm:p-6 text-slate-900 shadow-2xl relative my-auto sm:my-8 max-h-[92vh] overflow-y-auto">
        
        {/* Header Bar with Back Button */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <button
            type="button"
            onClick={onBackToCart || onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition"
          >
            <ArrowLeft className="w-4 h-4 text-amber-800" />
            <span>Back to Cart</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {orderSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Order Sent to WhatsApp!</h3>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2 text-left max-w-md mx-auto">
              <div className="flex items-center justify-between text-emerald-800 font-bold">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp Opened
                </span>
                <span>⏱️ Live Dispatching</span>
              </div>
              <p className="text-slate-700">
                Your material order &amp; detailed bill breakdown have been formatted and sent to our WhatsApp order helpline (<strong>{storeSettings.whatsappNumber || '8332869926'}</strong>). Our team will confirm material packing and dispatch express courier immediately.
              </p>
              <div className="text-slate-500 pt-2 border-t border-slate-200 space-y-1">
                <div>Recipient: <strong className="text-slate-900">{finalRecipientName}</strong></div>
                <div>Contact Mobile: <strong className="text-slate-900 font-mono">{finalRecipientPhone}</strong></div>
              </div>
            </div>

            {/* Confirmation Question Section */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center space-y-3 max-w-md mx-auto shadow-sm">
              <p className="text-sm font-black text-amber-950 uppercase tracking-wide">
                Ordered via WhatsApp?
              </p>
              <p className="text-xs text-amber-800">
                Did you complete sending your materials list &amp; bill breakdown to our WhatsApp helpline?
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onOrderCompleted();
                    setOrderSuccess(false);
                    onClose();
                  }}
                  className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Yes (Go to Home Page)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (lastWhatsappUrl) {
                      window.open(lastWhatsappUrl, '_blank');
                    }
                  }}
                  className="w-full sm:flex-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>No (Redirect to WhatsApp)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center border border-emerald-200">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">WhatsApp Instant Delivery Order</span>
                <h2 className="text-xl font-black text-slate-900">Delivery &amp; Receipt Details</h2>
              </div>
            </div>

            {/* Notice regarding Order Dispatch */}
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Express WhatsApp Order Dispatch</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Clicking <strong>Confirm &amp; Place Order</strong> will automatically send your materials list and bill breakdown to WhatsApp (<strong>{storeSettings.whatsappNumber || '8332869926'}</strong>) for instant delivery confirmation.
              </p>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Recipient Details & Delivery Address Combined Section */}
            <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl space-y-3">
              <label className="text-xs font-extrabold text-amber-900 block">
                Who is receiving this order? <span className="text-rose-600">*</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientType('me')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    recipientType === 'me'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Me
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientType('others')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    recipientType === 'others'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Other
                </button>
              </div>

              {recipientType === 'others' && (
                <div className="space-y-2 bg-white p-3 rounded-lg border border-amber-200">
                  <div className="text-xs font-bold text-amber-900 mb-1">
                    Enter Other Recipient Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Recipient Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Site Supervisor / Friend Name"
                        value={recipientName}
                        onChange={(e) => {
                          setRecipientName(e.target.value);
                          if (errorMessage.includes('Recipient')) setErrorMessage('');
                        }}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        Recipient Contact Mobile <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={recipientPhone}
                        onChange={(e) => {
                          setRecipientPhone(e.target.value);
                          if (errorMessage.includes('Recipient')) setErrorMessage('');
                        }}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Special Instructions for Delivery Driver */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-700" /> Special Instructions for Delivery Driver
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Leave at gate, call upon arrival, landmark notes, gate access code..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>

            {/* Detailed Billing Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 text-xs border border-slate-200">
              <h4 className="font-extrabold text-amber-800 text-xs border-b border-slate-200 pb-1 mb-2">
                Order Billing Breakdown
              </h4>
              
              <div className="flex justify-between text-slate-700">
                <span>Materials Subtotal ({validItems.length} items):</span>
                <span className="font-mono font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-700 items-center">
                <span>Platform Fee:</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{platformFee.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-slate-700">
                <span>Handling Charges:</span>
                <span className="font-mono font-bold text-slate-900">₹{handlingFee.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount Payable:</span>
                <span className="font-mono text-amber-700 text-base">₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to WhatsApp...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm &amp; Place Order (₹{totalPrice.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

