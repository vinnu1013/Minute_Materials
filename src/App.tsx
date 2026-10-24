import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { ProductCatalog } from './components/ProductCatalog';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { PhoneBookingModal } from './components/PhoneBookingModal';
import { ImageBookingModal } from './components/ImageBookingModal';
import { WhatsAppBookingModal } from './components/WhatsAppBookingModal';
import { AdminPanel } from './components/AdminPanel';
import { PriceDropModal } from './components/PriceDropModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { DeliveryAreasModal } from './components/DeliveryAreasModal';
import { CompanyPages, CompanyPageId } from './components/CompanyPages';
import { Helmet } from 'react-helmet-async';

import { Product, CartItem, Booking, StoreSettings } from './types';
import { INITIAL_PRODUCTS, INITIAL_STORE_SETTINGS } from './data/initialProducts';
import { fetchCurrentLocationAddress } from './utils/distance';
import { ShoppingCart } from 'lucide-react';

function resolvePageFromPath(pathname: string): CompanyPageId {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (clean === '/about' || clean === '/about-us') return 'about';
  if (clean === '/categories') return 'categories';
  if (clean === '/blog') return 'blog';
  if (clean === '/faqs' || clean === '/faq') return 'faqs';
  if (clean === '/contact' || clean === '/contact-us') return 'contact';
  return 'home';
}

