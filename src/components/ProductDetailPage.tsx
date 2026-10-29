import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Star,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  RefreshCcw,
  FileText,
  CheckCircle2,
  Eye,
  MessageSquare,
  Edit2,
  ChevronDown,
  ChevronUp,
  Fan,
  Lightbulb,
  Wrench,
  Droplets,
  Zap,
  Package,
  Truck,
} from 'lucide-react';
import { Product, CartItem, CategoryConfig, StoreSettings } from '../types';
import {
  DEFAULT_CATEGORIES,
  getCategoryDisplayName,
  getProductGalleryImages,
} from '../data/categories';
import {
  groupProductsByBaseName,
  resolveBaseAndSize,
  getVariantSizeLabel,
  ProductGroup,
} from '../utils/productGrouping';
import { SizeSelectorModal } from './SizeSelectorModal';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  categories?: CategoryConfig[];
  cartItems: CartItem[];
  storeSettings: StoreSettings;
  onAddToCart: (product: Product, quantity: number) => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  onOpenCart: () => void;
  onOpenWhatsAppForProduct: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onBackToCatalog: (category?: string, subcategory?: string) => void;
  onNavigateHome: () => void;
  isAdmin?: boolean;
  onEditProductInAdmin?: (product: Product) => void;
}

function getCategoryIcon(categoryId: string, className = 'w-6 h-6') {
  const cat = (categoryId || '').toLowerCase();
  if (cat.includes('plumb')) return <Droplets className={className} />;
  if (cat.includes('electr')) return <Zap className={className} />;
  if (cat.includes('fan')) return <Fan className={className} />;
  if (cat.includes('light') || cat.includes('bulb') || cat.includes('lamp'))
    return <Lightbulb className={className} />;
  if (cat.includes('tool')) return <Wrench className={className} />;
  return <Package className={className} />;
}

