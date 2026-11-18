import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { buildSearchIndex, scoreProductMatch, getCorrectedQuery } from '../utils/searchUtils';
import { Product, CartItem, CategoryConfig } from '../types';
import {
  ShoppingCart,
  MessageSquare,
  Check,
  ArrowUpDown,
  Filter,
  Edit2,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  X,
  Droplets,
  Zap,
  Fan,
  Lightbulb,
  Wrench,
  Package,
  Layers,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { groupProductsByBaseName, getGroupVariantSummary } from '../utils/productGrouping';
import { SizeSelectorModal } from './SizeSelectorModal';
import {
  DEFAULT_CATEGORIES,
  getCategoryDisplayName,
  isDetailPageCategory,
  getProductGalleryImages,
} from '../data/categories';

interface ProductCatalogProps {
  products: Product[];
  categories?: CategoryConfig[];
  onAddToCart: (product: Product, quantity: number) => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  cartItems?: CartItem[];
  onOpenWhatsAppForProduct: (product: Product) => void;
  searchTerm: string;
  setSearchTerm?: (term: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  activeSubcategory?: string;
  setActiveSubcategory?: (sub: string) => void;
  isAdmin: boolean;
  onQuickEditPrice?: (product?: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
}

function getCategoryIcon(categoryId: string, className = 'w-3.5 h-3.5') {
  const cat = (categoryId || '').toLowerCase();
  if (cat === 'all') return <Layers className={className} />;
  if (cat === 'plumbing') return <Droplets className={className} />;
  if (cat === 'electrical') return <Zap className={className} />;
  if (cat === 'fans') return <Fan className={className} />;
  if (cat === 'lights') return <Lightbulb className={className} />;
  if (cat === 'tools') return <Wrench className={className} />;
  return <Package className={className} />;
}

const CatalogCardAutoImage: React.FC<{
  images: string[];
  alt: string;
  onUserSwipe?: () => void;
}> = ({ images, alt, onUserSwipe }) => {
  const [idx, setIdx] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pausedUntil, setPausedUntil] = useState(0);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    pointerId: number | null;
    isTouch: boolean;
    active: boolean;
    lockedAxis: 'x' | 'y' | null;
  }>({
    x: 0,
    y: 0,
    pointerId: null,
    isTouch: false,
    active: false,
    lockedAxis: null,
  });

  useEffect(() => {
    setIdx(0);
  }, [images.length, images[0]]);

  useEffect(() => {
    if (images.length <= 1 || isDragging) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      if (Date.now() < pausedUntil) return;
      setIdx((prev) => (prev + 1) % images.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [images.length, isDragging, pausedUntil]);

  const goTo = (nextIdx: number) => {
    const wrapped = (nextIdx + images.length) % images.length;
    setIdx(wrapped);
    setPausedUntil(Date.now() + 6000);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (images.length <= 1 || e.touches.length !== 1) return;
    const t = e.touches[0];
    pointerStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      pointerId: null,
      isTouch: true,
      active: true,
      lockedAxis: null,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current.active || !pointerStartRef.current.isTouch) return;
    const t = e.touches[0];
    const dx = t.clientX - pointerStartRef.current.x;
    const dy = t.clientY - pointerStartRef.current.y;
    if (!pointerStartRef.current.lockedAxis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      pointerStartRef.current.lockedAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    if (pointerStartRef.current.lockedAxis === 'x') {
      setIsDragging(true);
      setDragOffsetX(dx);
    }
  };

  const finishSwipe = (dx: number) => {
    if (Math.abs(dx) > 10) {
      onUserSwipe?.();
    }
    if (Math.abs(dx) > 26) {
      if (dx < 0) {
        goTo(idx + 1);
      } else {
        goTo(idx - 1);
      }
    }
    pointerStartRef.current.active = false;
    pointerStartRef.current.lockedAxis = null;
    setIsDragging(false);
    setDragOffsetX(0);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current.active || !pointerStartRef.current.isTouch) return;
    const dx = e.changedTouches[0]
      ? e.changedTouches[0].clientX - pointerStartRef.current.x
      : dragOffsetX;
    finishSwipe(dx);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (images.length <= 1 || e.pointerType === 'touch' || e.button !== 0) return;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      isTouch: false,
      active: true,
      lockedAxis: null,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current.active || pointerStartRef.current.isTouch) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (!pointerStartRef.current.lockedAxis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      pointerStartRef.current.lockedAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    if (pointerStartRef.current.lockedAxis === 'x') {
      setIsDragging(true);
      setDragOffsetX(dx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current.active || pointerStartRef.current.isTouch) return;
    const dx = e.clientX - pointerStartRef.current.x;
    finishSwipe(dx);
  };

  if (images.length <= 1) {
    return (
      <img
        src={images[0]}
        alt={alt}
        draggable={false}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden touch-pan-y select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={`flex h-full w-full ${
          isDragging ? '' : 'transition-transform duration-300 ease-out'
        }`}
        style={{
          transform: `translate3d(calc(-${idx * 100}% + ${dragOffsetX}px), 0, 0)`,
        }}
      >
        {images.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={`${alt} ${i + 1}`}
            draggable={false}
            className="w-full h-full shrink-0 object-cover"
          />
        ))}
      </div>

      {/* Subtle hover arrows for quick desktop stepping */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUserSwipe?.();
          goTo(idx - 1);
        }}
        aria-label="Previous image"
        className="hidden sm:flex opacity-0 group-hover:opacity-100 absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 hover:bg-white border border-slate-200 shadow-xs items-center justify-center text-slate-700 transition z-10 cursor-pointer"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUserSwipe?.();
          goTo(idx + 1);
        }}
        aria-label="Next image"
        className="hidden sm:flex opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 hover:bg-white border border-slate-200 shadow-xs items-center justify-center text-slate-700 transition z-10 cursor-pointer"
      >
        <ChevronRight className="w-3 h-3" />
      </button>

      {/* Interactive pagination dots */}
      <div
        className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-white/85 px-1 py-0.5 rounded-full shadow-2xs z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {images.slice(0, 5).map((_, dotIdx) => (
          <button
            key={dotIdx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUserSwipe?.();
              goTo(dotIdx);
            }}
            aria-label={`View image ${dotIdx + 1}`}
            className={`h-1 rounded-full transition-all cursor-pointer ${
              dotIdx === idx % 5 ? 'w-2.5 bg-amber-500' : 'w-1 bg-slate-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  categories = DEFAULT_CATEGORIES,
  onAddToCart,
  onUpdateQuantity,
  cartItems = [],
  onOpenWhatsAppForProduct,
  searchTerm,
  setSearchTerm,
  activeCategory,
  setActiveCategory,
  activeSubcategory: externalSubcategory,
  setActiveSubcategory: setExternalSubcategory,
  isAdmin,
  onQuickEditPrice,
  onDeleteProduct,
  onSelectProduct,
}) => {
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'name'>('popular');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const addedTimeoutsRef = useRef<Record<string, number>>({});
  const lastCardSwipeAtRef = useRef<number>(0);
  const [catalogProductToDelete, setCatalogProductToDelete] = useState<Product | null>(null);
  const [activeSizeGroupKey, setActiveSizeGroupKey] = useState<string | null>(null);

  // Category-specific Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [internalSubcategory, setInternalSubcategory] = useState('all');
  const selectedSubcategory = externalSubcategory !== undefined ? externalSubcategory : internalSubcategory;
  const setSelectedSubcategory = setExternalSubcategory || setInternalSubcategory;

  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [priceRange, setPriceRange] = useState<'all' | 'under_50' | '50_200' | '200_500' | 'above_500'>('all');

  // Clear "Added" feedback immediately if item leaves cart (e.g. decremented to 0 via "-")
  useEffect(() => {
    const activeCartIds = new Set(
      (cartItems || [])
        .filter((i) => i && i.product && i.quantity > 0)
        .map((i) => i.product.id)
    );
    setAddedIds((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id] && !activeCartIds.has(id)) {
          delete next[id];
          changed = true;
          if (addedTimeoutsRef.current[id]) {
            window.clearTimeout(addedTimeoutsRef.current[id]);
            delete addedTimeoutsRef.current[id];
          }
        }
      }
      return changed ? next : prev;
    });
  }, [cartItems]);

  useEffect(() => {
    return () => {
      Object.keys(addedTimeoutsRef.current).forEach((id) => {
        window.clearTimeout(addedTimeoutsRef.current[id]);
      });
    };
  }, []);

  const getCartQuantity = (productId: string) => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    const item = cartItems.find((i) => i && i.product && i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    if (setSearchTerm) {
      setSearchTerm('');
    }
    setSelectedSubcategory('all');
  };

  const handleAddWithFeedback = (product: Product) => {
    onAddToCart(product, 1);
    if (addedTimeoutsRef.current[product.id]) {
      window.clearTimeout(addedTimeoutsRef.current[product.id]);
    }
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    addedTimeoutsRef.current[product.id] = window.setTimeout(() => {
      setAddedIds((prev) => {
        if (!prev[product.id]) return prev;
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      delete addedTimeoutsRef.current[product.id];
    }, 5000);
  };

  // Merge configured subcategories for the active category with any subcategories on products
  const activeCategoryConfig = useMemo(
    () => categories.find((c) => c.id.toLowerCase() === activeCategory.toLowerCase()),
    [categories, activeCategory]
  );

  const categoryProducts = useMemo(
    () =>
      activeCategory === 'all'
        ? products
        : products.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase()),
    [products, activeCategory]
  );

  const availableSubcategories = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const addSub = (s?: string) => {
      const clean = (s || '').trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        ordered.push(clean);
      }
    };

    if (activeCategory === 'all') {
      categories.forEach((c) => c.subcategories.forEach(addSub));
      products.forEach((p) => addSub(p.subcategory));
    } else {
      activeCategoryConfig?.subcategories.forEach(addSub);
      categoryProducts.forEach((p) => addSub(p.subcategory));
    }
    return ordered;
  }, [activeCategory, activeCategoryConfig, categories, categoryProducts, products]);

  const subcategoryScopedProducts = useMemo(() => {
    if (selectedSubcategory === 'all') return categoryProducts;
    return categoryProducts.filter(
      (p) => (p.subcategory || '').toLowerCase() === selectedSubcategory.toLowerCase()
    );
  }, [categoryProducts, selectedSubcategory]);

  const availableBrands = useMemo(() => {
    const brandMap = new Map<string, { name: string; count: number }>();
    const scopedGroups = groupProductsByBaseName(subcategoryScopedProducts);
    for (const grp of scopedGroups) {
      const rawBrand = (grp.brand || grp.variants[0]?.brand || '').trim();
      if (!rawBrand) continue;
      const key = rawBrand.toLowerCase();
      const existing = brandMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        brandMap.set(key, { name: rawBrand, count: 1 });
      }
    }
    return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [subcategoryScopedProducts]);

  // Reset selectedSubcategory if activeCategory changes and current subcategory is not in new list
  useEffect(() => {
    if (
      selectedSubcategory !== 'all' &&
      !availableSubcategories.some((s) => s.toLowerCase() === selectedSubcategory.toLowerCase())
    ) {
      setSelectedSubcategory('all');
    }
  }, [activeCategory, availableSubcategories, selectedSubcategory, setSelectedSubcategory]);

  // Reset selectedBrand if current brand has no items in active category/subcategory
  useEffect(() => {
    if (
      selectedBrand !== 'all' &&
      !availableBrands.some((b) => b.name.toLowerCase() === selectedBrand.toLowerCase())
    ) {
      setSelectedBrand('all');
    }
  }, [availableBrands, selectedBrand]);

  const hasActiveFilters =
    selectedSubcategory !== 'all' ||
    selectedBrand !== 'all' ||
    stockFilter !== 'all' ||
    priceRange !== 'all';

  const clearAllFilters = () => {
    setSelectedSubcategory('all');
    setSelectedBrand('all');
    setStockFilter('all');
    setPriceRange('all');
  };

  // Deferred search term keeps typing 60fps smooth across 2,000+ SKUs
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const correctedSearchLabel = useMemo(() => getCorrectedQuery(deferredSearchTerm), [deferredSearchTerm]);

  // Pre-build normalized search index once per catalog change
  const searchIndexById = useMemo(() => {
    const entries = buildSearchIndex(products);
    const map = new Map<string, (typeof entries)[number]>();
    for (const entry of entries) {
      map.set(entry.product.id, entry);
    }
    return map;
  }, [products]);

  // Group all catalog products by baseName + brand so same products from different brands stay distinct
  const allGroups = useMemo(() => groupProductsByBaseName(products), [products]);

  const getProductSearchScore = (product: Product): number => {
    const q = deferredSearchTerm.trim();
    if (!q) return 1;
    const entry = searchIndexById.get(product.id);
    if (!entry) return 0;
    return scoreProductMatch(entry, q);
  };

  const matchesProductCriteria = (product: Product): boolean => {
    const matchesCategory =
      activeCategory === 'all' || product.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSubcategory =
      selectedSubcategory === 'all' ||
      (product.subcategory || '').toLowerCase() === selectedSubcategory.toLowerCase();
    const matchesBrand =
      selectedBrand === 'all' ||
      (product.brand || '').trim().toLowerCase() === selectedBrand.toLowerCase();

    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && product.stockStatus === 'in_stock') ||
      (stockFilter === 'low_stock' && product.stockStatus === 'low_stock');

    let matchesPrice = true;
    if (priceRange === 'under_50') matchesPrice = product.price > 0 && product.price < 50;
    else if (priceRange === '50_200') matchesPrice = product.price >= 50 && product.price <= 200;
    else if (priceRange === '200_500') matchesPrice = product.price > 200 && product.price <= 500;
    else if (priceRange === 'above_500') matchesPrice = product.price > 500;

    const matchesSearch = getProductSearchScore(product) > 0;

    return (
      matchesCategory &&
      matchesSubcategory &&
      matchesBrand &&
      matchesStock &&
      matchesPrice &&
      matchesSearch
    );
  };

  // Filter Groups where at least one size variant matches active criteria
  const filteredGroups = useMemo(() => {
    return allGroups
      .map((group) => {
        const matchingVariants = group.variants.filter(matchesProductCriteria);
        const bestScore =
          matchingVariants.length > 0
            ? Math.max(...matchingVariants.map((v) => getProductSearchScore(v)))
            : 0;
        return { group, matchingVariants, bestScore };
      })
      .filter((entry) => entry.matchingVariants.length > 0);
  }, [
    allGroups,
    activeCategory,
    selectedSubcategory,
    selectedBrand,
    stockFilter,
    priceRange,
    deferredSearchTerm,
    searchIndexById,
  ]);

  // Sort Product Groups (prioritize search relevance when searching)
  const sortedGroups = useMemo(() => {
    const hasQuery = deferredSearchTerm.trim().length > 0;
    return [...filteredGroups].sort((a, b) => {
      if (hasQuery && b.bestScore !== a.bestScore) {
        return b.bestScore - a.bestScore;
      }
      if (sortBy === 'price_asc') {
        const aPositive = a.matchingVariants.filter((v) => v.price > 0).map((v) => v.price);
        const bPositive = b.matchingVariants.filter((v) => v.price > 0).map((v) => v.price);
        const aMin = aPositive.length > 0 ? Math.min(...aPositive) : -1;
        const bMin = bPositive.length > 0 ? Math.min(...bPositive) : -1;
        if (aMin <= 0 && bMin > 0) return 1;
        if (bMin <= 0 && aMin > 0) return -1;
        return aMin - bMin;
      }
      if (sortBy === 'price_desc') {
        const aMax = Math.max(...a.matchingVariants.map((v) => v.price));
        const bMax = Math.max(...b.matchingVariants.map((v) => v.price));
        return bMax - aMax;
      }
      if (sortBy === 'name') {
        return a.group.baseName.localeCompare(b.group.baseName);
      }
      // Default popular
      if (a.group.popular && !b.group.popular) return -1;
      if (!a.group.popular && b.group.popular) return 1;
      return 0;
    });
  }, [filteredGroups, sortBy, deferredSearchTerm]);

  // Inject Google Shopping Schema.org Product ItemList JSON-LD for visible catalog items
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const origin = window.location.origin;
    const topProducts = sortedGroups
      .slice(0, 40)
      .map((entry) => entry.matchingVariants[0])
      .filter((p) => p && p.price > 0);

    const ldJson = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Minute Materials Product Catalog',
      numberOfItems: topProducts.length,
      itemListElement: topProducts.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          sku: p.sku,
          mpn: p.partCode || p.sku,
          image: p.image?.startsWith('http')
            ? p.image
            : `${origin}${p.image?.startsWith('/') ? '' : '/'}${p.image || 'logo-square.png'}`,
          brand: {
            '@type': 'Brand',
            name: p.brand || 'Minute Materials',
          },
          category: `${p.category} > ${p.subcategory}`,
          offers: {
            '@type': 'Offer',
            url: `${origin}/?q=${encodeURIComponent(p.sku || p.name)}`,
            priceCurrency: 'INR',
            price: Number(p.price).toFixed(2),
            availability:
              p.stockStatus === 'out_of_stock'
                ? 'https://schema.org/OutOfStock'
                : 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
          },
        },
      })),
    };

    let script = document.getElementById('mm-product-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'mm-product-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ldJson);
  }, [sortedGroups]);

  // Suppress unused variable warning when no typo correction is active
  void correctedSearchLabel;

  // Limit visible grouped items to 60 when viewing All Materials and no filters active
  const displayedGroups =
    activeCategory === 'all' && !hasActiveFilters && !searchTerm
      ? sortedGroups.slice(0, 60)
      : sortedGroups;

  const categoryTitle = getCategoryDisplayName(activeCategory, categories);

  return (
    <section id="product-catalog" className="w-full px-2 sm:px-4 lg:px-6 py-6 sm:py-8">
      {/* Category Bar, Filter Toggle & Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        {/* Dynamic Main Categories */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => handleCategoryClick('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition border flex items-center gap-1.5 cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {getCategoryIcon('all', 'w-3.5 h-3.5')}
            <span>All Materials</span>
          </button>

          {categories.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {getCategoryIcon(cat.id, 'w-3.5 h-3.5')}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Reduced Size Filter Toggle & Compact Sort Selector */}
        <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
          {/* Reduced size Filter Button */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 border shrink-0 ${
              isFilterOpen || hasActiveFilters
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse"></span>
            )}
          </button>

          {/* Reduced size Sort Selector */}
          <div className="flex items-center gap-1 text-[11px]">
            <ArrowUpDown className="w-3 h-3 text-slate-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'popular' | 'price_asc' | 'price_desc' | 'name')
              }
              className="bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-md px-2 py-1 focus:outline-none focus:border-amber-500"
            >
              <option value="popular">🔥 Popular</option>
              <option value="price_asc">💵 Price: Low-High</option>
              <option value="price_desc">💎 Price: High-Low</option>
              <option value="name">🔤 Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Immediate Subcategory Bar when a Main Category is selected */}
      {activeCategory !== 'all' && availableSubcategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-slate-100 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSubcategory('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
              selectedSubcategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            All {categoryTitle}
          </button>
          {availableSubcategories.map((sub) => {
            const isSubActive = selectedSubcategory.toLowerCase() === sub.toLowerCase();
            return (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubcategory(sub)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  isSubActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}

      {/* Always-accessible Filter by Brand Bar */}
      {availableBrands.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-slate-100 scrollbar-none">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
            <Tag className="w-3 h-3 text-amber-600" />
            <span>Brand:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedBrand('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer border ${
              selectedBrand === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-2xs font-extrabold'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            All Brands
          </button>
          {availableBrands.map((b) => {
            const isBrandActive = selectedBrand.toLowerCase() === b.name.toLowerCase();
            return (
              <button
                key={b.name}
                type="button"
                onClick={() => setSelectedBrand(b.name)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer border ${
                  isBrandActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-2xs font-extrabold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {b.name} <span className="opacity-70 font-mono">({b.count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category-Specific Filter Panel */}
      {isFilterOpen && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                {categoryTitle} Filter Options
              </h3>
              <span className="text-xs text-slate-500">
                · {availableBrands.length} {availableBrands.length === 1 ? 'brand' : 'brands'} ·{' '}
                {availableSubcategories.length} subcategories
              </span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-bold underline transition"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 1. Brand Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Filter by Brand:
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="all">All Brands ({availableBrands.length})</option>
                {availableBrands.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} ({b.count})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Subcategories (Tailored strictly to active category) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Select Subcategory / Type:
              </label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="all">All Subcategories ({availableSubcategories.length})</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Stock Availability */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Stock Status:
              </label>
              <select
                value={stockFilter}
                onChange={(e) =>
                  setStockFilter(e.target.value as 'all' | 'in_stock' | 'low_stock')
                }
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="all">All Items</option>
                <option value="in_stock">In Stock Only</option>
                <option value="low_stock">Low Stock Alerts</option>
              </select>
            </div>

            {/* 4. Price Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Price Filter:
              </label>
              <select
                value={priceRange}
                onChange={(e) =>
                  setPriceRange(
                    e.target.value as 'all' | 'under_50' | '50_200' | '200_500' | 'above_500'
                  )
                }
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="all">All Prices</option>
                <option value="under_50">Under ₹50</option>
                <option value="50_200">₹50 - ₹200</option>
                <option value="200_500">₹200 - ₹500</option>
                <option value="above_500">Above ₹500</option>
              </select>
            </div>
          </div>

          {/* Subcategory Pills bar */}
          {availableSubcategories.length > 0 && (
            <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">
                Quick Type:
              </span>
              <button
                onClick={() => setSelectedSubcategory('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold whitespace-nowrap transition border ${
                  selectedSubcategory === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                All
              </button>
              {availableSubcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition border ${
                    selectedSubcategory === sub
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Catalog Grid */}
      {displayedGroups.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 sm:p-12 text-center text-slate-600 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            {getCategoryIcon(activeCategory, 'w-6 h-6')}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {searchTerm || hasActiveFilters
              ? 'No materials match your current filter'
              : `No materials added in ${categoryTitle}${
                  selectedSubcategory !== 'all' ? ` · ${selectedSubcategory}` : ''
                } yet`}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || hasActiveFilters
              ? 'Try searching for broader terms or reset your selected filters.'
              : 'Browse another category or contact our dispatch helpline for immediate stock availability.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                clearAllFilters();
                if (setSearchTerm) setSearchTerm('');
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition shadow-xs cursor-pointer"
            >
              View All Materials
            </button>
            {isAdmin && onQuickEditPrice && (
              <button
                type="button"
                onClick={() => onQuickEditPrice()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                + Add Materials in Admin
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3 lg:gap-4">
          {displayedGroups.map(({ group, matchingVariants }) => {
            const hasMultipleSizes = group.variants.length > 1;
            const variantSummary = hasMultipleSizes
              ? getGroupVariantSummary(group.variants)
              : null;
            const positiveVariants = group.variants.filter((v) => v.price > 0);
            const sortedPositive = [...positiveVariants].sort((a, b) => a.price - b.price);
            const representativeWithImage = group.variants.find(
              (v) => v.image && v.image.trim() !== ''
            );

            // For single-size products, use that exact product; for multi-size, summarize starting price
            const product = hasMultipleSizes
              ? sortedPositive[0] || matchingVariants[0] || group.variants[0]
              : group.variants[0];

            const cardGalleryImages = getProductGalleryImages(
              representativeWithImage || product,
              group.variants
            );
            const displayImage = cardGalleryImages[0] || representativeWithImage?.image || product.image;
            const opensDetailPage =
              Boolean(onSelectProduct) && isDetailPageCategory(product.category, categories);
            const minPrice = sortedPositive.length > 0 ? sortedPositive[0].price : 0;
            const maxPrice =
              sortedPositive.length > 0 ? sortedPositive[sortedPositive.length - 1].price : 0;
            const hasVariedPrices =
              hasMultipleSizes &&
              (maxPrice > minPrice ||
                (positiveVariants.length > 0 && positiveVariants.length < group.variants.length));
            const allOutOfStock = group.variants.every((v) => v.stockStatus === 'out_of_stock');

            const qtyInCart = getCartQuantity(product.id);
            const isAdded = Boolean(addedIds[product.id]) && qtyInCart > 0;
            const totalGroupCartQty = hasMultipleSizes
              ? group.variants.reduce((sum, v) => sum + getCartQuantity(v.id), 0)
              : qtyInCart;

            return (
              <div
                key={group.key}
                onClick={
                  opensDetailPage
                    ? () => {
                        if (Date.now() - lastCardSwipeAtRef.current < 350) return;
                        onSelectProduct?.(product);
                      }
                    : undefined
                }
                role={opensDetailPage ? 'button' : undefined}
                tabIndex={opensDetailPage ? 0 : undefined}
                onKeyDown={
                  opensDetailPage
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectProduct?.(product);
                        }
                      }
                    : undefined
                }
                className={`bg-white border border-slate-200/60 hover:border-amber-400/80 rounded-xl p-1.5 sm:p-2.5 flex flex-col justify-between transition duration-200 hover:shadow-md relative group shadow-sm ${
                  opensDetailPage ? 'cursor-pointer' : ''
                }`}
              >
                {/* Product Header */}
                <div>
                  <div className="relative mb-1.5 sm:mb-2 bg-slate-50 rounded-lg overflow-hidden aspect-square flex items-center justify-center border border-slate-200/40">
                    {cardGalleryImages.length > 0 ? (
                      <CatalogCardAutoImage
                        images={cardGalleryImages}
                        alt={hasMultipleSizes ? group.baseName : product.name}
                        onUserSwipe={() => {
                          lastCardSwipeAtRef.current = Date.now();
                        }}
                      />
                    ) : displayImage && displayImage.trim() !== '' ? (
                      <img
                        src={displayImage}
                        alt={hasMultipleSizes ? group.baseName : product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1 sm:p-2 text-center">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-0.5 text-amber-600 shadow-sm">
                          {getCategoryIcon(product.category, 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          {getCategoryDisplayName(product.category, categories)}
                        </span>
                      </div>
                    )}

                    {/* Trade Favorite Badge */}
                    {(group.popular || product.popular) && (
                      <div className="absolute top-1 left-1 flex flex-col gap-1 pointer-events-none">
                        <span className="bg-amber-500 text-slate-950 text-[6px] sm:text-[8px] font-extrabold uppercase px-1 sm:px-1.5 py-0.5 rounded shadow">
                          ★ Favorite
                        </span>
                      </div>
                    )}

                    {/* Multi-Size / Multi-Colour Count & Total In-Cart Indicator */}
                    {hasMultipleSizes && variantSummary && (
                      <div className="absolute bottom-1 inset-x-1 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="bg-slate-800/80 text-white text-[7px] sm:text-[8px] font-bold px-1 sm:px-1.5 py-0.5 rounded">
                          {variantSummary.badgeLabel}
                        </span>
                        {totalGroupCartQty > 0 && (
                          <span className="bg-emerald-600 text-white text-[7px] sm:text-[8px] font-extrabold px-1 sm:px-1.5 py-0.5 rounded shadow-xs">
                            {totalGroupCartQty} in cart
                          </span>
                        )}
                      </div>
                    )}

                    {/* Admin Quick Edit & Remove Item Triggers */}
                    {isAdmin && (
                      <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
                        {hasMultipleSizes ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSizeGroupKey(group.key);
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-1 rounded shadow font-bold text-xs flex items-center gap-1 transition"
                            title={`Manage sizes for ${group.baseName}`}
                          >
                            <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span className="text-[8px] font-bold hidden sm:inline">Sizes</span>
                          </button>
                        ) : (
                          <>
                            {onQuickEditPrice && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickEditPrice(product);
                                }}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-1 rounded shadow font-bold text-xs flex items-center gap-1 transition"
                                title={`Edit ${product.name}`}
                              >
                                <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span className="text-[8px] font-bold hidden sm:inline">Edit</span>
                              </button>
                            )}
                            {onDeleteProduct && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCatalogProductToDelete(product);
                                }}
                                className="bg-rose-600 hover:bg-rose-500 text-white p-1 rounded shadow font-bold text-xs flex items-center gap-1 transition"
                                title={`Remove ${product.name}`}
                              >
                                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span className="text-[8px] font-bold hidden sm:inline">Remove</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[7px] sm:text-[9px] uppercase tracking-wider font-extrabold text-amber-600 block truncate">
                        {getCategoryDisplayName(product.category, categories)}{' '}
                        {product.subcategory ? `· ${product.subcategory}` : ''}
                      </span>
                      {product.brand && (
                        <span className="text-[7px] sm:text-[8px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded shrink-0 uppercase tracking-wide max-w-[45%] truncate">
                          {product.brand}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-[10px] sm:text-xs text-slate-900 leading-tight sm:leading-snug line-clamp-2 min-h-[1.75rem] sm:min-h-[2rem]">
                      {hasMultipleSizes ? group.baseName : product.name}
                    </h3>

                    {/* Description if present (visible on tablet/desktop, hidden for Fans cards before opening details) */}
                    {product.description && (product.category || '').toLowerCase() !== 'fans' && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed hidden md:block">
                        {product.description}
                      </p>
                    )}

                    {/* Admin Only Info: HSN Code & Part Code for single-size items */}
                    {isAdmin && !hasMultipleSizes && (product.hsnCode || product.partCode) && (
                      <div className="mt-1 pt-1 border-t border-slate-200 text-[7px] sm:text-[8px] text-amber-700 font-mono flex flex-wrap gap-x-1">
                        {product.hsnCode && <span>HSN: {product.hsnCode}</span>}
                        {product.partCode && <span>Part: {product.partCode}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & Action Row */}
                <div className="mt-1.5 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5 sm:gap-2">
                  {/* Price Stack */}
                  <div className="flex flex-col justify-center min-w-0">
                    {(hasMultipleSizes ? minPrice > 0 : product.price > 0) ? (
                      <>
                        {/* Line 1: Selling Price (or Starting Price for multi-size) */}
                        <div className="flex items-baseline gap-0.5 sm:gap-1 flex-wrap">
                          {hasVariedPrices && (
                            <span className="text-[7px] sm:text-[9px] font-semibold text-slate-500">
                              From
                            </span>
                          )}
                          <span className="text-xs sm:text-base font-black font-mono tabular-nums text-slate-900 leading-none">
                            ₹{(hasMultipleSizes ? minPrice : product.price).toFixed(2)}
                          </span>
                          <span className="text-[8px] sm:text-[10px] text-slate-500 font-semibold">
                            /{product.unit}
                          </span>
                        </div>

                        {/* Line 2: Size / Colour availability or MRP/Discount */}
                        <div className="flex items-center gap-1 mt-0.5 sm:mt-1 flex-wrap">
                          {hasMultipleSizes && variantSummary ? (
                            <span className="text-[7px] sm:text-[9px] text-slate-500 font-medium">
                              {variantSummary.availabilityLabel}
                            </span>
                          ) : product.originalPrice && product.originalPrice > product.price ? (
                            <>
                              <span className="text-[8px] sm:text-[10px] text-slate-400 line-through font-mono tabular-nums">
                                ₹{product.originalPrice.toFixed(2)}
                              </span>
                              <span className="text-[7px] sm:text-[8px] font-extrabold text-emerald-700">
                                {Math.round(
                                  ((product.originalPrice - product.price) /
                                    product.originalPrice) *
                                    100
                                )}
                                % OFF
                              </span>
                            </>
                          ) : (
                            <span className="text-[7px] sm:text-[8px] text-slate-400 font-medium">
                              MRP / {product.unit === 'meter' ? 'mtr' : 'Pc'}
                            </span>
                          )}

                          {!hasMultipleSizes && product.stockStatus !== 'in_stock' && (
                            <span
                              className={`text-[7px] sm:text-[8px] font-bold ${
                                product.stockStatus === 'low_stock'
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              · {product.stockStatus === 'low_stock' ? 'Low' : 'Out'}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] sm:text-xs font-extrabold text-amber-700 leading-none">
                            Ask Price
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                          <span className="text-[7px] sm:text-[8px] text-slate-400 font-medium">
                            {hasMultipleSizes && variantSummary
                              ? variantSummary.quoteAvailabilityLabel
                              : 'Quote on Request'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Add to Cart / Select Size / Quantity Count Button */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {hasMultipleSizes ? (
                      <button
                        type="button"
                        onClick={() => setActiveSizeGroupKey(group.key)}
                        disabled={allOutOfStock}
                        className={`w-full sm:w-auto py-1 sm:py-1.5 px-1.5 sm:px-3 rounded-lg text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 sm:gap-1.5 transition shadow-sm ${
                          allOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : totalGroupCartQty > 0
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 active:scale-95'
                            : minPrice <= 0
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 active:scale-95'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                        }`}
                      >
                        {minPrice <= 0 && totalGroupCartQty === 0 ? (
                          <>
                            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>Quote</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                            <span>
                              {totalGroupCartQty > 0
                                ? `${totalGroupCartQty} · ${variantSummary?.buttonSuffix || 'Sizes'}`
                                : '+ Add'}
                            </span>
                          </>
                        )}
                      </button>
                    ) : product.price <= 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpenWhatsAppForProduct(product)}
                        className="w-full sm:w-auto py-1 sm:py-1.5 px-1.5 sm:px-3 rounded-lg text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 sm:gap-1.5 transition shadow-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 active:scale-95"
                      >
                        <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Quote</span>
                      </button>
                    ) : qtyInCart > 0 ? (
                      /* Quantity Counter Stepper Button when single-size item is in cart */
                      <div className="flex items-center justify-between w-full sm:w-auto bg-amber-50 text-slate-900 rounded-lg p-0.5 shadow-xs border border-amber-300">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity
                              ? onUpdateQuantity(product.id, -1)
                              : onAddToCart(product, -1)
                          }
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center font-extrabold text-xs transition"
                          title="Decrease item count in cart"
                        >
                          <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                        </button>
                        <span className="px-1 sm:px-2 font-black font-mono tabular-nums text-[10px] sm:text-xs text-slate-900 min-w-[18px] sm:min-w-[22px] text-center">
                          {qtyInCart}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddToCart(product, 1)}
                          disabled={product.stockStatus === 'out_of_stock'}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-xs transition disabled:opacity-40"
                          title="Increase item count in cart"
                        >
                          <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      /* Default Add to Cart Button for single-size item */
                      <button
                        type="button"
                        onClick={() => handleAddWithFeedback(product)}
                        disabled={product.stockStatus === 'out_of_stock'}
                        className={`w-full sm:w-auto py-1 sm:py-1.5 px-1.5 sm:px-3 rounded-lg text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 sm:gap-1.5 transition shadow-sm ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : product.stockStatus === 'out_of_stock'
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                        }`}
                      >
                        {isAdded ? (
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        ) : (
                          <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                        )}
                        <span>{isAdded ? 'Added' : '+ Add'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Size Prompt Modal (opened when clicking + Add on multi-size products) */}
      {(() => {
        if (!activeSizeGroupKey) return null;
        const foundFiltered = filteredGroups.find((e) => e.group.key === activeSizeGroupKey);
        const targetGroup =
          foundFiltered?.group || allGroups.find((g) => g.key === activeSizeGroupKey) || null;
        if (!targetGroup) return null;

        const hasNarrowedMatches =
          Boolean(searchTerm.trim() || hasActiveFilters) &&
          foundFiltered &&
          foundFiltered.matchingVariants.length > 0 &&
          foundFiltered.matchingVariants.length < targetGroup.variants.length;

        const highlightedIds = hasNarrowedMatches
          ? new Set(foundFiltered.matchingVariants.map((v) => v.id))
          : undefined;

        return (
          <SizeSelectorModal
            group={targetGroup}
            onClose={() => setActiveSizeGroupKey(null)}
            cartItems={cartItems}
            onAddToCart={onAddToCart}
            onUpdateQuantity={onUpdateQuantity}
            onOpenWhatsAppForProduct={onOpenWhatsAppForProduct}
            highlightedVariantIds={highlightedIds}
            isAdmin={isAdmin}
            onQuickEditPrice={onQuickEditPrice}
            categories={categories}
            onRequestDeleteProduct={
              onDeleteProduct ? (variant) => setCatalogProductToDelete(variant) : undefined
            }
          />
        );
      })()}

      {/* Admin Delete Item Confirmation Modal */}
      {catalogProductToDelete && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4 animate-scale-up">
            <button
              type="button"
              onClick={() => setCatalogProductToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Remove Item from Catalog?
                </h3>
                <p className="text-xs text-rose-600 font-semibold">Admin Live Deletion</p>
              </div>
            </div>

            {/* Product Summary */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
              {catalogProductToDelete.image && catalogProductToDelete.image.trim() !== '' ? (
                <img
                  src={catalogProductToDelete.image}
                  alt={catalogProductToDelete.name}
                  className="w-12 h-12 rounded-lg object-cover bg-white shrink-0 border border-slate-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white shrink-0 border border-slate-200 flex items-center justify-center text-amber-600">
                  {getCategoryIcon(catalogProductToDelete.category, 'w-5 h-5')}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-slate-900 truncate">
                  {catalogProductToDelete.name}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  SKU: {catalogProductToDelete.sku} · ₹{catalogProductToDelete.price.toFixed(2)}/
                  {catalogProductToDelete.unit}
                </p>
                <p className="text-[10px] text-amber-600 uppercase font-bold">
                  {getCategoryDisplayName(catalogProductToDelete.category, categories)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this material variant from the live
              catalog?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatalogProductToDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProduct) {
                    onDeleteProduct(catalogProductToDelete.id);
                  }
                  setCatalogProductToDelete(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-black transition shadow-lg flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Remove Item
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
