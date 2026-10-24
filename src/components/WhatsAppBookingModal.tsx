import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send, Navigation, Wrench, User } from 'lucide-react';
import { CartItem, StoreSettings, UserRole } from '../types';
import { getEstimateForAddress, fetchCurrentLocationAddress } from '../utils/distance';

interface WhatsAppBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  storeSettings: StoreSettings;
  onBookingCreated: () => void;
}

export const WhatsAppBookingModal: React.FC<WhatsAppBookingModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  storeSettings,
  onBookingCreated
}) => {
  const [userRole, setUserRole] = useState<UserRole>('plumber_electrician');
  const [customerName, setCustomerName] = useState('');
  const [plumberPhone, setPlumberPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('LB Nagar Junction, Hyderabad');
  const [deliveryUrgency, setDeliveryUrgency] = useState('Express Jobsite Dispatch');
  const [customItemList, setCustomItemList] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [materialsError, setMaterialsError] = useState('');
  const [generalError, setGeneralError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimate = getEstimateForAddress(deliveryAddress || 'Hyderabad Central');

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setGeneralError('');
    setAddressError('');
    try {
      const loc = await fetchCurrentLocationAddress();
      if (loc && loc.address) {
        setDeliveryAddress(loc.address);
        setAddressError('');
        setGeneralError('');
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Unable to fetch location. Please enter address manually.');
    } finally {
      setIsLocating(false);
    }
  };

  // Auto populate custom item list from cart if present
  useEffect(() => {
    if (cartItems.length > 0 && !customItemList) {
      const formatted = cartItems.map(item => `• ${item.quantity}x ${item.product.name} (₹${item.product.price.toFixed(2)}/unit)`).join('\n');
      setCustomItemList(formatted);
    }
  }, [cartItems]);

  // Auto fetch current location on modal open
  useEffect(() => {
    if (isOpen) {
      setIsLocating(true);
      fetchCurrentLocationAddress()
        .then(loc => {
          if (loc && loc.address) {
            setDeliveryAddress(loc.address);
          }
        })
        .catch(err => {
          console.warn('Auto location fetch failed:', err);
        })
        .finally(() => {
          setIsLocating(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Construct Formatted WhatsApp Message
  const constructWhatsAppMessage = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const minFree = storeSettings.minOrderFreeDelivery ?? 199;
    const isFree = subtotal >= minFree;
    const deliveryFee = subtotal > 0 ? (isFree ? 0 : (storeSettings.deliveryFeeExpress ?? 15)) : 0;
    const platformFee = subtotal > 0 ? (storeSettings.platformFee ?? 5) : 0;
    const handlingFee = subtotal > 0 ? (storeSettings.handlingFee ?? 10) : 0;
    const total = subtotal + deliveryFee + platformFee + handlingFee;

    const itemsText = customItemList || (cartItems.length > 0
      ? cartItems.map(item => `• ${item.quantity}x ${item.product.name} (₹${item.product.price.toFixed(2)})`).join('\n')
      : '• Custom material request');

    return `⚡ *MINUTE MATERIALS - EXPRESS ORDER*
----------------------------------------
👤 *Customer Name:* ${customerName || 'Customer'}
🏷️ *Role:* ${userRole === 'plumber_electrician' ? 'Plumber / Electrician' : 'Customer'}
📞 *Phone Number:* ${plumberPhone || 'Not specified'}
📍 *Job Site Address:* ${deliveryAddress || 'Pick-up / Call for location'}
⚡ *Speed:* Express Jobsite Dispatch

📋 *MATERIALS LIST:*
${itemsText}

💰 *BILLING BREAKDOWN:*
• Subtotal: ₹${subtotal.toFixed(2)}
• Delivery Fee: ${isFree ? 'FREE (Orders ₹199+)' : `₹${deliveryFee.toFixed(2)}`}
• Platform Fee: ₹${platformFee.toFixed(2)}
• Handling Charges: ₹${handlingFee.toFixed(2)}
*TOTAL DUE: ₹${total.toFixed(2)}*

💳 *PAYMENT DETAILS:*
• UPI ID: ${storeSettings.upiId || 'mr.vinnu10@okicici'}
• Account Name: ${storeSettings.accountHolderName || 'THappetla Vinay Kumar'}
• Payment Mode: Cash on Delivery / Scan & Pay via UPI

🚚 *Delivery Mode:* ${deliveryUrgency}
----------------------------------------
Sent via Minute Materials Dispatcher (${storeSettings.whatsappNumber || '8332869926'})`;
  };

  const whatsappMessageText = constructWhatsAppMessage();

  // Clean WhatsApp phone number (remove +, spaces, dashes)
  const cleanPhone = (storeSettings.whatsappNumber || '8332869926').replace(/[^0-9]/g, '');
  const targetNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(whatsappMessageText)}`;

  const handleSendWhatsApp = async () => {
    let hasError = false;
    setNameError('');
    setPhoneError('');
    setAddressError('');
    setMaterialsError('');
    setGeneralError('');

    if (!customerName.trim()) {
      setNameError('Name is required.');
      hasError = true;
    }

    const digits = plumberPhone.replace(/\D/g, '');
    if (!plumberPhone.trim() || digits.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      hasError = true;
    }

    if (!deliveryAddress.trim()) {
      setAddressError('Jobsite address is required.');
      hasError = true;
    }

    if (!customItemList.trim()) {
      setMaterialsError('Materials list is required.');
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      // Save order log in backend database
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingType: 'whatsapp_order',
          customerName: customerName.trim(),
          userRole,
          plumberPhone: plumberPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          whatsappMessage: whatsappMessageText,
          notes: customItemList.trim(),
          totalPrice: cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
          status: 'new'
        })
      });
      onBookingCreated();
    } catch (e) {
      console.error('Failed to log whatsapp booking:', e);
    } finally {
      setIsSubmitting(false);
      window.open(whatsappUrl, '_blank');
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-4 sm:p-6 text-slate-900 shadow-2xl relative my-auto sm:my-8 max-h-[92vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-200">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">Order Via WhatsApp</span>
            <h2 className="text-xl font-black text-slate-900">Order Via WhatsApp</h2>
          </div>
        </div>

        {generalError && (
          <p className="text-xs text-rose-600 mb-3 font-medium">{generalError}</p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              User Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUserRole('plumber_electrician')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  userRole === 'plumber_electrician'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" /> Plumber / Electrician
              </button>
              <button
                type="button"
                onClick={() => setUserRole('customer')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  userRole === 'customer'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Customer
              </button>
            </div>
          </div>

          {userRole === 'customer' && (
            <div className="text-[11px] text-cyan-800 bg-cyan-50 border border-cyan-200 p-2.5 rounded-lg">
              💡 <strong>Plumber Verification Note:</strong> Provide plumber's phone number so our experts can reach out directly if there is any doubt or question about any material item on your order list.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {userRole === 'plumber_electrician' ? 'Plumber / Contractor Name' : 'Customer Name'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder={userRole === 'plumber_electrician' ? 'e.g. Vinnu Contractor' : 'e.g. Rahul Sharma'}
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (nameError) setNameError('');
                }}
                className={`w-full bg-white border text-slate-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 ${
                  nameError ? 'border-rose-500' : 'border-slate-300'
                }`}
              />
              {nameError && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{nameError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {userRole === 'plumber_electrician' ? 'Plumber Phone Number' : 'Customer Phone Number'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder={userRole === 'plumber_electrician' ? 'e.g. 8332869926' : 'e.g. 9876543210'}
                value={plumberPhone}
                onChange={(e) => {
                  setPlumberPhone(e.target.value);
                  if (phoneError) setPhoneError('');
                }}
                className={`w-full bg-white border text-slate-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-mono font-semibold placeholder:text-slate-400 ${
                  phoneError ? 'border-rose-500' : 'border-slate-300'
                }`}
              />
              {phoneError && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{phoneError}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Jobsite Address / Drop-off <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 font-bold transition"
              >
                <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'Locating...' : '📍 Use Current Location'}
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. LB Nagar Junction, Hyderabad or click Use Current Location"
              value={deliveryAddress}
              onChange={(e) => {
                setDeliveryAddress(e.target.value);
                if (addressError) setAddressError('');
              }}
              className={`w-full bg-white border text-slate-900 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 ${
                addressError ? 'border-rose-500' : 'border-slate-300'
              }`}
            />
            {addressError && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">{addressError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Materials List <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={customItemList}
              onChange={(e) => {
                setCustomItemList(e.target.value);
                if (materialsError) setMaterialsError('');
              }}
              placeholder="• 5x 1/2 inch CPVC pipe&#10;• 2x 20A single pole breaker&#10;• 1x PVC cement kit"
              className={`w-full bg-white border text-slate-900 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 ${
                materialsError ? 'border-rose-500' : 'border-slate-300'
              }`}
            />
            {materialsError && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">{materialsError}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs transition shadow flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 fill-white" /> Send via WhatsApp
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