function formatPriceINR(amount: number): string {
  if (!amount || amount <= 0) return '0';
  return Number.isInteger(amount)
    ? amount.toLocaleString('en-IN')
    : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  categories = DEFAULT_CATEGORIES,
  cartItems,
  storeSettings,
  onAddToCart,
  onUpdateQuantity,
  onOpenCart,
  onOpenWhatsAppForProduct,
  onSelectProduct,
  onBackToCatalog,
  onNavigateHome,
  isAdmin = false,
  onEditProductInAdmin,
}) => {
  // Group resolution so multi-size products show interactive variant selection on the PDP
  const allGroups = useMemo(() => groupProductsByBaseName(allProducts), [allProducts]);

  const currentGroup = useMemo(() => {
    const { baseName } = resolveBaseAndSize(product);
    const key = `${product.category}::${baseName.toLowerCase().replace(/\s+/g, ' ').trim()}`;
    return allGroups.find((g) => g.key === key) || null;
  }, [allGroups, product]);

  const [activeVariantId, setActiveVariantId] = useState<string>(product.id);
  useEffect(() => {
    setActiveVariantId(product.id);
  }, [product.id]);

  const activeVariant: Product = useMemo(() => {
    if (currentGroup) {
      const found = currentGroup.variants.find((v) => v.id === activeVariantId);
      if (found) return found;
    }
    return product;
  }, [currentGroup, activeVariantId, product]);

  // Gallery images & Auto-Slide logic
  const galleryImages = useMemo(
    () => getProductGalleryImages(activeVariant, currentGroup?.variants),
    [activeVariant, currentGroup]
  );

  const [activeSlide, setActiveSlide] = useState(0);
  const [isGalleryHovered, setIsGalleryHovered] = useState(false);
  const [showDoorstepModalInfo, setShowDoorstepModalInfo] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(true);
  const [addedFeedback, setAddedFeedback] = useState<Record<string, boolean>>({});
  const [similarSizeModalGroup, setSimilarSizeModalGroup] = useState<ProductGroup | null>(null);

  useEffect(() => {
    setActiveSlide(0);
  }, [activeVariant.id, galleryImages.length]);

  // Automatic image slider when multiple product images exist
  useEffect(() => {
    if (galleryImages.length <= 1 || isGalleryHovered) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % galleryImages.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [galleryImages.length, isGalleryHovered]);

  const getCartQuantity = (productId: string) => {
    const found = (cartItems || []).find((i) => i && i.product && i.product.id === productId);
    return found ? found.quantity : 0;
  };

  const handleAddWithFeedback = (target: Product) => {
    onAddToCart(target, 1);
    setAddedFeedback((prev) => ({ ...prev, [target.id]: true }));
    window.setTimeout(() => {
      setAddedFeedback((prev) => ({ ...prev, [target.id]: false }));
    }, 2500);
  };

  const qtyInCart = getCartQuantity(activeVariant.id);
  const categoryName = getCategoryDisplayName(activeVariant.category, categories);
  const hasDiscount =
    Boolean(activeVariant.originalPrice) &&
    Number(activeVariant.originalPrice) > activeVariant.price &&
    activeVariant.price > 0;
  const discountPercent = hasDiscount
    ? Math.round(
        ((Number(activeVariant.originalPrice) - activeVariant.price) /
          Number(activeVariant.originalPrice)) *
          100
      )
    : 0;

  // Build normalized specifications & key highlights
  const allSpecEntries = useMemo(() => {
    const entries: Array<{ label: string; value: string }> = [];
    const seen = new Set<string>();

    const pushSpec = (label: string, val?: string | number) => {
      const cleanLabel = (label || '').trim();
      const cleanVal = String(val ?? '').trim();
      if (!cleanLabel || !cleanVal) return;
      const lower = cleanLabel.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      entries.push({ label: cleanLabel, value: cleanVal });
    };

    if (activeVariant.keyHighlights) {
      Object.entries(activeVariant.keyHighlights).forEach(([k, v]) => pushSpec(k, v));
    }
    if (activeVariant.specifications) {
      Object.entries(activeVariant.specifications).forEach(([k, v]) => pushSpec(k, v));
    }

    // Ensure core product details are always present
    if (activeVariant.brand) pushSpec('Brand', activeVariant.brand);
    if (activeVariant.sizeLabel) pushSpec('Size / Variant', activeVariant.sizeLabel);
    if (activeVariant.subcategory) pushSpec('Type / Subcategory', activeVariant.subcategory);
    if (activeVariant.warranty) pushSpec('Warranty', activeVariant.warranty);
    pushSpec('Unit', `1 ${activeVariant.unit || 'pc'}`);
    if (activeVariant.sku) pushSpec('Model / SKU', activeVariant.sku);

    return entries;
  }, [activeVariant]);

  const topFourHighlights = useMemo(() => allSpecEntries.slice(0, 4), [allSpecEntries]);
  const keyHighlightsGrid = useMemo(() => allSpecEntries.slice(0, 6), [allSpecEntries]);

  // Quick badge attribute (like "no. of speed: 5" or wattage / size)
  const quickBadgeSpec = useMemo(() => {
    const specs = {
      ...(activeVariant.keyHighlights || {}),
      ...(activeVariant.specifications || {}),
    };
    const priorityEntry = Object.entries(specs).find(([k, v]) => {
      const lower = k.toLowerCase();
      return (
        Boolean(v) &&
        (lower.includes('speed') ||
          lower.includes('watt') ||
          lower.includes('blade') ||
          lower.includes('sweep') ||
          lower.includes('size'))
      );
    });
    if (priorityEntry) {
      return `${priorityEntry[0].toLowerCase()}: ${priorityEntry[1]}`;
    }
    if (activeVariant.sizeLabel) {
      return `Size: ${activeVariant.sizeLabel}`;
    }
    return null;
  }, [activeVariant]);

  // Pipe-separated summary subtitle matching template
  const pipeSummaryLine = useMemo(() => {
    const parts: string[] = [];
    if (activeVariant.sizeLabel) parts.push(activeVariant.sizeLabel);
    if (activeVariant.subcategory) parts.push(activeVariant.subcategory);
    const specValues = Object.entries(activeVariant.specifications || {})
      .slice(0, 4)
      .map(([k, v]) => {
        const lk = k.toLowerCase();
        if (lk.includes('blade')) return `${v} Blades`;
        if (lk.includes('speed') && !String(v).toLowerCase().includes('speed')) return `${v} Speed`;
        return String(v);
      })
      .filter(Boolean);
    specValues.forEach((sv) => {
      if (!parts.some((p) => p.toLowerCase() === sv.toLowerCase())) {
        parts.push(sv);
      }
    });
    return parts.join(' | ');
  }, [activeVariant]);

  // Similar Products in the same category (prioritize matching subcategory first)
  const similarGroups = useMemo(() => {
    const targetCat = (activeVariant.category || '').toLowerCase();
    const targetSub = (activeVariant.subcategory || '').toLowerCase();

    const sameCategoryGroups = allGroups.filter(
      (g) =>
        g.category.toLowerCase() === targetCat &&
        (!currentGroup || g.key !== currentGroup.key) &&
        !g.variants.some((v) => v.id === activeVariant.id)
    );

    return [...sameCategoryGroups].sort((a, b) => {
      const aSameSub = (a.subcategory || '').toLowerCase() === targetSub ? 1 : 0;
      const bSameSub = (b.subcategory || '').toLowerCase() === targetSub ? 1 : 0;
      if (aSameSub !== bSameSub) return bSameSub - aSameSub;
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return 0;
    });
  }, [allGroups, activeVariant, currentGroup]);

  const warrantyShortLabel = activeVariant.warranty?.trim() || 'Brand';
  const brandImagesList = Array.isArray(activeVariant.brandImages)
    ? activeVariant.brandImages.filter((u) => u && u.trim() !== '')
    : [];

  return (
    <div className="bg-slate-50/70 min-h-screen pb-24 sm:pb-12 text-slate-900">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none"
          >
            <button
              type="button"
              onClick={() => onBackToCatalog(activeVariant.category)}
              className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-amber-600 pr-1.5 border-r border-slate-200 mr-0.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-amber-600 font-medium cursor-pointer shrink-0"
            >
              Home
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            <button
              type="button"
              onClick={() => onBackToCatalog(activeVariant.category)}
              className="hover:text-amber-600 font-semibold text-slate-700 cursor-pointer shrink-0"
            >
              {categoryName}
            </button>

            {activeVariant.subcategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => onBackToCatalog(activeVariant.category, activeVariant.subcategory)}
                  className="hover:text-amber-600 font-medium text-slate-600 cursor-pointer shrink-0"
                >
                  {activeVariant.subcategory}
                </button>
              </>
            )}

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            <span className="font-bold text-slate-900 truncate max-w-[220px] sm:max-w-md">
              {activeVariant.name}
            </span>
          </nav>

          {isAdmin && onEditProductInAdmin && (
            <button
              type="button"
              onClick={() => onEditProductInAdmin(activeVariant)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Product &amp; Photos</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Contiguous PDP Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
          {/* ================================================================ */}
          {/* LEFT COLUMN: STICKY AUTO-SLIDING GALLERY & QUICK HIGHLIGHTS      */}
          {/* ================================================================ */}
          <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-4">
            <div
              className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs"
              onMouseEnter={() => setIsGalleryHovered(true)}
              onMouseLeave={() => setIsGalleryHovered(false)}
            >
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {/* Thumbnail Strip (Vertical on sm+, Horizontal on mobile) */}
                {galleryImages.length > 1 && (
                  <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[380px] scrollbar-none shrink-0">
                    {galleryImages.map((imgUrl, idx) => {
                      const isCurrent = idx === activeSlide;
                      return (
                        <button
                          key={`${imgUrl.slice(0, 36)}-${idx}`}
                          type="button"
                          onClick={() => setActiveSlide(idx)}
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 bg-white p-1 shrink-0 transition cursor-pointer ${
                            isCurrent
                              ? 'border-amber-500 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                          }`}
                          title={`View image ${idx + 1} of ${galleryImages.length}`}
                        >
                          <img
                            src={imgUrl}
                            alt={`${activeVariant.name} thumbnail ${idx + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Main Auto-Sliding Stage */}
                <div className="relative flex-1 aspect-square bg-white rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
                  {galleryImages.length > 0 ? (
                    <img
                      key={`${activeVariant.id}-${activeSlide}`}
                      src={galleryImages[activeSlide] || galleryImages[0]}
                      alt={`${activeVariant.name} – Image ${activeSlide + 1}`}
                      className="w-full h-full object-contain p-2 sm:p-4 transition-opacity duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
                        {getCategoryIcon(activeVariant.category, 'w-8 h-8')}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {categoryName}
                      </span>
                    </div>
                  )}

                  {/* Discount Badge on Gallery */}
                  {hasDiscount && (
                    <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-xs">
                      {discountPercent}% OFF
                    </span>
                  )}

                  {/* Rating Pill on Gallery */}
                  {(activeVariant.rating || activeVariant.reviewCount) && (
                    <div className="absolute top-2.5 right-2.5 bg-white/95 border border-slate-200 px-2 py-1 rounded-lg shadow-xs flex items-center gap-1 text-xs">
                      <span className="font-black text-slate-900">
                        {(activeVariant.rating || 4.2).toFixed(1)}
                      </span>
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {activeVariant.reviewCount !== undefined && (
                        <span className="text-slate-500 text-[11px]">
                          ({activeVariant.reviewCount.toLocaleString('en-IN')})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Prev / Next Arrows for Multiple Images */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlide(
                            (prev) => (prev - 1 + galleryImages.length) % galleryImages.length
                          )
                        }
                        aria-label="Previous product image"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-slate-950 transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlide((prev) => (prev + 1) % galleryImages.length)
                        }
                        aria-label="Next product image"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-slate-950 transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Pagination Dots */}
                      <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5">
                        {galleryImages.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveSlide(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              idx === activeSlide
                                ? 'w-5 bg-amber-500'
                                : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Top 4 Quick Spec Tiles (matching template strip right below gallery) */}
              {topFourHighlights.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100">
                  {topFourHighlights.map((item) => (
                    <div
                      key={item.label}
                      className="bg-slate-50 border border-slate-200/70 rounded-xl px-2.5 py-2 text-left"
                    >
                      <span className="text-[10px] text-slate-500 font-medium lowercase block truncate">
                        {item.label}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 block truncate mt-0.5">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Desktop Quick Price + Add to Cart Bar inside Left Sticky Card */}
              <div className="hidden lg:flex items-center justify-between gap-4 mt-4 pt-3.5 border-t border-slate-200">
                <div>
                  {activeVariant.price > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono tabular-nums text-slate-900">
                        ₹{formatPriceINR(activeVariant.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-slate-400 line-through font-mono tabular-nums">
                          ₹{formatPriceINR(Number(activeVariant.originalPrice))}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-base font-extrabold text-amber-700">Price on Quote</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeVariant.price <= 0 ? (
                    <button
                      type="button"
                      onClick={() => onOpenWhatsAppForProduct(activeVariant)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Get Instant Quote</span>
                    </button>
                  ) : qtyInCart > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-amber-50 border border-amber-300 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity
                              ? onUpdateQuantity(activeVariant.id, -1)
                              : onAddToCart(activeVariant, -1)
                          }
                          className="w-8 h-8 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center font-black cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 font-mono font-black text-sm text-slate-900">
                          {qtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddToCart(activeVariant, 1)}
                          disabled={activeVariant.stockStatus === 'out_of_stock'}
                          className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-black cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenCart}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs cursor-pointer"
                      >
                        View Cart →
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddWithFeedback(activeVariant)}
                      disabled={activeVariant.stockStatus === 'out_of_stock'}
                      className={`px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-sm transition cursor-pointer ${
                        addedFeedback[activeVariant.id]
                          ? 'bg-emerald-600 text-white'
                          : activeVariant.stockStatus === 'out_of_stock'
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                      }`}
                    >
                      {addedFeedback[activeVariant.id] ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Added to Cart</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT COLUMN: PRODUCT TITLE, PRICING, TRUST & FULL SPECS         */}
          {/* ================================================================ */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Primary Product Purchase & Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
              {/* Top Quick Spec Tag & Express Delivery Tag */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {quickBadgeSpec && (
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md">
                      {quickBadgeSpec}
                    </span>
                  )}
                  <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Truck className="w-3 h-3 text-amber-600" /> 10–15 Min Express Delivery
                  </span>
                </div>

                {activeVariant.stockStatus === 'in_stock' ? (
                  <span className="text-xs font-extrabold text-emerald-700">● In Stock</span>
                ) : activeVariant.stockStatus === 'low_stock' ? (
                  <span className="text-xs font-extrabold text-amber-700">● Low Stock</span>
                ) : (
                  <span className="text-xs font-extrabold text-rose-700">● Out of Stock</span>
                )}
              </div>

              {/* Brand + Main Title + Pipe Summary */}
              <div className="space-y-1">
                {activeVariant.brand && (
                  <div className="text-xs sm:text-sm font-extrabold text-amber-700 uppercase tracking-wide">
                    {activeVariant.brand}
                  </div>
                )}
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug">
                  {activeVariant.name}
                </h1>
                {pipeSummaryLine && (
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                    {pipeSummaryLine}
                  </p>
                )}
              </div>

              {/* Rating & Net Qty Row */}
              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
                <span className="font-semibold text-slate-700">
                  Net Qty:{' '}
                  <strong className="text-slate-900">1 {activeVariant.unit || 'pc'}</strong>
                </span>

                {(activeVariant.rating || activeVariant.reviewCount) && (
                  <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                    <span>{(activeVariant.rating || 4.2).toFixed(1)}</span>
                    <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                    {activeVariant.reviewCount !== undefined && (
                      <span className="text-slate-600 font-normal">
                        ({activeVariant.reviewCount.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Multi-Size / Variant Selector (if product belongs to a multi-size group) */}
              {currentGroup && currentGroup.variants.length > 1 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Select Size / Variant ({currentGroup.variants.length} options):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {currentGroup.variants.map((variant) => {
                      const isSelected = variant.id === activeVariant.id;
                      const szLabel = getVariantSizeLabel(variant);
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setActiveVariantId(variant.id)}
                          className={`px-3 py-2 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-400 text-slate-900'
                              : 'bg-white border-slate-200 hover:border-amber-300 text-slate-700'
                          }`}
                        >
                          <div className="text-xs font-extrabold">{szLabel}</div>
                          {variant.price > 0 && (
                            <div className="text-[11px] font-mono font-bold text-amber-700">
                              ₹{formatPriceINR(variant.price)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pricing + Primary CTA Block */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  {activeVariant.price > 0 ? (
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
                          ₹{formatPriceINR(activeVariant.price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs sm:text-sm font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {discountPercent}% Off
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        {hasDiscount && (
                          <span className="line-through font-mono tabular-nums text-slate-400">
                            ₹{formatPriceINR(Number(activeVariant.originalPrice))}
                          </span>
                        )}
                        <span>MRP (incl. of all taxes)</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xl font-black text-amber-700">Quote on Request</span>
                      <p className="text-xs text-slate-500">
                        Contact our dispatch team for live wholesale pricing
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {activeVariant.price > 0 &&
                    (qtyInCart > 0 ? (
                      <div className="flex items-center bg-amber-50 border border-amber-300 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity
                              ? onUpdateQuantity(activeVariant.id, -1)
                              : onAddToCart(activeVariant, -1)
                          }
                          className="w-9 h-9 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center font-black cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 font-mono font-black text-base text-slate-900">
                          {qtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddToCart(activeVariant, 1)}
                          disabled={activeVariant.stockStatus === 'out_of_stock'}
                          className="w-9 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-black cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddWithFeedback(activeVariant)}
                        disabled={activeVariant.stockStatus === 'out_of_stock'}
                        className={`px-6 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
                          addedFeedback[activeVariant.id]
                            ? 'bg-emerald-600 text-white'
                            : activeVariant.stockStatus === 'out_of_stock'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                        }`}
                      >
                        {addedFeedback[activeVariant.id] ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Added to Cart</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    ))}

                  <button
                    type="button"
                    onClick={() => onOpenWhatsAppForProduct(activeVariant)}
                    className="px-3.5 py-3 rounded-xl text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Order on WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Service & Policy Badges Strip (Returns, Warranty, GST Invoice) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <RefreshCcw className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 leading-tight">
                  Returns &amp; Replacement Policy
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 leading-tight">
                  {warrantyShortLabel.toLowerCase().includes('warranty')
                    ? warrantyShortLabel
                    : `${warrantyShortLabel} Brand Warranty`}
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 leading-tight">
                  GST Invoice Available
                </span>
              </div>
            </div>

            {/* 3. Customer Retention & Verify at Your Doorstep Cards */}
            <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 shadow-2xs overflow-hidden">
              <div className="p-3.5 sm:p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Customers usually keep this item
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Quality-checked genuine stock with minimal returns in recent orders.
                  </p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Eye className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        Verify at your Doorstep
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                        Check the product upon delivery and accept if okay, or reject at the door
                        for an instant replacement or full refund.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDoorstepModalInfo((prev) => !prev)}
                    className="text-xs font-extrabold text-amber-700 hover:text-amber-800 whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {showDoorstepModalInfo ? 'Hide' : 'View details'}
                  </button>
                </div>

                {showDoorstepModalInfo && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Open-Box Doorstep Inspection:</p>
                    <p>
                      Our delivery partner waits while you inspect physical condition, model label,
                      size, and box contents right at your home or jobsite in LB Nagar,
                      Vanasthalipuram &amp; nearby areas.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Key Highlights Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-3.5">
              <h2 className="text-base sm:text-lg font-black text-slate-900">Key Highlights</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {keyHighlightsGrid.map((item) => (
                  <div
                    key={item.label}
                    className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3"
                  >
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {item.label}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 block mt-0.5">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Full Product Details & Expandable Sections */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-slate-900">Product Details</h2>
                <button
                  type="button"
                  onClick={() => setShowAllDetails((prev) => !prev)}
                  className="text-xs font-extrabold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{showAllDetails ? 'View Less' : 'View Details'}</span>
                  {showAllDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Specifications Table */}
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                {(showAllDetails ? allSpecEntries : allSpecEntries.slice(0, 6)).map((row, idx) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-12 px-3.5 py-2.5 text-xs sm:text-sm ${
                      idx % 2 === 0 ? 'bg-slate-50/60' : 'bg-white'
                    }`}
                  >
                    <span className="col-span-5 text-slate-500 font-medium pr-2">{row.label}</span>
                    <span className="col-span-7 text-slate-900 font-bold">{row.value}</span>
                  </div>
                ))}
              </div>

              {showAllDetails && (
                <div className="space-y-4 pt-2 border-t border-slate-100 text-xs sm:text-sm">
                  {/* Warranty Details */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900">Warranty Details</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {activeVariant.warrantyDetails ||
                        (activeVariant.warranty
                          ? `${activeVariant.warranty} manufacturer warranty against manufacturing defects. Keep your Minute Materials invoice for hassle-free claim support.`
                          : 'Covered by standard brand quality assurance and Minute Materials doorstep replacement guarantee.')}
                    </p>
                  </div>

                  {/* What's In The Box */}
                  <div className="space-y-1 pt-3 border-t border-slate-100">
                    <h3 className="font-extrabold text-slate-900">What&apos;s In The Box</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {activeVariant.whatsInTheBox ||
                        `1 × ${activeVariant.name} (${activeVariant.unit || '1 pc'}) with standard manufacturer fittings/packaging`}
                    </p>
                  </div>

                  {/* Product Description */}
                  <div className="space-y-1 pt-3 border-t border-slate-100">
                    <h3 className="font-extrabold text-slate-900">Product Description</h3>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                      {activeVariant.description && activeVariant.description.trim() !== ''
                        ? activeVariant.description
                        : `${activeVariant.name} supplied directly from ${
                            storeSettings.storeName || 'Minute Materials'
                          } for residential, commercial, and contractor installations. Available with 10–15 minute express dispatch across LB Nagar, Vanasthalipuram, Chinthalkunta, Hastinapuram, BN Reddy Nagar, Nagole, and nearby areas.`}
                    </p>
                  </div>

                  {/* Vendor Details */}
                  <div className="space-y-1 pt-3 border-t border-slate-100">
                    <h3 className="font-extrabold text-slate-900">Vendor Details</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {activeVariant.vendorDetails ||
                        `${storeSettings.storeName || 'Minute Materials'} Express Supply Hub — LB Nagar & Vanasthalipuram, Hyderabad, Telangana | Customer Support & Dispatch: +91 ${
                          storeSettings.helplineNumber || '8332869926'
                        }`}
                    </p>
                  </div>

                  {/* Brand Images (if provided) */}
                  {brandImagesList.length > 0 && (
                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      <h3 className="font-extrabold text-slate-900">Brand Images</h3>
                      <div className="space-y-3">
                        {brandImagesList.map((bImg, idx) => (
                          <img
                            key={`${bImg.slice(0, 36)}-${idx}`}
                            src={bImg}
                            alt={`${activeVariant.name} brand showcase ${idx + 1}`}
                            className="w-full rounded-xl border border-slate-200 object-contain bg-slate-50"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAllDetails(false)}
                      className="text-xs font-extrabold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Less</span>
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* SIMILAR PRODUCTS SECTION (SAME CATEGORY)                         */}
        {/* ================================================================ */}
        <section className="mt-8 sm:mt-10 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">Similar Products</h2>
              <p className="text-xs text-slate-500">
                More products in {categoryName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onBackToCatalog(activeVariant.category)}
              className="text-xs font-extrabold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View All {categoryName}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {similarGroups.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 text-center space-y-2">
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                No other {categoryName.toLowerCase()} products added yet.
              </p>
              <button
                type="button"
                onClick={() => onBackToCatalog('all')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition cursor-pointer"
              >
                Browse Full Material Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {similarGroups.slice(0, 10).map((simGroup) => {
                const hasMultiple = simGroup.variants.length > 1;
                const positive = simGroup.variants
                  .filter((v) => v.price > 0)
                  .sort((a, b) => a.price - b.price);
                const simProd = positive[0] || simGroup.variants[0];
                const simImages = getProductGalleryImages(simProd, simGroup.variants);
                const simDisplayImg = simImages[0] || '';
                const simCartQty = hasMultiple
                  ? simGroup.variants.reduce((s, v) => s + getCartQuantity(v.id), 0)
                  : getCartQuantity(simProd.id);
                const simHasDiscount =
                  !hasMultiple &&
                  simProd.originalPrice &&
                  simProd.originalPrice > simProd.price &&
                  simProd.price > 0;

                // Quick spec note for similar card (e.g., "no. of speed: 5" or wattage/size)
                const simSpecs = {
                  ...(simProd.keyHighlights || {}),
                  ...(simProd.specifications || {}),
                };
                const firstSimSpec = Object.entries(simSpecs)[0];
                const simSpecTag = firstSimSpec
                  ? `${firstSimSpec[0].toLowerCase()}: ${firstSimSpec[1]}`
                  : simProd.subcategory || '';

                return (
                  <div
                    key={simGroup.key}
                    onClick={() => onSelectProduct(simProd)}
                    className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between transition hover:shadow-md cursor-pointer group"
                  >
                    <div>
                      {/* Image Box */}
                      <div className="relative aspect-square rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-2.5">
                        {simDisplayImg ? (
                          <img
                            src={simDisplayImg}
                            alt={hasMultiple ? simGroup.baseName : simProd.name}
                            className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-amber-600">
                            {getCategoryIcon(simProd.category, 'w-6 h-6')}
                          </div>
                        )}

                        {simImages.length > 1 && (
                          <span className="absolute bottom-1.5 left-1.5 bg-white/90 text-slate-700 border border-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {simImages.length} photos
                          </span>
                        )}
                      </div>

                      {/* Brand & Title */}
                      <div className="space-y-0.5">
                        {simProd.brand && (
                          <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wide block truncate">
                            {simProd.brand}
                          </span>
                        )}
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug min-h-[2.25rem]">
                          {hasMultiple ? simGroup.baseName : simProd.name}
                        </h3>
                        {simSpecTag && (
                          <p className="text-[10px] text-slate-500 truncate">{simSpecTag}</p>
                        )}
                      </div>
                    </div>

                    {/* Price, Rating & ADD Button */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          {simProd.price > 0 ? (
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-sm font-black font-mono tabular-nums text-slate-900">
                                ₹{formatPriceINR(simProd.price)}
                              </span>
                              {simHasDiscount && (
                                <span className="text-[10px] text-slate-400 line-through font-mono tabular-nums">
                                  ₹{formatPriceINR(Number(simProd.originalPrice))}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-amber-700">Ask Price</span>
                          )}
                        </div>

                        {(simProd.rating || simProd.reviewCount) && (
                          <div className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <span>{(simProd.rating || 4.1).toFixed(1)}</span>
                            <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                            {simProd.reviewCount !== undefined && (
                              <span className="text-slate-500">({simProd.reviewCount})</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Button (stopPropagation so ADD adds directly without navigating away unless card is clicked) */}
                      <div onClick={(e) => e.stopPropagation()}>
                        {hasMultiple ? (
                          <button
                            type="button"
                            onClick={() => setSimilarSizeModalGroup(simGroup)}
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition cursor-pointer"
                          >
                            {simCartQty > 0 ? `${simCartQty} in Cart · Sizes` : 'ADD · Sizes'}
                          </button>
                        ) : simProd.price <= 0 ? (
                          <button
                            type="button"
                            onClick={() => onOpenWhatsAppForProduct(simProd)}
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer"
                          >
                            Quote
                          </button>
                        ) : simCartQty > 0 ? (
                          <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity
                                  ? onUpdateQuantity(simProd.id, -1)
                                  : onAddToCart(simProd, -1)
                              }
                              className="w-6 h-6 rounded bg-white text-amber-800 border border-amber-200 flex items-center justify-center font-black cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-black text-xs text-slate-900">
                              {simCartQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => onAddToCart(simProd, 1)}
                              className="w-6 h-6 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-black cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddWithFeedback(simProd)}
                            disabled={simProd.stockStatus === 'out_of_stock'}
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-black border transition cursor-pointer ${
                              addedFeedback[simProd.id]
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white hover:bg-amber-500 text-amber-700 hover:text-slate-950 border-amber-400'
                            }`}
                          >
                            {addedFeedback[simProd.id] ? 'ADDED ✓' : 'ADD'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Mobile Sticky Bottom Purchase Bar */}
      <div className="lg:hidden fixed bottom-14 sm:bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-4 py-2.5 shadow-lg flex items-center justify-between gap-3">
        <div>
          {activeVariant.price > 0 ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black font-mono tabular-nums text-slate-900">
                  ₹{formatPriceINR(activeVariant.price)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-slate-400 line-through font-mono">
                    ₹{formatPriceINR(Number(activeVariant.originalPrice))}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-emerald-700 font-bold block">
                {hasDiscount ? `${discountPercent}% Off · ` : ''}15-Min Delivery
              </span>
            </div>
          ) : (
            <span className="text-sm font-black text-amber-700">Price on Request</span>
          )}
        </div>

        <div>
          {activeVariant.price <= 0 ? (
            <button
              type="button"
              onClick={() => onOpenWhatsAppForProduct(activeVariant)}
              className="bg-emerald-600 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Quote</span>
            </button>
          ) : qtyInCart > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-amber-50 border border-amber-300 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateQuantity
                      ? onUpdateQuantity(activeVariant.id, -1)
                      : onAddToCart(activeVariant, -1)
                  }
                  className="w-8 h-8 rounded-lg bg-white text-amber-800 border border-amber-200 flex items-center justify-center font-black"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 font-mono font-black text-sm text-slate-900">{qtyInCart}</span>
                <button
                  type="button"
                  onClick={() => onAddToCart(activeVariant, 1)}
                  className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={onOpenCart}
                className="bg-slate-900 text-white font-bold px-3 py-2.5 rounded-xl text-xs"
              >
                Cart →
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleAddWithFeedback(activeVariant)}
              disabled={activeVariant.stockStatus === 'out_of_stock'}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
              <span>Add to Cart</span>
            </button>
          )}
        </div>
      </div>

      {/* Size Selector Modal for Multi-Size Similar Products */}
      {similarSizeModalGroup && (
        <SizeSelectorModal
          group={similarSizeModalGroup}
          onClose={() => setSimilarSizeModalGroup(null)}
          cartItems={cartItems}
          onAddToCart={onAddToCart}
          onUpdateQuantity={onUpdateQuantity}
          onOpenWhatsAppForProduct={onOpenWhatsAppForProduct}
          categories={categories}
        />
      )}
    </div>
  );
};
