import React, { useState } from 'react';
import { Phone, PhoneCall, X, Clock, CheckCircle2, ShieldCheck, AlertCircle, Navigation, Wrench, User } from 'lucide-react';
import { StoreSettings, UserRole } from '../types';
import { fetchCurrentLocationAddress } from '../utils/distance';

interface PhoneBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings: StoreSettings;
  onBookingCreated: () => void;
}

export const PhoneBookingModal: React.FC<PhoneBookingModalProps> = ({
  isOpen,
  onClose,
  storeSettings,
  onBookingCreated
}) => {
  const [userRole, setUserRole] = useState<UserRole>('plumber_electrician');
  const [customerName, setCustomerName] = useState('');
  const [plumberPhone, setPlumberPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [urgency, setUrgency] = useState<'1-3_mins' | '15_mins' | 'scheduled'>('1-3_mins');
  const [isLocating, setIsLocating] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMessage('');
    try {
      const loc = await fetchCurrentLocationAddress();
      setNotes((prev) => `${prev ? prev + ' | ' : ''}Location: ${loc.address}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to fetch location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmitCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plumberPhone.trim()) {
      setErrorMessage('Phone number is mandatory.');
      return;
    }

    const digits = plumberPhone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingType: 'phone_callback',
          customerName: customerName || 'Phone Customer',
          userRole,
          plumberPhone: plumberPhone.trim(),
          notes: `[Role: ${userRole === 'plumber_electrician' ? 'Plumber/Electrician' : 'Customer'}] [Callback Urgency: ${urgency}] ${notes}`,
          totalPrice: 0,
          status: 'new'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request callback.');
      }

      setSubmitSuccess(true);
      onBookingCreated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-4 sm:p-6 text-slate-900 shadow-2xl relative my-auto sm:my-8 max-h-[92vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Callback Request Dispatched!</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Our trade dispatch manager will call <strong className="text-emerald-700">{plumberPhone}</strong> within <strong className="text-amber-600">3 minutes</strong> to confirm your material list and send express delivery.
            </p>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600">
              Emergency Trade Dispatch Hotline: <a href={`tel:${storeSettings.helplineNumber}`} className="text-amber-600 font-bold underline">{storeSettings.helplineNumber}</a>
            </div>
            <button
              onClick={() => {
                setSubmitSuccess(false);
                onClose();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition shadow"
            >
              Close & Return to Store
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-200">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">Booking Mode 2</span>
                <h2 className="text-xl font-black text-slate-900">Phone Order & Instant Callback</h2>
              </div>
            </div>

            {/* Instant Phone Call Banner */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-emerald-800 font-semibold uppercase">Direct Order Hotline</p>
                  <p className="text-lg font-black text-slate-900">{storeSettings.helplineNumber}</p>
                  <p className="text-[11px] text-slate-600">Speak directly with trade materials dispatcher</p>
                </div>
                <a
                  href={`tel:${storeSettings.helplineNumber}`}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition shrink-0"
                >
                  <Phone className="w-4 h-4 fill-white" /> Call Now
                </a>
              </div>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-500 font-bold">OR Request 3-Min Express Callback</span></div>
            </div>

            <form onSubmit={handleSubmitCallback} className="space-y-4">
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  User Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
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
                <div className="text-[11px] text-cyan-800 bg-cyan-50 border border-cyan-200 p-2.5 rounded-lg mb-2">
                  💡 <strong>Plumber Verification Note:</strong> We require your plumber's phone number so our experts can reach out directly if there is any doubt or question about any material item on your order list.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {userRole === 'plumber_electrician' ? 'Plumber / Electrician Phone Number' : 'Customer Phone Number'} <span className="text-rose-500">* (Mandatory)</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder={userRole === 'plumber_electrician' ? 'e.g. +91 8332869926' : 'e.g. +91 9876543210'}
                  value={plumberPhone}
                  onChange={(e) => setPlumberPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vinnu Contractor"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Callback Urgency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgency('1-3_mins')}
                    className={`p-2 rounded-lg text-xs font-bold border transition ${
                      urgency === '1-3_mins'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    ⚡ Immediate (1-3 min)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgency('15_mins')}
                    className={`p-2 rounded-lg text-xs font-bold border transition ${
                      urgency === '15_mins'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    ⏱️ Within 15 Mins
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgency('scheduled')}
                    className={`p-2 rounded-lg text-xs font-bold border transition ${
                      urgency === 'scheduled'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    📅 Before 8:00 AM
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Materials Needed / Job Site Address
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
                <textarea
                  rows={2}
                  placeholder="e.g. Need 4x CPVC pipes, 2x breakers or click Use Current Location..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Requesting...</span>
                  ) : (
                    <>
                      <PhoneCall className="w-4 h-4" /> Request Callback
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
