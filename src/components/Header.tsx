import React, { useState } from 'react';
import { Logo } from './Logo';
import { 
  Phone, 
  MessageSquare, 
  ShoppingCart, 
  Camera, 
  Search, 
  Lock, 
  Truck, 
  PhoneCall,
  X,
  Mic,
  Clock,
  Trash2
} from 'lucide-react';
import { StoreSettings } from '../types';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

interface HeaderProps {
  storeSettings: StoreSettings;
  cartCount: number;
  onOpenCart: () => void;
  onOpenBookingMode: (mode: 'cart_delivery' | 'phone_callback' | 'image_upload' | 'whatsapp_order') => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  showPinModal?: boolean;
  setShowPinModal?: (show: boolean) => void;
  onNavigateHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  storeSettings,
  cartCount,
  onOpenCart,
  onOpenBookingMode,
  isAdmin,
  onToggleAdmin,
  searchTerm,
  setSearchTerm,
  activeCategory,
  setActiveCategory,
  showPinModal: externalShowPinModal,
  setShowPinModal: externalSetShowPinModal,
  onNavigateHome
}) => {
  const [internalShowPinModal, setInternalShowPinModal] = useState(false);
  const showPinModal = externalShowPinModal !== undefined ? externalShowPinModal : internalShowPinModal;
  const setShowPinModal = externalSetShowPinModal || setInternalShowPinModal;

  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const [isUrlAdmin, setIsUrlAdmin] = useState(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path.includes('/admin') ||
      hash.includes('admin') ||
      search.includes('admin')
    );
  });

  React.useEffect(() => {
    const checkUrl = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      setIsUrlAdmin(
        path.includes('/admin') ||
        hash.includes('admin') ||
        search.includes('admin')
      );
    };

    checkUrl();
    window.addEventListener('popstate', checkUrl);
    window.addEventListener('hashchange', checkUrl);
    return () => {
      window.removeEventListener('popstate', checkUrl);
      window.removeEventListener('hashchange', checkUrl);
    };
  }, []);

  const showAdminButton = isAdmin;

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('instant_supply_recent_searches');
      return saved ? JSON.parse(saved) : ['CPVC Pipe', 'MCB Breaker', 'Brass Valve', 'Copper Wire', 'PEX Fitting'];
    } catch {
      return ['CPVC Pipe', 'MCB Breaker', 'Brass Valve', 'Copper Wire', 'PEX Fitting'];
    }
  });

  const [showRecentDesktop, setShowRecentDesktop] = useState(false);
  const [showRecentMobile, setShowRecentMobile] = useState(false);

  const addRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const cleaned = term.trim();
    const updated = [cleaned, ...recentSearches.filter(s => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('instant_supply_recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchTerm(term);
    addRecentSearch(term);
    setShowRecentDesktop(false);
    setShowRecentMobile(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      addRecentSearch(searchTerm);
    }
    setShowRecentDesktop(false);
    setShowRecentMobile(false);
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('instant_supply_recent_searches');
    } catch {
      // ignore
    }
  };

  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported: isVoiceSupported,
    toggleListening,
    stopListening
  } = useVoiceSearch((text) => setSearchTerm(text));

  const handleClosePinModal = () => {
    setShowPinModal(false);
    setEnteredPin('');
    setPinError(false);
    if (
      typeof window !== 'undefined' &&
      (window.location.pathname.toLowerCase().includes('admin') ||
        window.location.hash.toLowerCase().includes('admin'))
    ) {
      window.history.replaceState(null, '', '/');
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEntered = enteredPin.trim();
    const configuredPin = (storeSettings?.adminPin || '9059236500').trim();
    if (cleanEntered === '9059236500' || cleanEntered === configuredPin) {
      setShowPinModal(false);
      setEnteredPin('');
      setPinError(false);
      onToggleAdmin();
    } else {
      setPinError(true);
    }
  };

  const handleAdminButtonClick = () => {
    if (isAdmin) {
      onToggleAdmin();
    } else {
      setShowPinModal(true);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const clean = value.trim().toLowerCase();
    if (clean === '/admin' || clean === 'admin' || clean.endsWith('/admin')) {
      setShowPinModal(true);
    }
  };

  return (
    <header className="relative z-40 bg-white text-slate-900 shadow-sm border-b border-slate-200/60">
      {/* Top Notice Bar */}
      <div className="bg-amber-500 text-slate-950 py-1.5 text-xs font-bold overflow-hidden relative border-b border-amber-600 shadow-inner">
        <div className="animate-marquee cursor-pointer select-none">
          {/* Content Chunk 1 */}
          <div className="flex items-center gap-6 px-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 shrink-0 text-slate-950 animate-pulse" />
              <span>{storeSettings.activeDeliveryNotice}</span>
            </div>
            <a 
              href={`tel:${storeSettings.helplineNumber}`} 
              className="flex items-center gap-1 font-extrabold bg-slate-950 text-amber-400 px-2.5 py-0.5 rounded-full hover:bg-slate-900 transition-colors"
            >
              <PhoneCall className="w-3 h-3" /> Call Dispatch: {storeSettings.helplineNumber}
            </a>
            <span className="text-slate-950 font-extrabold">• Same-Day Express Jobsite Delivery</span>
            <span className="text-slate-950/40 font-bold">|</span>
          </div>

          {/* Content Chunk 2 (Seamless Infinite Duplicate) */}
          <div className="flex items-center gap-6 px-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 shrink-0 text-slate-950 animate-pulse" />
              <span>{storeSettings.activeDeliveryNotice}</span>
            </div>
            <a 
              href={`tel:${storeSettings.helplineNumber}`} 
              className="flex items-center gap-1 font-extrabold bg-slate-950 text-amber-400 px-2.5 py-0.5 rounded-full hover:bg-slate-900 transition-colors"
            >
              <PhoneCall className="w-3 h-3" /> Call Dispatch: {storeSettings.helplineNumber}
            </a>
            <span className="text-slate-950 font-extrabold">• Same-Day Express Jobsite Delivery</span>
            <span className="text-slate-950/40 font-bold">|</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 md:gap-4">
          
          {/* 1. Logo & Brand (Top Left, Larger) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="/"
              onClick={(e) => {
                if (onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome();
                }
              }}
              className="flex items-center hover:scale-[1.02] transition-transform"
            >
              <Logo size="xl" showContainer={true} />
            </a>
          </div>

          {/* 2. Search Bar - Positioned IN BETWEEN Logo and Admin/Cart Buttons (for Mobile & Desktop) */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 mx-1 sm:mx-2 md:mx-4 relative flex flex-col">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search copper, wire, breakers, PEX..."
                value={searchTerm}
                onFocus={() => {
                  setShowRecentDesktop(true);
                  setShowRecentMobile(true);
                }}
                onBlur={() => setTimeout(() => {
                  setShowRecentDesktop(false);
                  setShowRecentMobile(false);
                }, 200)}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`w-full bg-slate-50 border text-slate-900 text-xs sm:text-sm pl-8 sm:pl-9 pr-14 sm:pr-20 py-2 sm:py-2.5 rounded-xl focus:outline-none transition ${
                  isListening
                    ? 'border-red-500 ring-2 ring-red-500/30'
                    : 'border-slate-200/80 focus:border-amber-500'
                }`}
              />
              <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-slate-400 hover:text-slate-700 transition"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-1 sm:p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/50 ring-2 ring-red-400'
                      : isVoiceSupported
                      ? 'text-slate-500 hover:text-amber-600 hover:bg-slate-100'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                  title={
                    isListening
                      ? 'Listening... Click to stop'
                      : isVoiceSupported
                      ? 'Voice Search (Click and speak)'
                      : 'Voice search not supported'
                  }
                  disabled={!isVoiceSupported}
                >
                  <Mic className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isListening ? 'animate-bounce text-white' : ''}`} />
                  {isListening && <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider">REC</span>}
                </button>
              </div>
            </div>

            {/* Recent Searches Overlay Dropdown */}
            {(showRecentDesktop || showRecentMobile) && recentSearches.length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in duration-150"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition bg-transparent"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectRecentSearch(term)}
                      className="bg-transparent text-slate-300 hover:text-amber-400 text-xs font-medium transition flex items-center gap-1 p-0 focus:outline-none"
                    >
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Listening Feedback Bar */}
            {isListening && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-red-500/80 text-white text-xs p-2.5 rounded-lg flex items-center justify-between shadow-2xl z-50">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <div className="truncate">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-red-400 block">
                      Voice Search Listening...
                    </span>
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {transcript ? `"${transcript}"` : 'Speak item name (e.g., "PVC Pipe", "Breaker")'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={stopListening}
                  className="text-[10px] font-bold bg-red-600 hover:bg-red-500 px-2.5 py-1 rounded text-white shrink-0 transition"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Voice Error Notification */}
            {voiceError && !isListening && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-amber-950/90 border border-amber-500/50 text-amber-200 text-[11px] px-3 py-1.5 rounded-lg flex items-center justify-between z-50">
                <span>{voiceError}</span>
              </div>
            )}
          </form>

          {/* 3. Header Action Buttons - Larger Cart & Admin Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Direct Helpline Button */}
            <a
              href={`tel:${storeSettings.helplineNumber}`}
              className="hidden xl:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 transition"
            >
              <Phone className="w-4 h-4 text-amber-600" />
              <div className="text-left leading-tight">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Helpline</span>
                <span className="font-bold text-slate-900">{storeSettings.helplineNumber}</span>
              </div>
            </a>

            {/* ADMIN BUTTON (ONLY VISIBLE WHEN /admin IS ENTERED IN THE URL OR ADMIN MODE IS ACTIVE) */}
            {showAdminButton && (
              <button
                onClick={handleAdminButtonClick}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black border transition flex items-center gap-1.5 shrink-0 shadow-sm ${
                  isAdmin 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
                title="Admin price & booking manager"
              >
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-black whitespace-nowrap">{isAdmin ? 'Admin Active' : 'Admin'}</span>
              </button>
            )}

            {/* CART BUTTON (HIGH VISIBILITY FOR BOTH MOBILE & LAPTOP) */}
            <button
              onClick={onOpenCart}
              className="relative bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 sm:px-4.5 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-base flex items-center gap-1.5 sm:gap-2 shadow-md shadow-amber-500/20 hover:scale-105 transition shrink-0"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span className="font-black text-xs sm:text-base whitespace-nowrap">View Cart</span>
              {cartCount > 0 && (
                <span className="bg-slate-950 text-amber-400 text-[10px] sm:text-xs font-black min-w-[20px] h-5 sm:h-5.5 px-1 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Booking Modes Shortcuts Bar */}
        <div className="mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t border-slate-100 grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
          <button
            onClick={() => onOpenBookingMode('phone_callback')}
            className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 hover:border-amber-400 p-1.5 sm:p-2 rounded-lg text-slate-800 transition font-medium text-left"
          >
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <div className="truncate min-w-0">
              <span className="font-bold text-slate-900 text-[11px] sm:text-xs block truncate">1. Phone Order</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">Call / Callback</span>
            </div>
          </button>

          <button
            onClick={() => onOpenBookingMode('image_upload')}
            className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 hover:border-amber-400 p-1.5 sm:p-2 rounded-lg text-slate-800 transition font-medium text-left relative"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 shrink-0" />
            <div className="truncate min-w-0">
              <span className="font-bold text-slate-900 text-[11px] sm:text-xs block truncate">
                2. Materials List
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">Photo to Text</span>
            </div>
          </button>

          <button
            onClick={() => onOpenBookingMode('whatsapp_order')}
            className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 hover:border-amber-400 p-1.5 sm:p-2 rounded-lg text-slate-800 transition font-medium text-left"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0" />
            <div className="truncate min-w-0">
              <span className="font-bold text-slate-900 text-[11px] sm:text-xs block truncate">3. WhatsApp</span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 block truncate">Instant Chat</span>
            </div>
          </button>
        </div>
      </div>

      {/* Admin PIN Authentication Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={handleClosePinModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Store Admin Login</h3>
                <p className="text-xs text-slate-400">Enter password to manage prices &amp; bookings</p>
              </div>
            </div>

            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Admin Passcode / Password
                </label>
                <input
                  type="password"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Enter admin password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center tracking-widest text-lg focus:outline-none focus:border-amber-400"
                  autoFocus
                />
                {pinError && (
                  <p className="text-rose-400 text-xs mt-1 font-medium">Incorrect Password. Please try again.</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClosePinModal}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-sm transition"
                >
                  Unlock Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