const PAGE_PATHS: Record<CompanyPageId, string> = {
  home: '/',
  about: '/about',
  categories: '/categories',
  blog: '/blog',
  faqs: '/faqs',
  contact: '/contact',
};

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('instant_supply_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('instant_supply_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.adminPin !== '9059236500') {
          parsed.adminPin = '9059236500';
        }
        if (parsed.helplineNumber === '9059236500') {
          parsed.helplineNumber = '8332869926';
        }
        if (parsed.whatsappNumber === '9059236500') {
          parsed.whatsappNumber = '8332869926';
        }
        if (parsed.activeDeliveryNotice && parsed.activeDeliveryNotice.includes('9059236500')) {
          parsed.activeDeliveryNotice = parsed.activeDeliveryNotice.replace(/9059236500/g, '8332869926');
        }
        parsed.gstPercentage = 0;
        return { ...INITIAL_STORE_SETTINGS, ...parsed };
      }
      return INITIAL_STORE_SETTINGS;
    } catch {
      return INITIAL_STORE_SETTINGS;
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem('instant_supply_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal Visibility States
  const [isPriceDropOpen, setIsPriceDropOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [deliveryAddress, setDeliveryAddress] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('instant_supply_delivery_address');
      if (saved) return saved;
    } catch {}
    return 'LB Nagar Ring Road Junction, Hyderabad';
  });

  useEffect(() => {
    try {
      if (deliveryAddress) {
        localStorage.setItem('instant_supply_delivery_address', deliveryAddress);
      }
    } catch {}
  }, [deliveryAddress]);

  // Auto-fetch current GPS location on app load
  useEffect(() => {
    fetchCurrentLocationAddress()
      .then(loc => {
        if (loc && loc.address) {
          setDeliveryAddress(loc.address);
        }
      })
      .catch(err => {
        console.warn('Auto GPS location fetch notice on app launch:', err);
      });
  }, []);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('instant_supply_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item && item.product && item.product.id && typeof item.quantity === 'number' && item.quantity > 0);
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCartAnimating, setIsCartAnimating] = useState(false);
  const cartAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeBookingModal, setActiveBookingModal] = useState<
    'cart_delivery' | 'phone_callback' | 'image_upload' | 'whatsapp_order' | null
  >(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  
  // Lock body scroll whenever ANY modal or overlay is open (phone, whatsapp, image scan, cart, checkout, etc)
  const isAnyModalActive = Boolean(
    isCartOpen ||
    isCheckoutOpen ||
    activeBookingModal ||
    isPriceDropOpen
  );

  useEffect(() => {
    if (isAnyModalActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalActive]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activePage, setActivePage] = useState<CompanyPageId>(() => {
    if (typeof window === 'undefined') return 'home';
    return resolvePageFromPath(window.location.pathname);
  });

  const handleNavigatePage = (page: CompanyPageId, skipScroll = false) => {
    setActivePage(page);
    if (isAdmin) {
      setIsAdmin(false);
    }
    if (typeof window !== 'undefined') {
      const targetPath = PAGE_PATHS[page];
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      if (!skipScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Check URL route for /admin and Company subpages
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      
      if (
        path.endsWith('/admin') ||
        path.endsWith('/admin/') ||
        path === '/admin' ||
        hash === '#admin' ||
        hash === '#/admin' ||
        search.includes('admin=true')
      ) {
        setShowAdminPinModal(true);
        return;
      }

      setActivePage(resolvePageFromPath(window.location.pathname));
    };

    syncRouteFromUrl();

    window.addEventListener('popstate', syncRouteFromUrl);
    window.addEventListener('hashchange', syncRouteFromUrl);
    return () => {
      window.removeEventListener('popstate', syncRouteFromUrl);
      window.removeEventListener('hashchange', syncRouteFromUrl);
    };
  }, []);

  // Handle Search submit
  const handleSearchSubmit = (term: string) => {
    setSearchTerm(term);
    if (term.trim() && activePage !== 'home') {
      handleNavigatePage('home', true);
    }
  };

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('instant_supply_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // Sync bookings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('instant_supply_bookings', JSON.stringify(bookings));
    } catch (e) {
      console.error('Failed to save bookings to localStorage', e);
    }
  }, [bookings]);

  // Sync store settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('instant_supply_settings', JSON.stringify(storeSettings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }, [storeSettings]);

  // Sync products to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('instant_supply_products', JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products to localStorage', e);
    }
  }, [products]);

  // Fetch live products, settings, and bookings from Express backend
  const fetchData = async () => {
    try {
      const [prodRes, settingsRes, bookingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/store-settings'),
        fetch('/api/bookings')
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData) && prodData.length > 0) {
          setProducts(prodData);
        }
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setStoreSettings(settingsData);
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        if (Array.isArray(bookingsData)) {
          setBookings(bookingsData);
        }
      }
    } catch (e) {
      console.warn('API sync fallback to local initial state:', e);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto refresh data every 15 seconds for customer views, but pause polling while in admin mode to protect active edits
    const interval = setInterval(() => {
      if (!isAdmin) {
        fetchData();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Count active price drop deals
  const priceDropCount = products.filter(p => p.originalPrice && p.originalPrice > p.price).length;

  // Cart operations
  const handleAddToCart = (product: Product, quantity = 1) => {
    if (!product || !product.id || product.id.startsWith('custom-')) {
      alert('Only catalog-listed products can be added to the cart.');
      return;
    }

    setIsCartAnimating(true);
    if (cartAnimationTimeoutRef.current) clearTimeout(cartAnimationTimeoutRef.current);
    cartAnimationTimeoutRef.current = setTimeout(() => {
      setIsCartAnimating(false);
    }, 5000);

    setCart(prev => {
      const existing = prev.find(item => item && item.product && item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item && item.product && item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item && item.product && item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item && item.product && item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Open booking modal
  const handleOpenBookingMode = (mode: 'cart_delivery' | 'phone_callback' | 'image_upload' | 'whatsapp_order') => {
    if (mode === 'cart_delivery') {
      setIsCartOpen(true);
    } else {
      setActiveBookingModal(mode);
    }
  };

  // Quick WhatsApp for individual product
  const handleOpenWhatsAppForProduct = (product: Product) => {
    const text = `Hi Minute Materials, I need an urgent quote & express delivery for: ${product.name} (SKU: ${product.sku}, ₹${product.price.toFixed(2)}/${product.unit}). Please confirm stock & dispatch time!`;
    const cleanPhone = (storeSettings.whatsappNumber || '8332869926').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Admin Operations
  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      try {
        localStorage.setItem('instant_supply_products', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    try {
      const res = await fetch(`/api/products/${updatedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.product) {
          setProducts(prev => prev.map(p => p.id === data.product.id ? data.product : p));
        }
      }
    } catch (e) {
      console.error('Failed to update product via API:', e);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setProducts(prev => {
      const next = prev.filter(p => p.id !== productId);
      try {
        localStorage.setItem('instant_supply_products', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    setCart(prev => prev.filter(item => item.product.id !== productId));

    try {
      await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete product via API:', e);
    }
  };

  const handleAddProduct = async (newProductData: Partial<Product>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProductData)
      });
      const data = await res.json();
      if (res.ok && data.product) {
        setProducts(prev => {
          const next = [data.product, ...prev];
          try {
            localStorage.setItem('instant_supply_products', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to create product via API:', e);
    }
  };

  const handleBulkUpdatePrices = async (category: string, percentageChange: number) => {
    const factor = 1 + percentageChange / 100;
    setProducts(prev => {
      const next = prev.map(p => {
        if (category === 'all' || p.category === category) {
          const newPrice = Math.round(p.price * factor * 100) / 100;
          return { ...p, originalPrice: p.price, price: Math.max(0.5, newPrice) };
        }
        return p;
      });
      try {
        localStorage.setItem('instant_supply_products', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    try {
      const res = await fetch('/api/products/bulk-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, percentageChange, roundToNearestQuarter: false })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products)) {
          setProducts(data.products);
          try {
            localStorage.setItem('instant_supply_products', JSON.stringify(data.products));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Failed bulk price update:', e);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    setBookings(prev => {
      const next = prev.map(b => b.id === bookingId ? { ...b, status } : b);
      try {
        localStorage.setItem('instant_supply_bookings', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (e) {
      console.error('Failed to update booking status:', e);
    }
  };

  const handleUpdateStoreSettings = async (newSettings: Partial<StoreSettings>) => {
    setStoreSettings(prev => {
      const next = { ...prev, ...newSettings };
      try {
        localStorage.setItem('instant_supply_settings', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    try {
      const res = await fetch('/api/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setStoreSettings(data.settings);
          try {
            localStorage.setItem('instant_supply_settings', JSON.stringify(data.settings));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Failed to update store settings:', e);
    }
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + (item?.quantity || 0), 0);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://minutematerials.com';
  const canonicalUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://minutematerials.com';

  const companyTitles: Record<Exclude<CompanyPageId, 'home'>, string> = {
    about: 'About Us - Minute Materials (15-30 Min Jobsite Supply)',
    categories: 'Material Categories - Minute Materials Hyderabad',
    blog: 'Contractor Blog & Sizing Guides - Minute Materials',
    faqs: 'FAQs - Minute Materials Express Delivery',
    contact: 'Contact Us & Hub Location - Minute Materials',
  };

  const pageTitle = activePage !== 'home'
    ? companyTitles[activePage]
    : activeCategory && activeCategory !== 'all'
    ? `Minute Materials - ${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Supplies (15-30 Min Site Delivery)`
    : 'Minute Materials - Express Jobsite Electrical & Plumbing Supply';

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 pb-20 md:pb-0">
      
      {/* React Helmet Document Head Management */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="Minute Materials delivers wholesale plumbing, electrical, and hardware supplies to active construction sites in 15-30 minutes across Hyderabad. Order via AI slip scan, WhatsApp, call, or online cart."
        />
        <meta
          name="keywords"
          content="Minute Materials, plumbing materials delivery, electrical supplies online, Hyderabad jobsite express delivery, CPVC pipes fittings, copper wires switches, rapid contractor supply"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Minute Materials" />
        <link rel="canonical" href={canonicalUrl} />

        {/* OpenGraph / Facebook Social Sharing Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Minute Materials" />
        <meta property="og:title" content={pageTitle} />
        <meta
          property="og:description"
          content="Urgent material shortage on site? Minute Materials delivers wholesale plumbing, electrical, and hardware supplies in 15-30 mins direct to your jobsite."
        />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={`${currentOrigin}/Logo.jpg`} />
        <meta property="og:image:alt" content="Minute Materials - Rapid Jobsite Supply Network" />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter / X Social Sharing Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta
          name="twitter:description"
          content="Urgent material shortage on site? We deliver genuine ISI plumbing & electrical supplies in 15-30 mins across Hyderabad."
        />
        <meta name="twitter:image" content={`${currentOrigin}/Logo.jpg`} />

        {/* Schema.org Structured Data (JSON-LD) for Search Discovery */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HardwareStore",
            "name": "Minute Materials",
            "url": canonicalUrl,
            "logo": `${currentOrigin}/Logo.jpg`,
            "description": "Minute Materials provides rapid 15-30 minute jobsite delivery for plumbing, electrical, and hardware materials across Hyderabad.",
            "telephone": storeSettings.helplineNumber || "+918332869926",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": storeSettings.depotAddress || "Chinthalkunta / LB Nagar Ring Road",
              "addressLocality": "Hyderabad",
              "addressRegion": "Telangana",
              "postalCode": "500074",
              "addressCountry": "IN"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": storeSettings.depotLat || 17.3480,
              "longitude": storeSettings.depotLng || 78.5510
            },
            "openingHoursSpecification": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": [
                "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
              ],
              "opens": "06:00",
              "closes": "23:00"
            },
            "priceRange": "₹₹"
          })}
        </script>
      </Helmet>

      {/* Main Top Header */}
      <div>
        <Header
          storeSettings={storeSettings}
          cartCount={cartTotalItems}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenBookingMode={handleOpenBookingMode}
          isAdmin={isAdmin}
          onToggleAdmin={() => setIsAdmin(prev => !prev)}
          searchTerm={searchTerm}
          setSearchTerm={handleSearchSubmit}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          showPinModal={showAdminPinModal}
          setShowPinModal={setShowAdminPinModal}
          onNavigateHome={() => {
            setActiveCategory('all');
            setSearchTerm('');
            handleNavigatePage('home');
          }}
        />

        {/* ADMIN DASHBOARD VIEW (If Admin Active) */}
        {isAdmin ? (
          <AdminPanel
            products={products}
            bookings={bookings}
            storeSettings={storeSettings}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddProduct={handleAddProduct}
            onBulkUpdatePrices={handleBulkUpdatePrices}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onUpdateStoreSettings={handleUpdateStoreSettings}
            onCloseAdmin={() => {
              setIsAdmin(false);
              if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', PAGE_PATHS[activePage]);
              }
            }}
          />
        ) : activePage !== 'home' ? (
          <main>
            <CompanyPages
              activePage={activePage}
              onNavigatePage={handleNavigatePage}
              onSelectCatalogCategory={(cat, query = '') => {
                setActiveCategory(cat);
                setSearchTerm(query);
                handleNavigatePage('home', true);
                setTimeout(() => {
                  window.scrollTo({ top: 360, behavior: 'smooth' });
                }, 60);
              }}
              onOpenBookingMode={handleOpenBookingMode}
              onOpenLocationModal={() => setIsLocationModalOpen(true)}
              products={products}
              storeSettings={storeSettings}
            />
          </main>
        ) : (
          <main>
            {/* Hero Banner */}
            <HeroBanner />

            {/* Product Catalog */}
            <ProductCatalog
              products={products}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateCartQuantity}
              cartItems={cart}
              onOpenWhatsAppForProduct={handleOpenWhatsAppForProduct}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              isAdmin={isAdmin}
              onQuickEditPrice={() => setIsAdmin(true)}
              onDeleteProduct={handleDeleteProduct}
            />
          </main>
        )}
      </div>

      {/* Comprehensive Custom Jobsite Footer */}
      <Footer
        onSelectCategory={(cat) => {
          const normalized = cat.toLowerCase();
          if (normalized === 'painting') {
            setActiveCategory('all');
            setSearchTerm('paint');
          } else if (normalized === 'hardware') {
            setActiveCategory('fasteners');
            setSearchTerm('');
          } else {
            setActiveCategory(normalized);
            setSearchTerm('');
          }
          handleNavigatePage('home', true);
          setTimeout(() => {
            window.scrollTo({ top: 380, behavior: 'smooth' });
          }, 60);
        }}
        onNavigatePage={handleNavigatePage}
        activePage={activePage}
        onOpenUploadModal={() => setActiveBookingModal('image_upload')}
        onOpenCallModal={() => setActiveBookingModal('phone_callback')}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        storeConfig={{
          callNumber: storeSettings.helplineNumber,
          emergencyCallNumber: storeSettings.helplineNumber,
          whatsappNumber: storeSettings.whatsappNumber,
          storeName: storeSettings.storeName
        }}
        location={{
          address: deliveryAddress,
          lat: storeSettings.depotLat,
          lng: storeSettings.depotLng,
          areaName: deliveryAddress
        }}
      />

      {/* Floating Sticky Quick Cart Button (Matching Laptop & Mobile View) */}
      {!isCartOpen && !isCheckoutOpen && (
        <div className={`fixed bottom-16 sm:bottom-6 right-3.5 sm:right-6 z-40 ${isCartAnimating ? 'animate-bounce' : ''}`}>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-xl shadow-2xl flex items-center gap-2 border-2 border-amber-600/40 sm:border-amber-300 transition-all hover:scale-105 active:scale-95 group text-xs sm:text-sm"
            title="Open View Cart"
          >
            <div className="relative flex items-center gap-1">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 stroke-slate-950" />
              {cartTotalItems > 0 && (
                <span className="bg-white text-slate-900 font-black text-[9px] sm:text-[10px] min-w-[18px] h-4.5 px-1 rounded-full flex items-center justify-center border border-amber-600/30 shadow-xs">
                  {cartTotalItems}
                </span>
              )}
            </div>
            <span className="font-black tracking-tight whitespace-nowrap">View Cart →</span>
          </button>
        </div>
      )}

      {/* MODALS & OVERLAYS */}

      {/* Price Drop Notifications Modal */}
      <PriceDropModal
        isOpen={isPriceDropOpen}
        onClose={() => setIsPriceDropOpen(false)}
        products={products}
        onAddToCart={handleAddToCart}
      />
      
      {/* 1. Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={(addr) => {
          if (addr) setDeliveryAddress(addr);
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        storeSettings={storeSettings}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
      />

      {/* 2. Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onBackToCart={() => {
          setIsCheckoutOpen(false);
          setIsCartOpen(true);
        }}
        cartItems={cart}
        storeSettings={storeSettings}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        onOrderCompleted={() => {
          handleClearCart();
          fetchData();
        }}
      />

      {/* 3. Phone Call Booking Modal */}
      <PhoneBookingModal
        isOpen={activeBookingModal === 'phone_callback'}
        onClose={() => setActiveBookingModal(null)}
        storeSettings={storeSettings}
        onBookingCreated={() => {
          fetchData();
        }}
      />

      {/* 4. Image Upload Booking Modal (MANDATORY Plumber Phone) */}
      <ImageBookingModal
        isOpen={activeBookingModal === 'image_upload'}
        onClose={() => setActiveBookingModal(null)}
        products={products}
        onAddToCart={handleAddToCart}
        storeSettings={storeSettings}
        onBookingCreated={() => {
          fetchData();
        }}
      />

      {/* 5. WhatsApp Order Generator Modal */}
      <WhatsAppBookingModal
        isOpen={activeBookingModal === 'whatsapp_order'}
        onClose={() => setActiveBookingModal(null)}
        cartItems={cart}
        storeSettings={storeSettings}
        onBookingCreated={() => {
          fetchData();
        }}
      />

      {/* 6. Live Delivery Areas & Timings Modal */}
      <DeliveryAreasModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={deliveryAddress}
        onSelectAddress={(addr) => setDeliveryAddress(addr)}
        storeSettings={storeSettings}
      />

      {/* 8. Mobile Bottom Navigation */}
      <MobileBottomNav
        cartCount={cartTotalItems}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigateHome={() => handleNavigatePage('home')}
        onOpenBookingMode={handleOpenBookingMode}
        onOpenPriceDrops={() => setIsPriceDropOpen(true)}
        priceDropCount={priceDropCount}
        isAdmin={isAdmin}
        onToggleAdmin={() => setIsAdmin(prev => !prev)}
      />

    </div>
  );
}

