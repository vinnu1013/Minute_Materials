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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 text-white shadow-2xl relative my-auto sm:my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center text-orange-400">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-widest block">
                Express Supply Network
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Delivery Areas & Live ETA Timings
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Location Bar */}
        <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-slate-400">Your Jobsite:</span>
            <span className="font-bold text-white truncate">{currentAddress || 'Hyderabad Metro Region'}</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border border-emerald-500/30">
            Active Hub Online
          </span>
        </div>

        {/* Hub Info */}
        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          Our main central dispatch hub is situated at <strong className="text-amber-400">{storeSettings.depotAddress || 'Chinthalkunta / LB Nagar Ring Road, Hyderabad'}</strong>. Our fleet of 15+ rapid delivery two-wheelers and mini-trucks reach these jobsite zones in 15–30 minutes:
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
                    ? 'bg-orange-500/20 border-orange-500 text-white shadow-md'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                    {area.name}
                    {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Est. Road Distance: ~{area.distanceKm} km
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {area.timeMins} min
                  </span>
                  <span className="text-[9px] text-orange-400 block mt-0.5 hover:underline font-bold">
                    Select Area ›
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dispatch Hotline Help */}
        <div className="p-3 bg-gradient-to-r from-amber-950/50 to-orange-950/50 rounded-xl border border-amber-800/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">Outside coverage? Call Jobsite Dispatch Supervisor:</span>
          </div>
          <a
            href={`tel:${storeSettings.helplineNumber}`}
            className="font-bold text-amber-400 hover:text-amber-300 underline"
          >
            {storeSettings.helplineNumber}
          </a>
        </div>
      </div>
    </div>
  );
};
