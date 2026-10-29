import React from 'react';
import {
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  ExternalLink,
  Camera
} from 'lucide-react';
import { DELIVERY_AREAS } from '../data/areas';
import { StoreConfig, UserLocation, CategoryConfig } from '../types';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { generateDirectWhatsAppChatUrl } from '../utils/whatsapp';
import { CompanyPageId } from './CompanyPages';
import { Logo } from './Logo';
import {
  WhatsAppGlyph,
  WhatsAppBadgeIcon,
  InstagramBadgeIcon,
  CallBadgeIcon,
  GmailBadgeIcon,
} from './BrandIcons';

interface FooterProps {
  onSelectCategory: (category: string) => void;
  onNavigatePage: (page: CompanyPageId) => void;
  activePage?: CompanyPageId;
  onOpenUploadModal: () => void;
  onOpenCallModal: () => void;
  onOpenLocationModal: () => void;
  onOpenAdminModal?: () => void;
  storeConfig: StoreConfig;
  location: UserLocation;
  categories?: CategoryConfig[];
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onNavigatePage,
  activePage = 'home',
  onOpenUploadModal,
  onOpenCallModal,
  onOpenLocationModal,
  storeConfig,
  categories = DEFAULT_CATEGORIES,
}) => {
  const callPhone = storeConfig.callNumber || '8332869926';
  const whatsappUrl = generateDirectWhatsAppChatUrl(storeConfig.whatsappNumber);

  return (
    <footer className="bg-[#07182E] text-white pt-10 pb-20 sm:pb-12 border-t border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Top Row: Brand & Emergency Hotline */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5 text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest bg-black/20 px-2 py-0.5 rounded-full">
                Jobsite Emergency Line
              </span>
              <h3 className="text-lg sm:text-xl font-black mt-0.5">
                Urgent Material Shortage at Site? We Reach in 15-30 Mins!
              </h3>
              <p className="text-xs text-orange-100">
                Call our direct jobsite dispatch supervisor for immediate bike/mini-truck dispatch.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`tel:${storeConfig.emergencyCallNumber || storeConfig.callNumber}`}
              className="px-5 py-2.5 bg-white text-orange-700 font-black text-xs sm:text-sm rounded-xl shadow-md hover:bg-orange-50 active:scale-95 transition flex items-center gap-2"
            >
              <Phone className="w-4 h-4" /> Call: {storeConfig.emergencyCallNumber || storeConfig.callNumber}
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <WhatsAppGlyph className="w-4 h-4" /> WhatsApp Hotline
            </a>
          </div>
        </div>

        {/* 4 Main Footer Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs text-slate-300">
          {/* Col 1: Material Categories */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider border-b border-navy-800 pb-2">
              Material Categories
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('all')}
                  className="hover:text-orange-400 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-orange-500 font-bold">›</span> All Materials
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className="hover:text-orange-400 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="text-orange-500 font-bold">›</span> {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider border-b border-navy-800 pb-2">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="hover:text-orange-400 transition flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-orange-400" /> Upload Contractor Slip (AI OCR)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenCallModal}
                  className="hover:text-orange-400 transition flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-orange-400" /> Order by Phone Call (30 Sec)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenLocationModal}
                  className="hover:text-orange-400 transition flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-orange-400" /> Delivery Areas & Live Timings
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Company */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider border-b border-navy-800 pb-2">
              Company
            </h4>
            <ul className="space-y-2">
              {(
                [
                  { label: 'About us', page: 'about' },
                  { label: 'Categories', page: 'categories' },
                  { label: 'Blog', page: 'blog' },
                  { label: 'FAQs', page: 'faqs' },
                  { label: 'Contact us', page: 'contact' },
                ] as const
              ).map((item) => (
                <li key={item.page}>
                  <button
                    type="button"
                    onClick={() => onNavigatePage(item.page)}
                    className={`hover:text-orange-400 transition flex items-center gap-1.5 cursor-pointer ${
                      activePage === item.page ? 'text-orange-400 font-bold' : ''
                    }`}
                  >
                    <span className="text-orange-500 font-bold">›</span> {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Brand Logo, Emergency Jobsite Contact & Hub */}
          <div className="space-y-3">
            <div className="pb-1">
              <Logo size="md" showContainer={true} />
            </div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider border-b border-navy-800 pb-2">
              LB Nagar &amp; Vanasthalipuram Hub
            </h4>
            <div className="space-y-2 text-slate-300">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Main Express Hub:</strong> Chinthalkunta / LB Nagar Ring Road, Near Vanasthalipuram, Hyderabad – 500074.
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                <span>
                  <strong>Dispatch:</strong> {storeConfig.callNumber}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <WhatsAppGlyph className="w-4 h-4 text-[#25D366] shrink-0" />
                <span>
                  <strong>WhatsApp:</strong> +{storeConfig.whatsappNumber}
                </span>
              </p>
            </div>

            {/* Connect with Us - Authentic Original Brand Logos */}
            <div className="pt-2">
              <p className="font-bold text-white mb-2.5">Connect with Us:</p>
              <div className="flex items-center gap-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-sm cursor-pointer"
                  title="Chat on WhatsApp"
                  aria-label="Chat on WhatsApp"
                >
                  <WhatsAppBadgeIcon className="w-9 h-9" />
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-sm cursor-pointer"
                  title="Follow on Instagram"
                  aria-label="Follow on Instagram"
                >
                  <InstagramBadgeIcon className="w-9 h-9" />
                </a>
                <a
                  href={`tel:${callPhone}`}
                  className="rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-sm cursor-pointer"
                  title={`Call Us: ${callPhone}`}
                  aria-label={`Call Us at ${callPhone}`}
                >
                  <CallBadgeIcon className="w-9 h-9" />
                </a>
                <a
                  href="mailto:mr.vinnu10@gmail.com"
                  className="rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-sm cursor-pointer"
                  title="Email Us on Gmail (mr.vinnu10@gmail.com)"
                  aria-label="Email Us on Gmail"
                >
                  <GmailBadgeIcon className="w-9 h-9" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Live Delivery Hub Coverage Grid */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Real-Time Express Delivery Coverage by Area</span>
            </div>
            <button
              type="button"
              onClick={onOpenLocationModal}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              Check My Jobsite Location <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
            {DELIVERY_AREAS.map((area) => (
              <div
                key={area.name}
                onClick={onOpenLocationModal}
                className="p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/60 transition cursor-pointer flex flex-col justify-between"
              >
                <span className="font-semibold text-slate-200 truncate">{area.name}</span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {area.timeMins} mins
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
