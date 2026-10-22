import React from 'react';
import { Sparkles } from 'lucide-react';
import heroBgImage from '../assets/images/plumbing_electrical_hero_bg_1785771623957.jpg';

export const HeroBanner: React.FC = () => {
  return (
    <div className="relative bg-slate-50 text-slate-900 py-3 sm:py-5 px-2 sm:px-4 lg:px-6 border-b border-slate-200/60 overflow-hidden">
      
      {/* 1. Primary Express Supplies Hero Card */}
      <div className="w-full relative rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-8 md:p-10 shadow-sm overflow-hidden bg-white">
        
        {/* Full Image Background */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <img
            src={heroBgImage}
            alt="Plumbing and electrical supplies background"
            className="w-full h-full object-cover object-right opacity-100 transition-opacity duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/30 md:to-transparent" />
        </div>
        
        {/* SVG Blueprint Overlay */}
        <div className="absolute inset-0 pointer-events-none select-none opacity-10 overflow-hidden">
          <svg className="w-full h-full text-amber-600" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="none">
            <pattern id="plumbing-electrical-grid" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 0 30 Q 30 30 30 0 M 30 120 V 60 H 120 M 60 0 V 120" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
              <circle cx="30" cy="30" r="4" fill="currentColor" />
              <circle cx="60" cy="60" r="4" fill="currentColor" />
              <rect x="85" y="20" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 95 15 V 20 M 95 30 V 35" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 20 90 L 40 90 M 30 80 L 30 100" stroke="currentColor" strokeWidth="1.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#plumbing-electrical-grid)" />
          </svg>
        </div>

        {/* Ambient Gradient Glows */}
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Content Box */}
        <div className="relative z-10 max-w-2xl lg:max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-black uppercase tracking-wider mb-2 sm:mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Express 15-Min Delivery Hub
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Plumbing &amp; Electrical <br className="hidden sm:inline" />
            <span className="text-amber-600">
              Supplies Express Delivery
            </span>
          </h1>
          <p className="mt-2 text-xs sm:text-base text-slate-600 font-medium max-w-xl">
            Order CPVC/PVC pipes, MCBs, wires, taps, valves, and trade tools. Delivered in 10-15 minutes across Hyderabad.
          </p>
        </div>

      </div>

    </div>
  );
};



