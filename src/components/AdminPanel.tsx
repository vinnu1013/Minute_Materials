import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  DollarSign, 
  TrendingUp, 
  Package, 
  ShoppingBag, 
  Phone, 
  Camera, 
  MessageSquare, 
  Edit3, 
  Save, 
  Plus, 
  CheckCircle2, 
  Clock, 
  X, 
  RefreshCw, 
  Sliders, 
  PhoneCall,
  Sparkles,
  Search,
  Eye,
  Trash2,
  PackageCheck,
  Truck,
  MapPin,
  Tag,
  Upload,
  AlertTriangle,
  Database,
  Server,
  Globe
} from 'lucide-react';
import { Product, Booking, StoreSettings, ProductCategory, StockStatus } from '../types';
import { getEstimateForAddress, DEPOT_LOCATION } from '../utils/distance';

export interface DbStatusInfo {
  connected: boolean;
  dbName: string;
  cluster: string;
  uriConfigured: boolean;
  lastConnectedAt?: string;
  lastError?: string;
  isIpWhitelistRequired: boolean;
  outboundIp: string;
  counts: {
    products: number;
    bookings: number;
    users: number;
    complaints: number;
    settingsConfigured: boolean;
  };
}

interface AdminPanelProps {
  products: Product[];
  bookings: Booking[];
  storeSettings: StoreSettings;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddProduct: (product: Partial<Product>) => void;
  onBulkUpdatePrices: (category: string, percentage: number) => void;
  onUpdateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  onUpdateStoreSettings: (settings: Partial<StoreSettings>) => void;
  onCloseAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  bookings,
  storeSettings,
  onUpdateProduct,
  onDeleteProduct,
  onAddProduct,
  onBulkUpdatePrices,
  onUpdateBookingStatus,
  onUpdateStoreSettings,
  onCloseAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'prices' | 'bookings' | 'settings'>('prices');
  
