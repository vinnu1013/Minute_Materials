import React from 'react';
import { X, MapPin, Clock, ShieldCheck, Navigation, Phone, CheckCircle2 } from 'lucide-react';
import { DELIVERY_AREAS } from '../data/areas';
import { StoreSettings } from '../types';

interface DeliveryAreasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSelectAddress: (address: string) => void;
  storeSettings: StoreSettings;
}

export const DeliveryAreasModal: React.FC<DeliveryAreasModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onSelectAddress,
  storeSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-4 sm:p-6 text-slate-900 shadow-2xl relative my-auto sm:my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center text-orange-600">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-widest block">
                Express Supply Network
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Delivery Areas &amp; Live ETA Timings
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Location Bar */}
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-slate-500">Your Jobsite:</span>
            <span className="font-bold text-slate-900 truncate">{currentAddress || 'Hyderabad Metro Region'}</span>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border border-emerald-200">
            Active Hub Online
          </span>
        </div>

        {/* Hub Info */}
        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
          Our main central dispatch hub is situated at <strong className="text-amber-700">{storeSettings.depotAddress || 'Chinthalkunta / LB Nagar Ring Road, Hyderabad'}</strong>. Our fleet of 15+ rapid delivery two-wheelers and mini-trucks reach these jobsite zones in 15–30 minutes:
        </p>

        {/* Areas Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4 max-h-[50vh] overflow-y-auto pr-1">
          {DELIVERY_AREAS.map((area) => {
            const isCurrent = currentAddress.toLowerCase().includes(area.name.toLowerCase());
            return (
              <div
                key={area.name}
                onClick={() => {
                  onSelectAddress(`${area.name}, Hyderabad`);
                  onClose();
                }}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? 'bg-orange-50 border-orange-400 text-slate-900 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    {area.name}
                    {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Est. Road Distance: ~{area.distanceKm} km
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {area.timeMins} min
                  </span>
                  <span className="text-[9px] text-orange-600 block mt-0.5 hover:underline font-bold">
                    Select Area ›
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dispatch Hotline Help */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-amber-600" />
            <span className="text-slate-700">Outside coverage? Call Jobsite Dispatch Supervisor:</span>
          </div>
          <a
            href={`tel:${storeSettings.helplineNumber}`}
            className="font-bold text-amber-700 hover:text-amber-800 underline"
          >
            {storeSettings.helplineNumber}
          </a>
        </div>
      </div>
    </div>
  );
};
