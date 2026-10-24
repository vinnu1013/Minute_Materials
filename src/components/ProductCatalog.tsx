import React, { useState } from 'react';
import { Product, ProductCategory, CartItem } from '../types';
import { ShoppingCart, MessageSquare, Check, ArrowUpDown, Filter, Edit2, Plus, Minus, Trash2, AlertTriangle, X } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  cartItems?: CartItem[];
  onOpenWhatsAppForProduct: (product: Product) => void;
  searchTerm: string;
  setSearchTerm?: (term: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  isAdmin: boolean;
  onQuickEditPrice?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onAddToCart,
  onUpdateQuantity,
  cartItems = [],
  onOpenWhatsAppForProduct,
  searchTerm,
  setSearchTerm,
  activeCategory,
  setActiveCategory,
  isAdmin,
  onQuickEditPrice,
  onDeleteProduct
}) => {
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'name'>('popular');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [catalogProductToDelete, setCatalogProductToDelete] = useState<Product | null>(null);

  const getCartQuantity = (productId: string) => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    const item = cartItems.find(i => i && i.product && i.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Category-specific Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [priceRange, setPriceRange] = useState<'all' | 'under_50' | '50_200' | '200_500' | 'above_500'>('all');

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    if (setSearchTerm) {
      setSearchTerm('');
    }
    setSelectedSubcategory('all');
  };

  const handleAddWithFeedback = (product: Product) => {
    onAddToCart(product, 1);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 5000);
  };

  // Dynamically extract available subcategories for the ACTIVE CATEGORY ONLY
  const categoryProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  const availableSubcategories = Array.from(
    new Set(categoryProducts.map(p => p.subcategory).filter(Boolean))
  ).sort();

  // Reset selectedSubcategory if activeCategory changes and current subcategory is not in new list
  React.useEffect(() => {
    if (selectedSubcategory !== 'all' && !availableSubcategories.includes(selectedSubcategory)) {
      setSelectedSubcategory('all');
    }
  }, [activeCategory, availableSubcategories, selectedSubcategory]);

  const hasActiveFilters = selectedSubcategory !== 'all' || stockFilter !== 'all' || priceRange !== 'all';

  const clearAllFilters = () => {
    setSelectedSubcategory('all');
    setStockFilter('all');
    setPriceRange('all');
  };

  // Filter Products
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSubcategory = selectedSubcategory === 'all' || product.subcategory === selectedSubcategory;
    
    const matchesStock = stockFilter === 'all' || 
      (stockFilter === 'in_stock' && product.stockStatus === 'in_stock') ||
      (stockFilter === 'low_stock' && product.stockStatus === 'low_stock');

    let matchesPrice = true;
    if (priceRange === 'under_50') matchesPrice = product.price < 50;
    else if (priceRange === '50_200') matchesPrice = product.price >= 50 && product.price <= 200;
    else if (priceRange === '200_500') matchesPrice = product.price > 200 && product.price <= 500;
    else if (priceRange === 'above_500') matchesPrice = product.price > 500;

    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.subcategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSubcategory && matchesStock && matchesPrice && matchesSearch;
  });

  // Sort Products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    // Default popular
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return 0;
  });

  // Limit visible items to 48 when viewing All Materials and no filters active
  const displayedProducts = activeCategory === 'all' && !hasActiveFilters && !searchTerm ? sortedProducts.slice(0, 48) : sortedProducts;

  const categoryTitle = activeCategory === 'plumbing' 
    ? '💧 Plumbing' 
    : activeCategory === 'electrical' 
    ? '⚡ Electrical' 
    : activeCategory === 'tools' 
    ? '🔧 Tools & Testers' 
    : '📦 All Materials';

  return (
    <section id="product-catalog" className="w-full px-2 sm:px-4 lg:px-6 py-6 sm:py-8">
      
      {/* Category Bar, Filter Toggle & Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        
        {/* Categories */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => handleCategoryClick('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
              activeCategory === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            All Materials
          </button>

          <button
            onClick={() => handleCategoryClick('plumbing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
              activeCategory === 'plumbing'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            💧 Plumbing
          </button>

          <button
            onClick={() => handleCategoryClick('electrical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
              activeCategory === 'electrical'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            ⚡ Electrical
          </button>

          <button
            onClick={() => handleCategoryClick('tools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
              activeCategory === 'tools'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            🔧 Tools & Testers
          </button>

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
              onChange={(e: any) => setSortBy(e.target.value)}
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



      {/* Category-Specific Filter Panel */}
      {isFilterOpen && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                {categoryTitle} Filter Options
              </h3>
              <span className="text-[10px] text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                {availableSubcategories.length} item types available
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* 1. Subcategories (Tailored strictly to active category) */}
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

            {/* 2. Stock Availability */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Stock Status:
              </label>
              <select
                value={stockFilter}
                onChange={(e: any) => setStockFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="all">All Items</option>
                <option value="in_stock">In Stock Only</option>
                <option value="low_stock">Low Stock Alerts</option>
              </select>
            </div>

            {/* 3. Price Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Price Filter:
              </label>
              <select
                value={priceRange}
                onChange={(e: any) => setPriceRange(e.target.value)}
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
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Quick Type:</span>
              <button
                onClick={() => setSelectedSubcategory('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold whitespace-nowrap transition ${
                  selectedSubcategory === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {availableSubcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition ${
                    selectedSubcategory === sub
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
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
      {displayedProducts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center text-slate-400 space-y-3">
          <Filter className="w-10 h-10 sm:w-12 sm:h-12 mx-auto stroke-1 opacity-40 text-amber-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">No materials match your search filter</h3>
          <p className="text-xs text-slate-500">Try searching for broader terms like "pipe", "wire", "elbow", "breaker", or clear filters.</p>
          <button
            onClick={() => {
              setActiveCategory('all');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-4 py-2 rounded-lg text-xs mt-2"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3 lg:gap-4">
          {displayedProducts.map((product) => {
            const isAdded = addedIds[product.id];
            const qtyInCart = getCartQuantity(product.id);

            return (
              <div
                key={product.id}
                className="bg-white border border-slate-200/60 hover:border-amber-400/80 rounded-xl p-1.5 sm:p-2.5 flex flex-col justify-between transition duration-200 hover:shadow-md relative group shadow-sm"
              >
                {/* Product Header Badge */}
                <div>
                  <div className="relative mb-1.5 sm:mb-2 bg-slate-50 rounded-lg overflow-hidden aspect-square flex items-center justify-center border border-slate-200/40">
                    {product.image && product.image.trim() !== '' ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1 sm:p-2 text-center">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-0.5 text-amber-500 text-xs sm:text-sm shadow-sm">
                          {product.category === 'plumbing' ? '💧' : product.category === 'electrical' ? '⚡' : '🔧'}
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          {product.category}
                        </span>
                      </div>
                    )}

                    {/* Trade Favorite Badge (ONLY if set by Admin) */}
                    {product.popular && (
                      <div className="absolute top-1 left-1 flex flex-col gap-1">
                        <span className="bg-amber-500 text-slate-950 text-[6px] sm:text-[8px] font-extrabold uppercase px-1 sm:px-1.5 py-0.5 rounded shadow">
                          ★ Favorite
                        </span>
                      </div>
                    )}

                    {/* Admin Quick Edit & Remove Item Triggers */}
                    {isAdmin && (
                      <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
                        {onQuickEditPrice && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickEditPrice(product);
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-1 rounded shadow font-bold text-xs flex items-center gap-1 transition"
                            title="Edit Price & Stock"
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
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    <span className="text-[7px] sm:text-[9px] uppercase tracking-wider font-extrabold text-amber-600 block truncate">
                      {product.category} {product.subcategory ? `• ${product.subcategory}` : ''}
                    </span>
                    <h3 className="font-bold text-[10px] sm:text-xs text-slate-900 leading-tight sm:leading-snug line-clamp-2 min-h-[1.75rem] sm:min-h-[2rem]">
                      {product.name}
                    </h3>

                    {/* Description if present (visible on tablet/desktop) */}
                    {product.description && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed hidden md:block">
                        {product.description}
                      </p>
                    )}

                    {/* Admin Only Info: HSN Code & Part Code */}
                    {isAdmin && (product.hsnCode || product.partCode) && (
                      <div className="mt-1 pt-1 border-t border-slate-200 text-[7px] sm:text-[8px] text-amber-700 font-mono flex flex-wrap gap-x-1">
                        {product.hsnCode && <span>HSN: {product.hsnCode}</span>}
                        {product.partCode && <span>Part: {product.partCode}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & Action Row (Price Stack + Cart Button in same row for desktop/laptop) */}
                <div className="mt-1.5 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5 sm:gap-2">
                  
                  {/* Price Stack: Discounted Selling Price ABOVE Actual MRP Price */}
                  <div className="flex flex-col justify-center min-w-0">
                    {/* Line 1 (ABOVE): Discounted Selling Price */}
                    <div className="flex items-baseline gap-0.5 sm:gap-1 flex-wrap">
                      <span className="text-xs sm:text-base font-black font-mono text-slate-900 leading-none">
                        ₹{product.price.toFixed(2)}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-slate-500 font-semibold">
                        /{product.unit}
                      </span>
                    </div>

                    {/* Line 2 (BELOW): Actual MRP Price & Savings badge */}
                    <div className="flex items-center gap-1 mt-0.5 sm:mt-1 flex-wrap">
                      {product.originalPrice && product.originalPrice > product.price ? (
                        <>
                          <span className="text-[8px] sm:text-[10px] text-slate-400 line-through font-mono">
                            ₹{product.originalPrice.toFixed(2)}
                          </span>
                          <span className="text-[7px] sm:text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                          </span>
                        </>
                      ) : (
                        <span className="text-[7px] sm:text-[8px] text-slate-400 font-medium">
                          Best Price
                        </span>
                      )}

                      {product.stockStatus !== 'in_stock' && (
                        <span className={`text-[7px] sm:text-[8px] font-bold px-1 py-0.2 rounded border ${
                          product.stockStatus === 'low_stock'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          {product.stockStatus === 'low_stock' ? 'Low' : 'Out'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add to Cart / Quantity Count Button */}
                  <div className="shrink-0">
                    {qtyInCart > 0 ? (
                      /* Quantity Counter Stepper Button when item is in cart */
                      <div className="flex items-center justify-between w-full sm:w-auto bg-slate-950 text-white rounded-lg p-0.5 shadow-sm border border-slate-800">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity ? onUpdateQuantity(product.id, -1) : onAddToCart(product, -1)}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 flex items-center justify-center font-extrabold text-xs transition"
                          title="Decrease item count in cart"
                        >
                          <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                        </button>
                        <span className="px-1 sm:px-2 font-black font-mono text-[10px] sm:text-xs text-amber-400 min-w-[18px] sm:min-w-[22px] text-center">
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
                      /* Default Add to Cart Button */
                      <button
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
                        {isAdded ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />}
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

      {/* Admin Delete Item Confirmation Modal */}
      {catalogProductToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative space-y-4 animate-scale-up">
            <button
              type="button"
              onClick={() => setCatalogProductToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Remove Item from Catalog?</h3>
                <p className="text-xs text-rose-300">Admin Live Deletion</p>
              </div>
            </div>

            {/* Product Summary */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <img
                src={catalogProductToDelete.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'}
                alt={catalogProductToDelete.name}
                className="w-12 h-12 rounded-lg object-cover bg-white shrink-0 border border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-white truncate">{catalogProductToDelete.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">SKU: {catalogProductToDelete.sku} • ₹{catalogProductToDelete.price.toFixed(2)}/{catalogProductToDelete.unit}</p>
                <p className="text-[10px] text-amber-400 uppercase font-bold">{catalogProductToDelete.category}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this unwanted material item from the live catalog?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatalogProductToDelete(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition"
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