  // Database status & local persistent storage sync
  const [dbStatus, setDbStatus] = useState<DbStatusInfo | null>(null);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [dbSyncNotice, setDbSyncNotice] = useState<string>('');

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchDbStatus();
    const interval = setInterval(fetchDbStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncStorage = async () => {
    setIsSyncingDb(true);
    setDbSyncNotice('Verifying & syncing local persistent server storage...');
    try {
      const res = await fetch('/api/db-sync', { method: 'POST' });
      const data = await res.json();
      if (data && data.status) {
        setDbStatus(data.status);
      }
      setDbSyncNotice('✓ Successfully verified and synced all store data to persistent disk storage!');
      setTimeout(() => setDbSyncNotice(''), 5000);
    } catch (err: any) {
      setDbSyncNotice('⚠️ Sync notice: ' + err.message);
    } finally {
      setIsSyncingDb(false);
    }
  };

  // Settings Form state & persistence indicators
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(storeSettings);
  const [settingsSaveNotice, setSettingsSaveNotice] = useState<string>('');
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [productSaveNotice, setProductSaveNotice] = useState<string>('');

  useEffect(() => {
    setSettingsForm(storeSettings);
  }, [storeSettings]);

  // Save Store Settings Permanently
  const handleSaveAllSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      await onUpdateStoreSettings(settingsForm);
      setSettingsSaveNotice('✓ All store settings permanently saved to server & disk!');
      setTimeout(() => setSettingsSaveNotice(''), 4500);
    } catch (err) {
      setSettingsSaveNotice('⚠️ Failed to save store settings. Please retry.');
    } finally {
      setIsSavingSettings(false);
    }
  };
  
  // Price & Item Edit Modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('plumbing');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | undefined>(undefined);
  const [editStockCount, setEditStockCount] = useState<number>(0);
  const [editStockStatus, setEditStockStatus] = useState<StockStatus>('in_stock');
  const [editImage, setEditImage] = useState<string>('');
  const [editHsnCode, setEditHsnCode] = useState<string>('');
  const [editPartCode, setEditPartCode] = useState<string>('');
  const [editPopular, setEditPopular] = useState<boolean>(false);

  // Delete product confirmation state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string>('');

  // Bulk Price adjustment state
  const [bulkCategory, setBulkCategory] = useState<string>('all');
  const [bulkPercentage, setBulkPercentage] = useState<number>(5);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string>('');

  // Add Product state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<ProductCategory>('plumbing');
  const [newProductSubcategory, setNewProductSubcategory] = useState('Pipes & Fittings');
  const [newProductPrice, setNewProductPrice] = useState(15.00);
  const [newProductOriginalPrice, setNewProductOriginalPrice] = useState<number | undefined>(18.50);
  const [newProductUnit, setNewProductUnit] = useState<Product['unit']>('unit');
  const [newProductSku, setNewProductSku] = useState(`PLM-${Math.floor(100+Math.random()*900)}`);
  const [newProductHsnCode, setNewProductHsnCode] = useState('39174000');
  const [newProductPartCode, setNewProductPartCode] = useState('PLM-PART-01');
  const [newProductPopular, setNewProductPopular] = useState(false);
  const [newProductImage, setNewProductImage] = useState('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600');
  const [newProductDesc, setNewProductDesc] = useState('High grade commercial material supply');

  // Booking Filter
  const [bookingChannelFilter, setBookingChannelFilter] = useState<string>('all');
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);

  // Search in products
  const [adminProductSearch, setAdminProductSearch] = useState('');

  // Open Product Edit Modal
  const handleStartEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditPrice(product.price);
    setEditOriginalPrice(product.originalPrice);
    setEditStockCount(product.stockCount);
    setEditStockStatus(product.stockStatus);
    setEditImage(product.image);
    setEditHsnCode(product.hsnCode || '');
    setEditPartCode(product.partCode || '');
    setEditPopular(!!product.popular);
  };

  // Save Product Edit
  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const updated = {
      ...editingProduct,
      name: editName || editingProduct.name,
      category: editCategory,
      price: Number(editPrice),
      originalPrice: editOriginalPrice ? Number(editOriginalPrice) : undefined,
      stockCount: Number(editStockCount),
      stockStatus: editStockStatus,
      image: editImage || editingProduct.image,
      hsnCode: editHsnCode,
      partCode: editPartCode,
      popular: editPopular
    };

    onUpdateProduct(updated);
    setProductSaveNotice(`✓ Updated "${updated.name}" (₹${updated.price}) permanently!`);
    setTimeout(() => setProductSaveNotice(''), 4500);

    setEditingProduct(null);
  };

  // Delete product handler
  const handleConfirmDelete = (product: Product) => {
    onDeleteProduct(product.id);
    if (editingProduct && editingProduct.id === product.id) {
      setEditingProduct(null);
    }
    setProductToDelete(null);
    setDeleteNotice(`Successfully removed "${product.name}" (SKU: ${product.sku}) from catalog.`);
    setTimeout(() => setDeleteNotice(''), 4000);
  };

  // Submit Bulk Price Update
  const handleExecuteBulkPriceUpdate = () => {
    onBulkUpdatePrices(bulkCategory, Number(bulkPercentage));
    setBulkSuccessMessage(`Applied ${bulkPercentage}% price adjustment across ${bulkCategory.toUpperCase()} items.`);
    setTimeout(() => setBulkSuccessMessage(''), 3000);
  };

  // Handle image upload for editing product
  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image upload for new product
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProductImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Add New Product
  const handleCreateNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProduct({
      name: newProductName,
      category: newProductCategory,
      subcategory: newProductSubcategory,
      price: Number(newProductPrice),
      originalPrice: newProductOriginalPrice ? Number(newProductOriginalPrice) : undefined,
      unit: newProductUnit,
      stockCount: 100,
      stockStatus: 'in_stock',
      sku: newProductSku,
      hsnCode: newProductHsnCode,
      partCode: newProductPartCode,
      popular: newProductPopular,
      image: newProductImage,
      description: newProductDesc
    });
    setShowAddProductModal(false);
    setNewProductName('');
  };

  const filteredAdminProducts = products.filter(p => {
    if (!adminProductSearch) return true;
    return p.name.toLowerCase().includes(adminProductSearch.toLowerCase()) ||
           p.sku.toLowerCase().includes(adminProductSearch.toLowerCase());
  });

  const filteredBookings = bookings.filter(b => {
    if (bookingChannelFilter === 'all') return true;
    return b.bookingType === bookingChannelFilter;
  });

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen py-6 px-4 border-t-4 border-amber-500">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Admin Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">Store Admin &amp; Price Manager</h1>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  Server Database: Persistent Disk Storage
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Update prices, stock levels, bulk discounts, and manage incoming trade orders across all 4 channels.
              </p>
            </div>
          </div>

          <button
            onClick={onCloseAdmin}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Exit Admin Mode
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 border ${
              activeTab === 'prices'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 stroke-[2.5]" /> Price &amp; Stock Manager
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 border ${
              activeTab === 'bookings'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" /> Incoming Bookings Queue ({bookings.length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 border ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 stroke-[2.5]" /> Store &amp; Helpline Settings
          </button>
        </div>

        {/* TAB 1: PRICE MANAGEMENT */}
        {activeTab === 'prices' && (
          <div className="space-y-6">
            {productSaveNotice && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{productSaveNotice}</span>
              </div>
            )}
            
            {/* Quick Bulk Price Tool & Add Product Button */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Bulk Price Adjuster Card */}
              <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">Bulk Price Adjuster Tool</h3>
                  </div>
                  <span className="text-[11px] text-slate-500">Instantly adjust material prices by %</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Target Category</label>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="all">All Catalog Items</option>
                      <option value="plumbing">Plumbing Supplies</option>
                      <option value="electrical">Electrical Supplies</option>
                      <option value="tools">Tools &amp; Testers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">% Change (+ or -)</label>
                    <input
                      type="number"
                      value={bulkPercentage}
                      onChange={(e) => setBulkPercentage(Number(e.target.value))}
                      placeholder="e.g. 5 for +5%, -10 for discount"
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleExecuteBulkPriceUpdate}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-lg text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Apply Bulk Price Change
                    </button>
                  </div>
                </div>

                {bulkSuccessMessage && (
                  <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-center">
                    {bulkSuccessMessage}
                  </p>
                )}
              </div>

              {/* Add New Material Button Card */}
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-amber-900 text-sm mb-1">Add New Material</h3>
                  <p className="text-xs text-slate-600">Add custom pipe fittings, breaker models, or wires to live store catalog.</p>
                </div>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="mt-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Add New Material Item
                </button>
              </div>

            </div>

            {/* Delete Notice Banner */}
            {deleteNotice && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{deleteNotice}</span>
                </div>
                <button 
                  onClick={() => setDeleteNotice('')}
                  className="text-rose-600 hover:text-rose-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Product Price Editor List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Live Material Catalog Manager</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Edit prices, adjust stock, or remove unwanted specific items ({products.length} total materials)</p>
                </div>
                
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search material SKU or name..."
                    value={adminProductSearch}
                    onChange={(e) => setAdminProductSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs pl-9 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Item Name</th>
                      <th className="py-3 px-3">HSN Code</th>
                      <th className="py-3 px-3">Part Code</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Trade Favorite</th>
                      <th className="py-3 px-3">Live Price</th>
                      <th className="py-3 px-3">Stock Count</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAdminProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <img src={p.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'} alt="" className="w-8 h-8 rounded object-cover bg-white border border-slate-200 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">SKU: {p.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-600">{p.hsnCode || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-amber-700">{p.partCode || '—'}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-amber-700">{p.category}</td>
                        <td className="py-2.5 px-3">
                          {p.popular ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded text-[10px]">
                              ★ Favorite
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Standard</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-700 text-sm">₹{p.price.toFixed(2)} / {p.unit}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.stockCount} {p.unit}s</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            p.stockStatus === 'in_stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {p.stockStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEditProduct(p)}
                              className="bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-slate-950 border border-amber-200 font-bold px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1"
                              title="Edit price & details"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(p)}
                              className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1"
                              title={`Remove ${p.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: INCOMING BOOKINGS QUEUE */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Incoming Bookings &amp; Dispatch Manager</h3>
                <p className="text-xs text-slate-500">View orders across 4 channels: Cart Delivery, Phone Callbacks, Image AI Quotes, WhatsApp</p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setBookingChannelFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    bookingChannelFilter === 'all' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({bookings.length})
                </button>
                <button
                  onClick={() => setBookingChannelFilter('cart_delivery')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    bookingChannelFilter === 'cart_delivery' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🛒 Cart
                </button>
                <button
                  onClick={() => setBookingChannelFilter('phone_callback')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    bookingChannelFilter === 'phone_callback' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📞 Phone Call
                </button>
                <button
                  onClick={() => setBookingChannelFilter('image_upload')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    bookingChannelFilter === 'image_upload' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📷 Image AI
                </button>
                <button
                  onClick={() => setBookingChannelFilter('whatsapp_order')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    bookingChannelFilter === 'whatsapp_order' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>

            {/* Bookings Grid */}
            <div className="space-y-3">
              {filteredBookings.map((booking) => {
                const estimate = getEstimateForAddress(
                  booking.deliveryAddress || 'Hyderabad Central',
                  booking.customerLat,
                  booking.customerLng
                );

                return (
                  <div
                    key={booking.id}
                    className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 hover:border-amber-300 transition shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-700 text-sm">{booking.id}</span>
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border ${
                          booking.bookingType === 'image_upload' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                          booking.bookingType === 'phone_callback' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          booking.bookingType === 'whatsapp_order' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          Mode: {booking.bookingType.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Status Selector & Quick Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={booking.status}
                          onChange={(e: any) => onUpdateBookingStatus(booking.id, e.target.value)}
                          className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
                        >
                          <option value="new">🔴 New Order</option>
                          <option value="packing">📦 Accepted &amp; Packing</option>
                          <option value="dispatched">⚡ Dispatched (En Route)</option>
                          <option value="delivered">✅ Delivered</option>
                          <option value="cancelled">❌ Cancelled</option>
                        </select>

                        {booking.status === 'new' && (
                          <button
                            onClick={() => onUpdateBookingStatus(booking.id, 'packing')}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-lg text-xs transition flex items-center gap-1 shadow-xs"
                          >
                            <PackageCheck className="w-3.5 h-3.5" /> Accept &amp; Start Packing
                          </button>
                        )}

                        {booking.status === 'packing' && (
                          <button
                            onClick={() => onUpdateBookingStatus(booking.id, 'dispatched')}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1 rounded-lg text-xs transition flex items-center gap-1 shadow-xs"
                          >
                            <Truck className="w-3.5 h-3.5" /> Dispatch Courier (En Route)
                          </button>
                        )}

                        {booking.status === 'dispatched' && (
                          <button
                            onClick={() => onUpdateBookingStatus(booking.id, 'delivered')}
                            className="bg-green-600 hover:bg-green-500 text-white font-black px-3 py-1 rounded-lg text-xs transition flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Distance & Drive Time Widget for Admin */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Site: <strong className="text-slate-900">{booking.deliveryAddress || 'Hyderabad'}</strong></span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-slate-500">Hub: <strong className="text-amber-700 font-bold">Minute Materials Express</strong></span>
                        <span className="text-slate-500">Dist: <strong className="text-amber-700 font-bold">{booking.distanceKm || estimate.distanceKm} km</strong></span>
                        <span className="text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          ⏱️ Speed: 10-15 mins
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">Customer &amp; Plumber Contact:</span>
                        <p className="font-bold text-slate-900">{booking.customerName}</p>
                        
                        {/* MANDATORY PHONE NUMBER WITH 1-CLICK CALL BUTTON */}
                        <div className="mt-1 flex items-center gap-2">
                          <a
                            href={`tel:${booking.plumberPhone}`}
                            className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-mono font-black px-2.5 py-1 rounded-md text-xs border border-emerald-200 transition flex items-center gap-1"
                          >
                            <PhoneCall className="w-3.5 h-3.5" /> Call: {booking.plumberPhone || 'N/A'}
                          </a>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">Recipient Details:</span>
                        <p className="font-bold text-slate-900">{booking.recipientName || booking.customerName}</p>
                        <p className="text-[11px] text-amber-700 font-mono font-bold">
                          📞 {booking.recipientPhone || booking.plumberPhone}
                        </p>
                        <span className="inline-block mt-1 text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {booking.recipientType === 'others' ? '👤 Ordering for Other' : '👤 Ordering for Self'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">Jobsite Address &amp; Instructions:</span>
                        <p className="text-slate-800 font-medium text-xs">{booking.deliveryAddress || 'No address specified'}</p>
                        {booking.notes && (
                          <div className="mt-1.5 bg-amber-50 border border-amber-200 p-2 rounded text-[11px] text-amber-900">
                            <strong className="text-amber-800">📝 Driver Instructions:</strong> {booking.notes}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">Order Total / Payment:</span>
                        <p className="font-mono font-black text-amber-700 text-sm">₹{booking.totalPrice.toFixed(2)}</p>
                        <p className="text-[11px] text-slate-500 uppercase font-bold">{booking.paymentMethod?.replace('_', ' ')}</p>
                      </div>
                    </div>

                    {/* Gemini Image Scan Details if present */}
                    {booking.geminiAnalysis && (
                      <div className="bg-cyan-50/50 border border-cyan-200 p-3 rounded-xl space-y-1 text-xs">
                        <span className="text-cyan-800 font-extrabold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-600" /> Gemini AI Image Extraction Breakdown
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {booking.geminiAnalysis.detectedItems.map((item, i) => (
                            <span key={i} className="bg-white text-slate-800 border border-cyan-200 px-2 py-0.5 rounded font-mono text-[11px]">
                              {item.estimatedQty}x {item.name} (₹{item.estimatedUnitPrice.toFixed(2)}/unit)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Image Preview if present */}
                    {booking.imageBase64 && (
                      <div className="pt-1">
                        <button
                          onClick={() => setSelectedBookingForDetail(booking)}
                          className="text-cyan-700 hover:underline text-xs font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Uploaded Material Image Photo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: STORE SETTINGS & DATABASE */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            {/* Server Database Card */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">Persistent Server Database</h3>
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                        ACTIVE &amp; SYNCED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Local High-Speed Persistent Storage: <code className="text-amber-700 font-mono font-bold">/data/*.json</code></p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncStorage}
                  disabled={isSyncingDb}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingDb ? 'animate-spin' : ''}`} />
                  {isSyncingDb ? 'Syncing...' : '⚡ Verify & Sync Storage'}
                </button>
              </div>

              {dbSyncNotice && (
                <div className="bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-xl text-xs font-mono">
                  {dbSyncNotice}
                </div>
              )}

              {/* Database Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Catalog Products</span>
                  <span className="text-lg font-black text-slate-900 font-mono">{dbStatus?.counts.products ?? products.length}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Bookings Queue</span>
                  <span className="text-lg font-black text-amber-600 font-mono">{dbStatus?.counts.bookings ?? bookings.length}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Trade Accounts</span>
                  <span className="text-lg font-black text-cyan-700 font-mono">{dbStatus?.counts.users ?? 1}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Storage Engine</span>
                  <span className="text-[11px] font-black text-emerald-700 font-mono">Persistent Disk</span>
                </div>
              </div>
            </div>

            {/* Store Configuration Form */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base">Store, Helpline &amp; Billing Configuration</h3>
                  <p className="text-[11px] text-slate-500">All changes made here are saved permanently to server persistent storage.</p>
                </div>
                <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
                  Persistent Config
                </span>
              </div>

              {settingsSaveNotice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{settingsSaveNotice}</span>
                </div>
              )}

              <form onSubmit={handleSaveAllSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Helpline Phone Number</label>
                    <input
                      type="text"
                      value={settingsForm.helplineNumber}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, helplineNumber: e.target.value }))}
                      onBlur={() => onUpdateStoreSettings(settingsForm)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">WhatsApp Order Number</label>
                    <input
                      type="text"
                      value={settingsForm.whatsappNumber}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                      onBlur={() => onUpdateStoreSettings(settingsForm)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Online Billing Fees Settings */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wider block">
                    💳 Online Billing &amp; Service Charges
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Platform Fee (₹)</label>
                      <input
                        type="number"
                        value={settingsForm.platformFee ?? 5}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, platformFee: Number(e.target.value) }))}
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Handling Charges (₹)</label>
                      <input
                        type="number"
                        value={settingsForm.handlingFee ?? 10}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, handlingFee: Number(e.target.value) }))}
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Min Order for FREE Delivery (₹)</label>
                      <input
                        type="number"
                        value={settingsForm.minOrderFreeDelivery ?? 199}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, minOrderFreeDelivery: Number(e.target.value) }))}
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* UPI & Scanner Settings */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                    📱 Online UPI &amp; QR Scanner Settings
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Primary UPI ID</label>
                      <input
                        type="text"
                        value={settingsForm.upiId || 'mr.vinnu10@okicici'}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, upiId: e.target.value }))}
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-emerald-700 font-mono font-bold px-3 py-2 rounded-lg focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={settingsForm.accountHolderName || 'THappetla Vinay Kumar'}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-bold px-3 py-2 rounded-lg focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Standard Express Delivery Fee (₹)</label>
                    <input
                      type="number"
                      value={settingsForm.deliveryFeeExpress}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, deliveryFeeExpress: Number(e.target.value) }))}
                      onBlur={() => onUpdateStoreSettings(settingsForm)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admin Passcode PIN</label>
                    <input
                      type="text"
                      value={settingsForm.adminPin}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, adminPin: e.target.value }))}
                      onBlur={() => onUpdateStoreSettings(settingsForm)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Top Announcement Notice Banner</label>
                  <input
                    type="text"
                    value={settingsForm.activeDeliveryNotice}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, activeDeliveryNotice: e.target.value }))}
                    onBlur={() => onUpdateStoreSettings(settingsForm)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingSettings ? 'Saving Changes to Disk...' : '💾 Save Store Settings Permanently'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Price & Material Editing Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4 my-8 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setEditingProduct(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Material Details &amp; Image</h3>
                  <p className="text-[11px] text-slate-500">SKU: {editingProduct.sku}</p>
                </div>
              </div>

              <form onSubmit={handleSaveProductEdit} className="space-y-3 text-xs">
                {/* Material Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Material Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold px-3 py-2 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e: any) => setEditCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-amber-800 font-bold px-2.5 py-2 rounded-lg text-xs"
                    >
                      <option value="plumbing">🚰 Plumbing</option>
                      <option value="electrical">⚡ Electrical</option>
                      <option value="tools">🛠️ Tools</option>
                      <option value="fasteners">🔩 Fasteners</option>
                    </select>
                  </div>
                </div>

                {/* Material Image & Upload */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block font-bold text-amber-700 uppercase tracking-wider text-[10px]">
                    🖼️ Material Image / Photo
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <img
                      src={editImage || editingProduct.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'}
                      alt="Preview"
                      className="w-14 h-14 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        placeholder="Image URL (https://...)"
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-[11px]"
                      />
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        <Upload className="w-3.5 h-3.5" /> Upload Image from Device
                        <input type="file" accept="image/*" onChange={handleEditImageUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* HSN Code & Part Code (Admin Only) */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">
                      🔒 HSN Code (Admin Only)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 39174000"
                      value={editHsnCode}
                      onChange={(e) => setEditHsnCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono px-2.5 py-1.5 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">
                      🔒 Part Code (Admin Only)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CPVC-E-100"
                      value={editPartCode}
                      onChange={(e) => setEditPartCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono px-2.5 py-1.5 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Trade Favorite Checkbox */}
                <div className="flex items-center gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    id="editPopularCheckbox"
                    checked={editPopular}
                    onChange={(e) => setEditPopular(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500 bg-white border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="editPopularCheckbox" className="text-xs font-bold text-amber-900 cursor-pointer">
                    ★ Mark as Trade Favorite (Display badge to customers)
                  </label>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 text-amber-800 font-mono font-bold text-base px-3 py-2 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Original Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editOriginalPrice || ''}
                      onChange={(e) => setEditOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Strikethrough"
                      className="w-full bg-slate-50 border border-slate-300 text-slate-700 font-mono px-3 py-2 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Stock Count & Status */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stock Count</label>
                    <input
                      type="number"
                      value={editStockCount}
                      onChange={(e) => setEditStockCount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stock Status</label>
                    <select
                      value={editStockStatus}
                      onChange={(e: any) => setEditStockStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold px-3 py-2 rounded-lg text-xs"
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="low_stock">Low Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingProduct) {
                        setProductToDelete(editingProduct);
                      }
                    }}
                    className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    title="Remove item from catalog"
                  >
                    <Trash2 className="w-4 h-4" /> Remove Item
                  </button>
                  <div className="flex flex-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-black transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save Material Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-slate-900 shadow-2xl relative space-y-3 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowAddProductModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Tag className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-black text-slate-900">Add New Material &amp; Price Drop</h3>
              </div>

              <form onSubmit={handleCreateNewProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">Material Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1-1/2 inch Heavy Duty PVC Elbow 90"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold mb-1 text-slate-700">Category</label>
                    <select
                      value={newProductCategory}
                      onChange={(e: any) => setNewProductCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-2 py-2 rounded-lg font-semibold"
                    >
                      <option value="plumbing">🚰 Plumbing</option>
                      <option value="electrical">⚡ Electrical</option>
                      <option value="tools">🛠️ Tools</option>
                      <option value="fasteners">🔩 Fasteners</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700">Unit Type</label>
                    <select
                      value={newProductUnit}
                      onChange={(e: any) => setNewProductUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-2 py-2 rounded-lg font-semibold"
                    >
                      <option value="unit">unit</option>
                      <option value="ft">per foot (ft)</option>
                      <option value="m">per meter (m)</option>
                      <option value="box">per box</option>
                      <option value="pack">per pack</option>
                      <option value="roll">per roll</option>
                    </select>
                  </div>
                </div>

                {/* HSN CODE & PART CODE (Admin Only) */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">
                      🔒 HSN Code (Admin Only)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 39174000"
                      value={newProductHsnCode}
                      onChange={(e) => setNewProductHsnCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono px-2.5 py-1.5 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-700 mb-1">
                      🔒 Part Code (Admin Only)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CPVC-E-100"
                      value={newProductPartCode}
                      onChange={(e) => setNewProductPartCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono px-2.5 py-1.5 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Trade Favorite Checkbox */}
                <div className="flex items-center gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    id="newProductPopularCheckbox"
                    checked={newProductPopular}
                    onChange={(e) => setNewProductPopular(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500 bg-white border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="newProductPopularCheckbox" className="text-xs font-bold text-amber-900 cursor-pointer">
                    ★ Mark as Trade Favorite (Display badge to customers)
                  </label>
                </div>

                {/* PRICING & DISCOUNT DROP FIELDS */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                    💰 Pricing &amp; Discount Settings
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-1 text-emerald-700">
                        Selling Price (₹) <span className="text-amber-700 font-normal">*Discounted</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(Number(e.target.value))}
                        className="w-full bg-white border border-emerald-300 text-emerald-800 font-mono font-bold px-3 py-2 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-slate-600">
                        Original Price (₹) <span className="text-slate-400 font-normal">(Strikethrough)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProductOriginalPrice || ''}
                        onChange={(e) => setNewProductOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="e.g. 19.99"
                        className="w-full bg-white border border-slate-300 text-slate-700 font-mono px-3 py-2 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  {newProductOriginalPrice && newProductOriginalPrice > newProductPrice && (
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      🔥 Price drop of ₹{ (newProductOriginalPrice - newProductPrice).toFixed(2) } ({ Math.round(((newProductOriginalPrice - newProductPrice) / newProductOriginalPrice) * 100) }% OFF)!
                    </p>
                  )}
                </div>

                {/* MATERIAL IMAGE INPUT & FILE UPLOAD */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700">Material Photo Image</label>
                  
                  {/* Preview */}
                  <div className="flex items-center gap-3">
                    <img
                      src={newProductImage || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        placeholder="Image URL (e.g. https://...)"
                        value={newProductImage}
                        onChange={(e) => setNewProductImage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-1.5 rounded-lg text-xs"
                      />
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        <Upload className="w-3.5 h-3.5" /> Upload File from Device
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700">Description / Specs</label>
                  <textarea
                    rows={2}
                    value={newProductDesc}
                    onChange={(e) => setNewProductDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-1.5 rounded-lg text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Save Material Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Uploaded Image Modal */}
        {selectedBookingForDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 text-slate-900 shadow-2xl relative space-y-3">
              <button
                onClick={() => setSelectedBookingForDetail(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-bold text-slate-900">Uploaded Material Photo ({selectedBookingForDetail.id})</h3>
              
              {selectedBookingForDetail.imageBase64 && selectedBookingForDetail.imageBase64.trim() !== '' && (
                <img
                  src={selectedBookingForDetail.imageBase64}
                  alt="Uploaded Job Note"
                  className="w-full max-h-80 object-contain rounded-xl bg-slate-50 border border-slate-200"
                />
              )}

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
                <p><strong className="text-amber-700">Plumber Phone:</strong> {selectedBookingForDetail.plumberPhone}</p>
                <p><strong className="text-slate-600">Customer:</strong> {selectedBookingForDetail.customerName}</p>
                <p><strong className="text-slate-600">Address:</strong> {selectedBookingForDetail.deliveryAddress || 'N/A'}</p>
              </div>

              <a
                href={`tel:${selectedBookingForDetail.plumberPhone}`}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" /> Call Plumber Now ({selectedBookingForDetail.plumberPhone})
              </a>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Removing an Item */}
        {productToDelete && (
          <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4 animate-scale-up">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Remove Item from Store?</h3>
                  <p className="text-xs text-rose-600 font-semibold">This action will delete the item from live catalog</p>
                </div>
              </div>

              {/* Product Preview Card */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                <img
                  src={productToDelete.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'}
                  alt={productToDelete.name}
                  className="w-12 h-12 rounded-lg object-cover bg-white shrink-0 border border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-900 truncate">{productToDelete.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">SKU: {productToDelete.sku} • ₹{productToDelete.price.toFixed(2)}/{productToDelete.unit}</p>
                  <p className="text-[10px] text-amber-700 uppercase font-bold">{productToDelete.category}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently remove this specific item from the store inventory? Customers will no longer be able to view, search, or order it.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(productToDelete)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-black transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Yes, Remove Item
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
