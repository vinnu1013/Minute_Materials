import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Lock,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Edit3,
  Save,
  Plus,
  CheckCircle2,
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
  Layers,
  Copy,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Table,
  List,
  LayoutGrid,
  Droplets,
  Zap,
  Fan,
  Lightbulb,
  Wrench,
  Package,
} from 'lucide-react';
import {
  Product,
  Booking,
  StoreSettings,
  ProductCategory,
  StockStatus,
  CategoryConfig,
  ProductUnit,
} from '../types';
import { getEstimateForAddress } from '../utils/distance';
import {
  DEFAULT_CATEGORIES,
  getCategoryDisplayName,
  getCategorySizePresets,
  generateAutoSku,
  slugifyCategoryId,
} from '../data/categories';
import {
  groupProductsByBaseName,
  ProductGroup,
  getVariantSizeLabel,
} from '../utils/productGrouping';

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
  categories?: CategoryConfig[];
  bookings: Booking[];
  storeSettings: StoreSettings;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddProduct: (product: Partial<Product>) => void;
  onAddProductsBatch?: (products: Array<Partial<Product>>) => Promise<void> | void;
  onUpdateProductsBatch?: (products: Product[]) => Promise<void> | void;
  onDeleteProductsBatch?: (ids: string[]) => Promise<void> | void;
  onUpdateCategories?: (categories: CategoryConfig[]) => Promise<void> | void;
  onReassignCategory?: (
    fromCategory: string,
    action: 'reassign' | 'delete',
    toCategory?: string
  ) => Promise<void> | void;
  onBulkUpdatePrices: (category: string, percentage: number) => void;
  onUpdateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  onUpdateStoreSettings: (settings: Partial<StoreSettings>) => void;
  onCloseAdmin: () => void;
}

interface SizeDraftRow {
  tempId: string;
  sizeLabel: string;
  price: string;
  originalPrice: string;
  stockCount: string;
  sku: string;
  partCode: string;
}

interface BulkDraftRow {
  tempId: string;
  baseName: string;
  sizeLabel: string;
  subcategory: string;
  price: string;
  originalPrice: string;
  unit: ProductUnit;
  stockCount: string;
}

interface GroupVariantEditRow {
  id?: string;
  tempId: string;
  sizeLabel: string;
  price: string;
  originalPrice: string;
  stockCount: string;
  stockStatus: StockStatus;
  sku: string;
  partCode: string;
}

function getCategorySmallIcon(catId: string) {
  const c = (catId || '').toLowerCase();
  if (c === 'plumbing') return <Droplets className="w-4 h-4 text-amber-600" />;
  if (c === 'electrical') return <Zap className="w-4 h-4 text-amber-600" />;
  if (c === 'fans') return <Fan className="w-4 h-4 text-amber-600" />;
  if (c === 'lights') return <Lightbulb className="w-4 h-4 text-amber-600" />;
  if (c === 'tools') return <Wrench className="w-4 h-4 text-amber-600" />;
  return <Package className="w-4 h-4 text-amber-600" />;
}

const UNIT_OPTIONS: Array<{ value: ProductUnit; label: string }> = [
  { value: 'unit', label: 'Per Piece / Unit' },
  { value: 'set', label: 'Per Set' },
  { value: 'meter', label: 'Per Meter (m)' },
  { value: 'ft', label: 'Per Foot (ft)' },
  { value: 'roll', label: 'Per Roll / Coil' },
  { value: 'box', label: 'Per Box' },
  { value: 'pack', label: 'Per Pack' },
  { value: 'pair', label: 'Per Pair' },
];

const createEmptySizeRow = (sizeLabel = '', price = ''): SizeDraftRow => ({
  tempId: `sz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  sizeLabel,
  price,
  originalPrice: '',
  stockCount: '100',
  sku: '',
  partCode: '',
});

const createEmptyBulkRow = (subcategory = '', unit: ProductUnit = 'unit'): BulkDraftRow => ({
  tempId: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  baseName: '',
  sizeLabel: '',
  subcategory,
  price: '',
  originalPrice: '',
  unit,
  stockCount: '100',
});

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  categories = DEFAULT_CATEGORIES,
  bookings,
  storeSettings,
  onUpdateProduct,
  onDeleteProduct,
  onAddProduct,
  onAddProductsBatch,
  onUpdateProductsBatch,
  onDeleteProductsBatch,
  onUpdateCategories,
  onReassignCategory,
  onBulkUpdatePrices,
  onUpdateBookingStatus,
  onUpdateStoreSettings,
  onCloseAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'prices' | 'categories' | 'bookings' | 'settings'>('prices');

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
      setDbSyncNotice('Successfully verified and synced all store data to persistent disk storage.');
      setTimeout(() => setDbSyncNotice(''), 5000);
    } catch (err: any) {
      setDbSyncNotice('Sync notice: ' + err.message);
    } finally {
      setIsSyncingDb(false);
    }
  };

  // Settings Form state
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(storeSettings);
  const [settingsSaveNotice, setSettingsSaveNotice] = useState<string>('');
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [productSaveNotice, setProductSaveNotice] = useState<string>('');

  useEffect(() => {
    setSettingsForm(storeSettings);
  }, [storeSettings]);

  const showToast = (msg: string) => {
    setProductSaveNotice(msg);
    setTimeout(() => setProductSaveNotice(''), 4500);
  };

  const handleSaveAllSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      await onUpdateStoreSettings(settingsForm);
      setSettingsSaveNotice('All store settings permanently saved to server & disk.');
      setTimeout(() => setSettingsSaveNotice(''), 4500);
    } catch {
      setSettingsSaveNotice('Failed to save store settings. Please retry.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ============================================================================
  // CATALOG FILTERING, VIEW MODE (GROUPED vs FLAT), AND INLINE QUICK EDIT
  // ============================================================================
  const [catalogViewMode, setCatalogViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all');
  const [adminSubcategoryFilter, setAdminSubcategoryFilter] = useState<string>('all');
  const [adminProductSearch, setAdminProductSearch] = useState('');
  const [inlinePrices, setInlinePrices] = useState<Record<string, string>>({});
  const [inlineStocks, setInlineStocks] = useState<Record<string, string>>({});

  // Helper to get combined subcategories for any category ID
  const getSubcategoriesForCategory = (catId: string): string[] => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const push = (val?: string) => {
      const clean = (val || '').trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(clean);
      }
    };
    if (catId === 'all') {
      categories.forEach((c) => c.subcategories.forEach(push));
      products.forEach((p) => push(p.subcategory));
    } else {
      const cfg = categories.find((c) => c.id.toLowerCase() === catId.toLowerCase());
      cfg?.subcategories.forEach(push);
      products
        .filter((p) => p.category.toLowerCase() === catId.toLowerCase())
        .forEach((p) => push(p.subcategory));
    }
    return ordered;
  };

  const activeFilterSubcategories = useMemo(
    () => getSubcategoriesForCategory(adminCategoryFilter),
    [adminCategoryFilter, categories, products]
  );

  useEffect(() => {
    if (
      adminSubcategoryFilter !== 'all' &&
      !activeFilterSubcategories.some((s) => s.toLowerCase() === adminSubcategoryFilter.toLowerCase())
    ) {
      setAdminSubcategoryFilter('all');
    }
  }, [adminCategoryFilter, activeFilterSubcategories, adminSubcategoryFilter]);

  const filteredAdminProducts = useMemo(() => {
    const q = adminProductSearch.trim().toLowerCase();
    return products.filter((p) => {
      const catMatch =
        adminCategoryFilter === 'all' ||
        p.category.toLowerCase() === adminCategoryFilter.toLowerCase();
      const subMatch =
        adminSubcategoryFilter === 'all' ||
        (p.subcategory || '').toLowerCase() === adminSubcategoryFilter.toLowerCase();
      const searchMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.baseName && p.baseName.toLowerCase().includes(q)) ||
        (p.sizeLabel && p.sizeLabel.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q));
      return catMatch && subMatch && searchMatch;
    });
  }, [products, adminCategoryFilter, adminSubcategoryFilter, adminProductSearch]);

  const filteredAdminGroups = useMemo(
    () => groupProductsByBaseName(filteredAdminProducts),
    [filteredAdminProducts]
  );

  const handleSaveInlineRow = (product: Product) => {
    const nextPriceStr = inlinePrices[product.id];
    const nextStockStr = inlineStocks[product.id];
    const nextPrice = nextPriceStr !== undefined ? Number(nextPriceStr) : product.price;
    const nextStock = nextStockStr !== undefined ? Number(nextStockStr) : product.stockCount;
    if (isNaN(nextPrice) || nextPrice < 0 || isNaN(nextStock) || nextStock < 0) return;
    if (nextPrice === product.price && nextStock === product.stockCount) return;

    const updated: Product = {
      ...product,
      price: nextPrice,
      stockCount: nextStock,
      stockStatus: nextStock === 0 ? 'out_of_stock' : nextStock <= 10 ? 'low_stock' : 'in_stock',
    };
    onUpdateProduct(updated);
    showToast(`Saved quick update for "${product.name}" (₹${updated.price.toFixed(2)})`);
  };

  // ============================================================================
  // SINGLE ITEM EDIT & DELETE MODALS
  // ============================================================================
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editBaseName, setEditBaseName] = useState<string>('');
  const [editSizeLabel, setEditSizeLabel] = useState<string>('');
  const [editCategory, setEditCategory] = useState<ProductCategory>('plumbing');
  const [editSubcategory, setEditSubcategory] = useState<string>('');
  const [editUnit, setEditUnit] = useState<ProductUnit>('unit');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | undefined>(undefined);
  const [editStockCount, setEditStockCount] = useState<number>(0);
  const [editStockStatus, setEditStockStatus] = useState<StockStatus>('in_stock');
  const [editImage, setEditImage] = useState<string>('');
  const [editHsnCode, setEditHsnCode] = useState<string>('');
  const [editPartCode, setEditPartCode] = useState<string>('');
  const [editPopular, setEditPopular] = useState<boolean>(false);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<ProductGroup | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string>('');

  // Bulk Price adjustment state
  const [bulkCategory, setBulkCategory] = useState<string>('all');
  const [bulkPercentage, setBulkPercentage] = useState<number>(5);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string>('');

  const handleStartEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditBaseName(product.baseName || '');
    setEditSizeLabel(product.sizeLabel || '');
    setEditCategory(product.category);
    setEditSubcategory(product.subcategory || '');
    setEditUnit(product.unit || 'unit');
    setEditPrice(product.price);
    setEditOriginalPrice(product.originalPrice);
    setEditStockCount(product.stockCount);
    setEditStockStatus(product.stockStatus);
    setEditImage(product.image || '');
    setEditHsnCode(product.hsnCode || '');
    setEditPartCode(product.partCode || '');
    setEditPopular(!!product.popular);
  };

  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const cleanBase = editBaseName.trim();
    const cleanSize = editSizeLabel.trim();
    const computedName =
      cleanBase && cleanSize
        ? `${cleanBase} ${cleanSize}`
        : editName.trim() || editingProduct.name;

    const updated: Product = {
      ...editingProduct,
      name: computedName,
      baseName: cleanBase || undefined,
      sizeLabel: cleanSize || undefined,
      category: editCategory,
      subcategory: editSubcategory.trim(),
      unit: editUnit,
      price: Number(editPrice),
      originalPrice: editOriginalPrice ? Number(editOriginalPrice) : undefined,
      stockCount: Number(editStockCount),
      stockStatus: editStockStatus,
      image: editImage,
      hsnCode: editHsnCode,
      partCode: editPartCode,
      popular: editPopular,
    };

    onUpdateProduct(updated);
    showToast(`Updated "${updated.name}" (₹${updated.price.toFixed(2)}) permanently.`);
    setEditingProduct(null);
  };

  const handleConfirmDelete = (product: Product) => {
    onDeleteProduct(product.id);
    if (editingProduct && editingProduct.id === product.id) {
      setEditingProduct(null);
    }
    setProductToDelete(null);
    setDeleteNotice(`Removed "${product.name}" (SKU: ${product.sku}) from catalog.`);
    setTimeout(() => setDeleteNotice(''), 4000);
  };

  const handleConfirmDeleteGroup = async (group: ProductGroup) => {
    const ids = group.variants.map((v) => v.id);
    if (onDeleteProductsBatch) {
      await onDeleteProductsBatch(ids);
    } else {
      ids.forEach((id) => onDeleteProduct(id));
    }
    setGroupToDelete(null);
    setDeleteNotice(`Removed "${group.baseName}" (${ids.length} size variants) from catalog.`);
    setTimeout(() => setDeleteNotice(''), 4000);
  };

  const handleExecuteBulkPriceUpdate = () => {
    onBulkUpdatePrices(bulkCategory, Number(bulkPercentage));
    const catLabel = getCategoryDisplayName(bulkCategory, categories);
    setBulkSuccessMessage(`Applied ${bulkPercentage}% price adjustment across ${catLabel}.`);
    setTimeout(() => setBulkSuccessMessage(''), 3500);
  };

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

  // ============================================================================
  // MANAGE EXISTING MAIN MATERIAL GROUP & ALL SIZES MODAL
  // ============================================================================
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
  const [groupBaseName, setGroupBaseName] = useState('');
  const [groupCategory, setGroupCategory] = useState<string>('plumbing');
  const [groupSubcategory, setGroupSubcategory] = useState<string>('');
  const [groupUnit, setGroupUnit] = useState<ProductUnit>('unit');
  const [groupImage, setGroupImage] = useState<string>('');
  const [groupHsn, setGroupHsn] = useState<string>('');
  const [groupPopular, setGroupPopular] = useState<boolean>(false);
  const [groupDescription, setGroupDescription] = useState<string>('');
  const [groupVariantRows, setGroupVariantRows] = useState<GroupVariantEditRow[]>([]);
  const [deletedGroupVariantIds, setDeletedGroupVariantIds] = useState<string[]>([]);

  const handleOpenGroupEditor = (group: ProductGroup, appendEmptySize = false) => {
    const first = group.variants[0];
    const withImg = group.variants.find((v) => v.image && v.image.trim() !== '') || first;
    setEditingGroup(group);
    setGroupBaseName(group.baseName);
    setGroupCategory(group.category);
    setGroupSubcategory(group.subcategory || first?.subcategory || '');
    setGroupUnit(first?.unit || 'unit');
    setGroupImage(withImg?.image || '');
    setGroupHsn(first?.hsnCode || '');
    setGroupPopular(group.popular);
    setGroupDescription(first?.description || '');
    setDeletedGroupVariantIds([]);

    const rows: GroupVariantEditRow[] = group.variants.map((v) => ({
      id: v.id,
      tempId: v.id,
      sizeLabel: group.variants.length > 1 || v.sizeLabel ? getVariantSizeLabel(v) : v.sizeLabel || '',
      price: String(v.price ?? 0),
      originalPrice: v.originalPrice ? String(v.originalPrice) : '',
      stockCount: String(v.stockCount ?? 100),
      stockStatus: v.stockStatus || 'in_stock',
      sku: v.sku || '',
      partCode: v.partCode || '',
    }));

    if (appendEmptySize) {
      rows.push({
        tempId: `new-sz-${Date.now()}`,
        sizeLabel: '',
        price: first ? String(first.price) : '',
        originalPrice: '',
        stockCount: '100',
        stockStatus: 'in_stock',
        sku: '',
        partCode: '',
      });
    }

    setGroupVariantRows(rows);
  };

  const handleGroupImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setGroupImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGroupEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !groupBaseName.trim()) return;

    const cleanBase = groupBaseName.trim();
    const validRows = groupVariantRows.filter((r) => r.sizeLabel.trim() || groupVariantRows.length === 1);
    if (validRows.length === 0) return;

    // 1. Delete any removed existing variants
    if (deletedGroupVariantIds.length > 0) {
      if (onDeleteProductsBatch) {
        await onDeleteProductsBatch(deletedGroupVariantIds);
      } else {
        deletedGroupVariantIds.forEach((id) => onDeleteProduct(id));
      }
    }

    const isMulti = validRows.length > 1 || Boolean(validRows[0]?.sizeLabel.trim());
    const updatesToSave: Product[] = [];
    const creationsToSave: Array<Partial<Product>> = [];

    validRows.forEach((row, idx) => {
      const sz = row.sizeLabel.trim();
      const fullName = isMulti && sz ? `${cleanBase} ${sz}` : cleanBase;
      const numericPrice = Math.max(0, Number(row.price) || 0);
      const numericOrig = row.originalPrice ? Number(row.originalPrice) : undefined;
      const numericStock = Math.max(0, Number(row.stockCount) || 0);

      if (row.id) {
        const origVariant = editingGroup.variants.find((v) => v.id === row.id);
        if (origVariant) {
          updatesToSave.push({
            ...origVariant,
            name: fullName,
            baseName: isMulti ? cleanBase : undefined,
            sizeLabel: isMulti ? sz : undefined,
            category: groupCategory,
            subcategory: groupSubcategory.trim(),
            unit: groupUnit,
            price: numericPrice,
            originalPrice: numericOrig,
            stockCount: numericStock,
            stockStatus: row.stockStatus,
            sku: row.sku.trim() || origVariant.sku,
            partCode: row.partCode.trim(),
            hsnCode: groupHsn.trim(),
            image: groupImage,
            popular: groupPopular,
            description: groupDescription,
          });
        }
      } else {
        creationsToSave.push({
          name: fullName,
          baseName: isMulti ? cleanBase : undefined,
          sizeLabel: isMulti ? sz : undefined,
          category: groupCategory,
          subcategory: groupSubcategory.trim(),
          unit: groupUnit,
          price: numericPrice,
          originalPrice: numericOrig,
          stockCount: numericStock,
          stockStatus: row.stockStatus,
          sku: row.sku.trim() || generateAutoSku(groupCategory, cleanBase, sz, idx),
          partCode: row.partCode.trim(),
          hsnCode: groupHsn.trim(),
          image: groupImage,
          popular: groupPopular,
          description: groupDescription,
        });
      }
    });

    if (updatesToSave.length > 0) {
      if (onUpdateProductsBatch) {
        await onUpdateProductsBatch(updatesToSave);
      } else {
        updatesToSave.forEach((u) => onUpdateProduct(u));
      }
    }

    if (creationsToSave.length > 0) {
      if (onAddProductsBatch) {
        await onAddProductsBatch(creationsToSave);
      } else {
        creationsToSave.forEach((c) => onAddProduct(c));
      }
    }

    // Ensure subcategory is saved in category config if new
    if (groupSubcategory.trim()) {
      ensureSubcategoryExistsInConfig(groupCategory, groupSubcategory.trim());
    }

    showToast(
      `Saved "${cleanBase}" (${validRows.length} ${validRows.length === 1 ? 'item' : 'sizes'}) permanently.`
    );
    setEditingGroup(null);
  };

  // ============================================================================
  // RAPID MATERIAL & MULTI-SIZE COMPOSER + BULK TABLE / PASTE STUDIO
  // ============================================================================
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [composerMode, setComposerMode] = useState<'builder' | 'bulk_table'>('builder');
  const [composerToast, setComposerToast] = useState<string>('');
  const mainNameInputRef = useRef<HTMLInputElement | null>(null);

  // Builder State (Single Material or Main Material + Sub-Materials by Size)
  const [newProductCategory, setNewProductCategory] = useState<ProductCategory>(
    categories[0]?.id || 'plumbing'
  );
  const [newProductSubcategory, setNewProductSubcategory] = useState<string>(
    categories[0]?.subcategories?.[0] || ''
  );
  const [isAddingInlineCategory, setIsAddingInlineCategory] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [isAddingInlineSubcategory, setIsAddingInlineSubcategory] = useState(false);
  const [inlineSubcategoryName, setInlineSubcategoryName] = useState('');

  const [newBaseName, setNewBaseName] = useState('');
  const [hasMultipleSizesMode, setHasMultipleSizesMode] = useState<boolean>(false);
  const [singlePrice, setSinglePrice] = useState<string>('');
  const [singleOriginalPrice, setSingleOriginalPrice] = useState<string>('');
  const [singleStock, setSingleStock] = useState<string>('100');
  const [singleSku, setSingleSku] = useState<string>('');
  const [sizeRows, setSizeRows] = useState<SizeDraftRow[]>([
    createEmptySizeRow(),
    createEmptySizeRow(),
  ]);

  const [newProductUnit, setNewProductUnit] = useState<ProductUnit>('unit');
  const [newProductHsnCode, setNewProductHsnCode] = useState('');
  const [newProductPopular, setNewProductPopular] = useState(false);
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');

  // Bulk Table / Paste State
  const [bulkEntryCategory, setBulkEntryCategory] = useState<string>(categories[0]?.id || 'plumbing');
  const [bulkEntrySubcategory, setBulkEntrySubcategory] = useState<string>(
    categories[0]?.subcategories?.[0] || ''
  );
  const [bulkEntryUnit, setBulkEntryUnit] = useState<ProductUnit>('unit');
  const [bulkPasteText, setBulkPasteText] = useState<string>('');
  const [bulkRows, setBulkRows] = useState<BulkDraftRow[]>([
    createEmptyBulkRow(categories[0]?.subcategories?.[0] || '', 'unit'),
    createEmptyBulkRow(categories[0]?.subcategories?.[0] || '', 'unit'),
    createEmptyBulkRow(categories[0]?.subcategories?.[0] || '', 'unit'),
    createEmptyBulkRow(categories[0]?.subcategories?.[0] || '', 'unit'),
  ]);

  const composerSubcategories = useMemo(
    () => getSubcategoriesForCategory(newProductCategory),
    [newProductCategory, categories, products]
  );

  const bulkEntrySubcategories = useMemo(
    () => getSubcategoriesForCategory(bulkEntryCategory),
    [bulkEntryCategory, categories, products]
  );

  const sizePresetsForComposer = useMemo(
    () => getCategorySizePresets(newProductCategory, newProductSubcategory),
    [newProductCategory, newProductSubcategory]
  );

  // Sync default subcategory when composer category changes
  const handleSelectComposerCategory = (catId: string) => {
    setNewProductCategory(catId);
    const subs = getSubcategoriesForCategory(catId);
    setNewProductSubcategory(subs[0] || '');
  };

  const handleOpenComposer = (
    mode: 'builder' | 'bulk_table' = 'builder',
    presetCat?: string,
    presetSub?: string,
    multiSizeDefault = false
  ) => {
    const targetCat =
      presetCat && presetCat !== 'all'
        ? presetCat
        : adminCategoryFilter !== 'all'
        ? adminCategoryFilter
        : categories[0]?.id || 'plumbing';
    const subs = getSubcategoriesForCategory(targetCat);
    const targetSub =
      presetSub && presetSub !== 'all'
        ? presetSub
        : adminSubcategoryFilter !== 'all' && subs.includes(adminSubcategoryFilter)
        ? adminSubcategoryFilter
        : subs[0] || '';

    setComposerMode(mode);
    setNewProductCategory(targetCat);
    setNewProductSubcategory(targetSub);
    setBulkEntryCategory(targetCat);
    setBulkEntrySubcategory(targetSub);
    setHasMultipleSizesMode(multiSizeDefault);
    setNewBaseName('');
    setSinglePrice('');
    setSingleOriginalPrice('');
    setSingleStock('100');
    setSingleSku('');
    setNewProductImage('');
    setNewProductDesc('');
    setSizeRows([createEmptySizeRow(), createEmptySizeRow()]);
    setComposerToast('');
    setShowAddProductModal(true);
  };

  // Clone / Duplicate an existing group into the Composer for fast entry
  const handleCloneGroup = (group: ProductGroup) => {
    const first = group.variants[0];
    const withImg = group.variants.find((v) => v.image && v.image.trim() !== '') || first;
    setComposerMode('builder');
    setNewProductCategory(group.category);
    setNewProductSubcategory(group.subcategory || '');
    setNewBaseName(`${group.baseName} (Copy)`);
    setNewProductUnit(first?.unit || 'unit');
    setNewProductHsnCode(first?.hsnCode || '');
    setNewProductPopular(group.popular);
    setNewProductImage(withImg?.image || '');
    setNewProductDesc(first?.description || '');

    if (group.variants.length > 1 || first?.sizeLabel) {
      setHasMultipleSizesMode(true);
      setSizeRows(
        group.variants.map((v) => ({
          tempId: `cln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sizeLabel: getVariantSizeLabel(v),
          price: String(v.price ?? ''),
          originalPrice: v.originalPrice ? String(v.originalPrice) : '',
          stockCount: String(v.stockCount ?? 100),
          sku: '',
          partCode: '',
        }))
      );
    } else {
      setHasMultipleSizesMode(false);
      setSinglePrice(String(first?.price ?? ''));
      setSingleOriginalPrice(first?.originalPrice ? String(first.originalPrice) : '');
      setSingleStock(String(first?.stockCount ?? 100));
      setSingleSku('');
    }
    setComposerToast('');
    setShowAddProductModal(true);
  };

  const ensureSubcategoryExistsInConfig = (catId: string, subName: string) => {
    const cleanSub = subName.trim();
    if (!cleanSub || !onUpdateCategories) return;
    const target = categories.find((c) => c.id.toLowerCase() === catId.toLowerCase());
    if (!target) return;
    const exists = target.subcategories.some((s) => s.toLowerCase() === cleanSub.toLowerCase());
    if (!exists) {
      const next = categories.map((c) =>
        c.id === target.id ? { ...c, subcategories: [...c.subcategories, cleanSub] } : c
      );
      onUpdateCategories(next);
    }
  };

  const handleCreateInlineCategory = async () => {
    const cleanName = inlineCategoryName.trim();
    if (!cleanName) return;
    const newId = slugifyCategoryId(cleanName);
    if (!categories.some((c) => c.id.toLowerCase() === newId.toLowerCase())) {
      const next: CategoryConfig[] = [
        ...categories,
        { id: newId, name: cleanName, subcategories: [] },
      ];
      if (onUpdateCategories) {
        await onUpdateCategories(next);
      }
    }
    setNewProductCategory(newId);
    setNewProductSubcategory('');
    setInlineCategoryName('');
    setIsAddingInlineCategory(false);
  };

  const handleCreateInlineSubcategory = async () => {
    const cleanSub = inlineSubcategoryName.trim();
    if (!cleanSub) return;
    ensureSubcategoryExistsInConfig(newProductCategory, cleanSub);
    setNewProductSubcategory(cleanSub);
    setInlineSubcategoryName('');
    setIsAddingInlineSubcategory(false);
  };

  const handleToggleSizePreset = (presetLabel: string) => {
    setHasMultipleSizesMode(true);
    setSizeRows((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.sizeLabel.trim().toLowerCase() === presetLabel.toLowerCase()
      );
      if (existingIdx !== -1) {
        const filtered = prev.filter((_, i) => i !== existingIdx);
        return filtered.length > 0 ? filtered : [createEmptySizeRow()];
      }
      // Fill into first empty row if available, otherwise append
      const emptyIdx = prev.findIndex((r) => !r.sizeLabel.trim() && !r.price.trim());
      if (emptyIdx !== -1) {
        return prev.map((r, i) => (i === emptyIdx ? { ...r, sizeLabel: presetLabel } : r));
      }
      return [...prev, createEmptySizeRow(presetLabel)];
    });
  };

  const handleAddAllPresets = () => {
    setHasMultipleSizesMode(true);
    setSizeRows((prev) => {
      const existingLabels = new Set(prev.map((r) => r.sizeLabel.trim().toLowerCase()).filter(Boolean));
      const keptNonEmpty = prev.filter((r) => r.sizeLabel.trim() || r.price.trim());
      const additions = sizePresetsForComposer
        .filter((p) => !existingLabels.has(p.toLowerCase()))
        .map((p) => createEmptySizeRow(p));
      const combined = [...keptNonEmpty, ...additions];
      return combined.length > 0 ? combined : [createEmptySizeRow()];
    });
  };

  const handleCopyFirstPriceToEmptySizeRows = () => {
    const firstWithPrice = sizeRows.find((r) => r.price.trim() !== '');
    if (!firstWithPrice) return;
    setSizeRows((prev) =>
      prev.map((r) => (r.price.trim() === '' ? { ...r, price: firstWithPrice.price } : r))
    );
  };

  const handleAutoMrpForSizeRows = () => {
    if (hasMultipleSizesMode) {
      setSizeRows((prev) =>
        prev.map((r) => {
          const p = Number(r.price);
          if (p > 0) {
            return { ...r, originalPrice: String(Math.round(p * 1.15 * 100) / 100) };
          }
          return r;
        })
      );
    } else {
      const p = Number(singlePrice);
      if (p > 0) {
        setSingleOriginalPrice(String(Math.round(p * 1.15 * 100) / 100));
      }
    }
  };

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

  const saveBuilderMaterial = async (keepOpenForNext: boolean) => {
    const cleanBase = newBaseName.trim();
    if (!cleanBase) return;

    if (newProductSubcategory.trim()) {
      ensureSubcategoryExistsInConfig(newProductCategory, newProductSubcategory.trim());
    }

    const itemsToCreate: Array<Partial<Product>> = [];

    if (!hasMultipleSizesMode) {
      const priceVal = Math.max(0, Number(singlePrice) || 0);
      const origVal = singleOriginalPrice ? Number(singleOriginalPrice) : undefined;
      const stockVal = Math.max(0, Number(singleStock) || 100);
      itemsToCreate.push({
        name: cleanBase,
        category: newProductCategory,
        subcategory: newProductSubcategory.trim(),
        price: priceVal,
        originalPrice: origVal,
        unit: newProductUnit,
        stockCount: stockVal,
        stockStatus: stockVal === 0 ? 'out_of_stock' : stockVal <= 10 ? 'low_stock' : 'in_stock',
        sku: singleSku.trim() || generateAutoSku(newProductCategory, cleanBase),
        hsnCode: newProductHsnCode.trim(),
        popular: newProductPopular,
        image: newProductImage,
        description: newProductDesc.trim(),
      });
    } else {
      const validSizes = sizeRows.filter((r) => r.sizeLabel.trim() !== '');
      if (validSizes.length === 0) return;

      validSizes.forEach((row, idx) => {
        const sz = row.sizeLabel.trim();
        const priceVal = Math.max(0, Number(row.price) || 0);
        const origVal = row.originalPrice ? Number(row.originalPrice) : undefined;
        const stockVal = Math.max(0, Number(row.stockCount) || 100);
        itemsToCreate.push({
          name: `${cleanBase} ${sz}`,
          baseName: cleanBase,
          sizeLabel: sz,
          category: newProductCategory,
          subcategory: newProductSubcategory.trim(),
          price: priceVal,
          originalPrice: origVal,
          unit: newProductUnit,
          stockCount: stockVal,
          stockStatus: stockVal === 0 ? 'out_of_stock' : stockVal <= 10 ? 'low_stock' : 'in_stock',
          sku: row.sku.trim() || generateAutoSku(newProductCategory, cleanBase, sz, idx),
          partCode: row.partCode.trim(),
          hsnCode: newProductHsnCode.trim(),
          popular: newProductPopular,
          image: newProductImage,
          description: newProductDesc.trim(),
        });
      });
    }

    if (itemsToCreate.length === 0) return;

    if (onAddProductsBatch) {
      await onAddProductsBatch(itemsToCreate);
    } else {
      itemsToCreate.forEach((item) => onAddProduct(item));
    }

    const summaryMsg =
      itemsToCreate.length > 1
        ? `Added "${cleanBase}" with ${itemsToCreate.length} size variants to ${getCategoryDisplayName(
            newProductCategory,
            categories
          )}.`
        : `Added "${cleanBase}" to ${getCategoryDisplayName(newProductCategory, categories)}.`;

    showToast(summaryMsg);

    if (keepOpenForNext) {
      setComposerToast(summaryMsg);
      setNewBaseName('');
      setSinglePrice('');
      setSingleOriginalPrice('');
      setSingleSku('');
      setSizeRows([createEmptySizeRow(), createEmptySizeRow()]);
      setTimeout(() => {
        mainNameInputRef.current?.focus();
      }, 50);
    } else {
      setShowAddProductModal(false);
    }
  };

  // Parse pasted lines into Bulk Rows
  const handleParseBulkText = () => {
    const lines = bulkPasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const parsed: BulkDraftRow[] = lines.map((line) => {
      // Split by tab, pipe, or comma
      const parts = line.includes('\t')
        ? line.split('\t').map((s) => s.trim())
        : line.includes('|')
        ? line.split('|').map((s) => s.trim())
        : line.split(',').map((s) => s.trim());

      if (parts.length >= 3) {
        return {
          tempId: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          baseName: parts[0] || '',
          sizeLabel: parts[1] || '',
          subcategory: bulkEntrySubcategory,
          price: parts[2]?.replace(/[^\d.]/g, '') || '',
          originalPrice: parts[3]?.replace(/[^\d.]/g, '') || '',
          unit: bulkEntryUnit,
          stockCount: '100',
        };
      }
      if (parts.length === 2) {
        return {
          tempId: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          baseName: parts[0] || '',
          sizeLabel: '',
          subcategory: bulkEntrySubcategory,
          price: parts[1]?.replace(/[^\d.]/g, '') || '',
          originalPrice: '',
          unit: bulkEntryUnit,
          stockCount: '100',
        };
      }
      return {
        tempId: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        baseName: line,
        sizeLabel: '',
        subcategory: bulkEntrySubcategory,
        price: '',
        unit: bulkEntryUnit,
        originalPrice: '',
        stockCount: '100',
      };
    });

    setBulkRows((prev) => {
      const nonEmptyExisting = prev.filter((r) => r.baseName.trim() !== '');
      return [...nonEmptyExisting, ...parsed];
    });
    setBulkPasteText('');
  };

  const handleSaveBulkTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = bulkRows.filter((r) => r.baseName.trim() !== '');
    if (valid.length === 0) return;

    // Count occurrences of baseName in this batch to know if multi-size
    const baseCounts = new Map<string, number>();
    valid.forEach((r) => {
      const k = r.baseName.trim().toLowerCase();
      baseCounts.set(k, (baseCounts.get(k) || 0) + 1);
    });

    const batchPayload: Array<Partial<Product>> = valid.map((row, idx) => {
      const cleanBase = row.baseName.trim();
      const sz = row.sizeLabel.trim();
      const isGrouped = Boolean(sz) || (baseCounts.get(cleanBase.toLowerCase()) || 0) > 1;
      const fullName = sz ? `${cleanBase} ${sz}` : cleanBase;
      const priceNum = Math.max(0, Number(row.price) || 0);
      const origNum = row.originalPrice ? Number(row.originalPrice) : undefined;
      const stockNum = Math.max(0, Number(row.stockCount) || 100);
      const sub = (row.subcategory || bulkEntrySubcategory || '').trim();

      if (sub) {
        ensureSubcategoryExistsInConfig(bulkEntryCategory, sub);
      }

      return {
        name: fullName,
        baseName: isGrouped ? cleanBase : undefined,
        sizeLabel: sz || undefined,
        category: bulkEntryCategory,
        subcategory: sub,
        price: priceNum,
        originalPrice: origNum,
        unit: row.unit || bulkEntryUnit,
        stockCount: stockNum,
        stockStatus: stockNum === 0 ? 'out_of_stock' : stockNum <= 10 ? 'low_stock' : 'in_stock',
        sku: generateAutoSku(bulkEntryCategory, cleanBase, sz, idx),
        image: '',
        description: '',
        popular: false,
      };
    });

    if (onAddProductsBatch) {
      await onAddProductsBatch(batchPayload);
    } else {
      batchPayload.forEach((p) => onAddProduct(p));
    }

    showToast(
      `Bulk-added ${batchPayload.length} materials into ${getCategoryDisplayName(
        bulkEntryCategory,
        categories
      )}.`
    );
    setBulkRows([
      createEmptyBulkRow(bulkEntrySubcategory, bulkEntryUnit),
      createEmptyBulkRow(bulkEntrySubcategory, bulkEntryUnit),
      createEmptyBulkRow(bulkEntrySubcategory, bulkEntryUnit),
    ]);
    setShowAddProductModal(false);
  };

  // ============================================================================
  // CATEGORIES & SUBCATEGORIES MANAGER TAB STATE
  // ============================================================================
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubs, setNewCatSubs] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [subInputsByCat, setSubInputsByCat] = useState<Record<string, string>>({});
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState<string>('');
  const [categoryToRemove, setCategoryToRemove] = useState<CategoryConfig | null>(null);
  const [removeCatAction, setRemoveCatAction] = useState<'reassign' | 'delete'>('reassign');
  const [removeCatTargetId, setRemoveCatTargetId] = useState<string>('');
  const [categoryNotice, setCategoryNotice] = useState<string>('');

  const showCategoryToast = (msg: string) => {
    setCategoryNotice(msg);
    setTimeout(() => setCategoryNotice(''), 4000);
  };

  const handleAddMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName || !onUpdateCategories) return;

    let newId = slugifyCategoryId(cleanName);
    if (categories.some((c) => c.id.toLowerCase() === newId.toLowerCase())) {
      newId = `${newId}-${Math.floor(10 + Math.random() * 89)}`;
    }
    const parsedSubs: string[] = Array.from(
      new Set<string>(
        newCatSubs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    const updated: CategoryConfig[] = [
      ...categories,
      {
        id: newId,
        name: cleanName,
        subcategories: parsedSubs,
        description: newCatDesc.trim(),
      },
    ];
    await onUpdateCategories(updated);
    setNewCatName('');
    setNewCatSubs('');
    setNewCatDesc('');
    showCategoryToast(`Added main category "${cleanName}" to storefront & admin.`);
  };

  const handleSaveCategoryRename = async (catId: string) => {
    const clean = editingCatName.trim();
    if (!clean || !onUpdateCategories) {
      setEditingCatId(null);
      return;
    }
    const updated = categories.map((c) => (c.id === catId ? { ...c, name: clean } : c));
    await onUpdateCategories(updated);
    setEditingCatId(null);
    showCategoryToast(`Renamed category to "${clean}".`);
  };

  const handleMoveCategory = async (index: number, direction: -1 | 1) => {
    if (!onUpdateCategories) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const copy = [...categories];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    await onUpdateCategories(copy);
  };

  const handleAddSubcategoryToMain = async (catId: string) => {
    const raw = (subInputsByCat[catId] || '').trim();
    if (!raw || !onUpdateCategories) return;
    const additions = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (additions.length === 0) return;

    const updated = categories.map((c) => {
      if (c.id !== catId) return c;
      const existingLower = new Set(c.subcategories.map((s) => s.toLowerCase()));
      const merged = [...c.subcategories];
      additions.forEach((a) => {
        if (!existingLower.has(a.toLowerCase())) {
          existingLower.add(a.toLowerCase());
          merged.push(a);
        }
      });
      return { ...c, subcategories: merged };
    });

    await onUpdateCategories(updated);
    setSubInputsByCat((prev) => ({ ...prev, [catId]: '' }));
    showCategoryToast(`Added ${additions.join(', ')} under ${getCategoryDisplayName(catId, updated)}.`);
  };

  const handleRemoveSubcategoryFromMain = async (catId: string, subToRemove: string) => {
    if (!onUpdateCategories) return;
    const updated = categories.map((c) =>
      c.id === catId
        ? {
            ...c,
            subcategories: c.subcategories.filter(
              (s) => s.toLowerCase() !== subToRemove.toLowerCase()
            ),
          }
        : c
    );
    await onUpdateCategories(updated);
    showCategoryToast(`Removed subcategory "${subToRemove}".`);
  };

  const handlePromptRemoveCategory = (cat: CategoryConfig) => {
    const count = products.filter((p) => p.category.toLowerCase() === cat.id.toLowerCase()).length;
    if (count === 0) {
      if (onUpdateCategories) {
        const next = categories.filter((c) => c.id !== cat.id);
        onUpdateCategories(next);
        showCategoryToast(`Removed main category "${cat.name}".`);
      }
      return;
    }
    const fallbackCat = categories.find((c) => c.id !== cat.id)?.id || 'plumbing';
    setRemoveCatAction('reassign');
    setRemoveCatTargetId(fallbackCat);
    setCategoryToRemove(cat);
  };

  const handleConfirmRemoveCategory = async () => {
    if (!categoryToRemove || !onUpdateCategories) return;
    const nextCategories = categories.filter((c) => c.id !== categoryToRemove.id);
    await onUpdateCategories(nextCategories);
    if (onReassignCategory) {
      await onReassignCategory(
        categoryToRemove.id,
        removeCatAction,
        removeCatAction === 'reassign' ? removeCatTargetId : undefined
      );
    }
    showCategoryToast(`Removed category "${categoryToRemove.name}".`);
    setCategoryToRemove(null);
  };

  const handleRestoreDefaultCategories = async () => {
    if (!onUpdateCategories) return;
    // Merge existing custom categories/subcategories with default required ones so nothing is lost accidentally
    const byId = new Map(categories.map((c) => [c.id.toLowerCase(), c]));
    const restored: CategoryConfig[] = DEFAULT_CATEGORIES.map((def) => {
      const existing = byId.get(def.id.toLowerCase());
      if (!existing) {
        return { ...def, subcategories: [...def.subcategories] };
      }
      const subSet = new Set(def.subcategories.map((s) => s.toLowerCase()));
      const extraSubs = existing.subcategories.filter((s) => !subSet.has(s.toLowerCase()));
      return {
        ...def,
        name: existing.name || def.name,
        subcategories: [...def.subcategories, ...extraSubs],
      };
    });
    // Keep any extra custom main categories at the end
    categories.forEach((c) => {
      if (!DEFAULT_CATEGORIES.some((d) => d.id.toLowerCase() === c.id.toLowerCase())) {
        restored.push(c);
      }
    });
    await onUpdateCategories(restored);
    showCategoryToast('Verified & restored all default Main Categories and Subcategories.');
  };

  // ============================================================================
  // BOOKINGS FILTER
  // ============================================================================
  const [bookingChannelFilter, setBookingChannelFilter] = useState<string>('all');
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);

  const filteredBookings = bookings.filter((b) => {
    if (bookingChannelFilter === 'all') return true;
    return b.bookingType === bookingChannelFilter;
  });

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen py-6 px-4 border-t border-slate-200">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Admin Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Store Admin, Categories &amp; Material Studio
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {products.length} total material SKUs · {categories.length} main categories · Persistent disk storage active
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenComposer('builder', undefined, undefined, false)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Material / Sizes
            </button>
            <button
              type="button"
              onClick={() => handleOpenComposer('bulk_table')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Table className="w-4 h-4" /> Bulk Table / Paste
            </button>
            <button
              type="button"
              onClick={onCloseAdmin}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <X className="w-4 h-4" /> Exit Admin
            </button>
          </div>
        </div>

        {/* Workspace Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-3 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('prices')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 border whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'prices'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 stroke-[2.5]" /> Materials &amp; Sizes ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 border whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 stroke-[2.5]" /> Categories &amp; Subcategories ({categories.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 border whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" /> Incoming Bookings ({bookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 border whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 stroke-[2.5]" /> Store &amp; Helpline Settings
          </button>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: MATERIALS, SIZES & BULK PRICE MANAGER                          */}
        {/* ===================================================================== */}
        {activeTab === 'prices' && (
          <div className="space-y-6">
            {productSaveNotice && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{productSaveNotice}</span>
              </div>
            )}

            {deleteNotice && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{deleteNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteNotice('')}
                  className="text-rose-600 hover:text-rose-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Action Cards: Bulk Price Adjuster + Rapid Material Entry Shortcuts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Bulk Price Adjuster Card */}
              <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Bulk Category Price Adjuster
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Adjust prices by % across any main category
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Target Category
                    </label>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="all">All Catalog Items</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      % Change (+ or -)
                    </label>
                    <input
                      type="number"
                      value={bulkPercentage}
                      onChange={(e) => setBulkPercentage(Number(e.target.value))}
                      placeholder="e.g. 5 or -10"
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono tabular-nums font-bold rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleExecuteBulkPriceUpdate}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Apply % Change
                    </button>
                  </div>
                </div>

                {bulkSuccessMessage && (
                  <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-center">
                    {bulkSuccessMessage}
                  </p>
                )}
              </div>

              {/* Rapid Material Entry Card */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Fast Material &amp; Size Entry
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Add single items, main materials with multiple sizes, or paste multi-item lists into any category.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenComposer('builder', undefined, undefined, false)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Single Item
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenComposer('builder', undefined, undefined, true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" /> Multi-Size Item
                  </button>
                </div>
              </div>
            </div>

            {/* Live Catalog Manager Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              {/* Top Controls: Title, View Switcher, Search */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Live Material Catalog ({filteredAdminGroups.length} main materials ·{' '}
                    {filteredAdminProducts.length} variants)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Filter by category/subcategory, manage size variants together, clone items, or edit prices inline.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* View Toggle: Grouped vs Flat */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCatalogViewMode('grouped')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                        catalogViewMode === 'grouped'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> Grouped by Material
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogViewMode('flat')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                        catalogViewMode === 'flat'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" /> All Variants (Inline Edit)
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, size, SKU..."
                      value={adminProductSearch}
                      onChange={(e) => setAdminProductSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Category & Subcategory Filter Bar inside Admin */}
              <div className="space-y-2 border-y border-slate-100 py-3">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminCategoryFilter('all');
                      setAdminSubcategoryFilter('all');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                      adminCategoryFilter === 'all'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All Materials ({products.length})
                  </button>
                  {categories.map((cat) => {
                    const count = products.filter(
                      (p) => p.category.toLowerCase() === cat.id.toLowerCase()
                    ).length;
                    const active = adminCategoryFilter.toLowerCase() === cat.id.toLowerCase();
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setAdminCategoryFilter(cat.id);
                          setAdminSubcategoryFilter('all');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>

                {adminCategoryFilter !== 'all' && activeFilterSubcategories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setAdminSubcategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                        adminSubcategoryFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Subcategories
                    </button>
                    {activeFilterSubcategories.map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setAdminSubcategoryFilter(sub)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                          adminSubcategoryFilter.toLowerCase() === sub.toLowerCase()
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenComposer(
                          'builder',
                          adminCategoryFilter,
                          adminSubcategoryFilter !== 'all' ? adminSubcategoryFilter : undefined
                        )
                      }
                      className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      + Add to {getCategoryDisplayName(adminCategoryFilter, categories)}
                    </button>
                  </div>
                )}
              </div>

              {/* Empty state when category has 0 items */}
              {filteredAdminProducts.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm font-bold text-slate-800">
                    No materials found in this view
                  </p>
                  <p className="text-xs text-slate-500">
                    Add a single material, a multi-size material group, or bulk paste items right into this category.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenComposer(
                          'builder',
                          adminCategoryFilter !== 'all' ? adminCategoryFilter : undefined,
                          adminSubcategoryFilter !== 'all' ? adminSubcategoryFilter : undefined,
                          false
                        )
                      }
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                    >
                      + Add Material Here
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenComposer(
                          'builder',
                          adminCategoryFilter !== 'all' ? adminCategoryFilter : undefined,
                          adminSubcategoryFilter !== 'all' ? adminSubcategoryFilter : undefined,
                          true
                        )
                      }
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                    >
                      + Add Multi-Size Material
                    </button>
                  </div>
                </div>
              ) : catalogViewMode === 'grouped' ? (
                /* GROUPED BY MAIN MATERIAL TABLE */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Main Material</th>
                        <th className="py-3 px-3">Category · Subcategory</th>
                        <th className="py-3 px-3">Sizes / Sub-Materials &amp; Prices</th>
                        <th className="py-3 px-3">Price Range</th>
                        <th className="py-3 px-3 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdminGroups.map((group) => {
                        const first = group.variants[0];
                        const imgVariant =
                          group.variants.find((v) => v.image && v.image.trim() !== '') || first;
                        const isMulti = group.variants.length > 1 || Boolean(first?.sizeLabel);
                        const positivePrices = group.variants
                          .filter((v) => v.price > 0)
                          .map((v) => v.price);
                        const minP = positivePrices.length > 0 ? Math.min(...positivePrices) : 0;
                        const maxP = positivePrices.length > 0 ? Math.max(...positivePrices) : 0;

                        return (
                          <tr key={group.key} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                {imgVariant?.image && imgVariant.image.trim() !== '' ? (
                                  <img
                                    src={imgVariant.image}
                                    alt={group.baseName}
                                    className="w-9 h-9 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                    {getCategorySmallIcon(group.category)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 block truncate max-w-[220px]">
                                    {group.baseName}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {group.variants.length}{' '}
                                    {group.variants.length === 1 ? 'variant' : 'sizes'}
                                    {group.popular ? ' · ★ Favorite' : ''}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-bold text-amber-800 block">
                                {getCategoryDisplayName(group.category, categories)}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {group.subcategory || 'General'}
                              </span>
                            </td>

                            <td className="py-3 px-3 max-w-md">
                              {isMulti ? (
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-700 font-mono tabular-nums">
                                  {group.variants.slice(0, 6).map((v) => (
                                    <span key={v.id} className="whitespace-nowrap">
                                      <strong className="text-slate-900">
                                        {getVariantSizeLabel(v)}:
                                      </strong>{' '}
                                      {v.price > 0 ? `₹${v.price}` : 'Quote'}
                                    </span>
                                  ))}
                                  {group.variants.length > 6 && (
                                    <span className="text-slate-400">
                                      +{group.variants.length - 6} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                  Single item · SKU: {first?.sku}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 font-mono tabular-nums font-bold text-amber-800 whitespace-nowrap">
                              {minP > 0 ? (
                                maxP > minP ? (
                                  `₹${minP.toFixed(2)} – ₹${maxP.toFixed(2)}`
                                ) : (
                                  `₹${minP.toFixed(2)} / ${first?.unit || 'unit'}`
                                )
                              ) : (
                                <span className="text-slate-500">Quote on Request</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenGroupEditor(group, true)}
                                  className="bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 font-bold px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                  title="Add another size to this main material"
                                >
                                  <Plus className="w-3 h-3 stroke-[2.5]" />
                                  <span>Add Size</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenGroupEditor(group, false)}
                                  className="bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-slate-950 border border-amber-200 font-bold px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                  title="Edit main material and all sizes"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>{group.variants.length > 1 ? 'Sizes / Edit' : 'Edit'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCloneGroup(group)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-2 py-1 rounded-lg transition text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                  title="Duplicate as template for a new material"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span className="hidden xl:inline">Clone</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    group.variants.length > 1
                                      ? setGroupToDelete(group)
                                      : setProductToDelete(first)
                                  }
                                  className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold px-2 py-1 rounded-lg transition text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                  title={`Remove ${group.baseName}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* FLAT INDIVIDUAL VARIANTS TABLE WITH INLINE QUICK EDIT */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Material &amp; Size</th>
                        <th className="py-3 px-3">Category · Subcategory</th>
                        <th className="py-3 px-3">Quick Price (₹)</th>
                        <th className="py-3 px-3">Quick Stock</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdminProducts.map((p) => {
                        const currentPriceVal =
                          inlinePrices[p.id] !== undefined ? inlinePrices[p.id] : String(p.price);
                        const currentStockVal =
                          inlineStocks[p.id] !== undefined
                            ? inlineStocks[p.id]
                            : String(p.stockCount);
                        const isDirty =
                          (inlinePrices[p.id] !== undefined &&
                            Number(inlinePrices[p.id]) !== p.price) ||
                          (inlineStocks[p.id] !== undefined &&
                            Number(inlineStocks[p.id]) !== p.stockCount);

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                {p.image && p.image.trim() !== '' ? (
                                  <img
                                    src={p.image}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover bg-white border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                    {getCategorySmallIcon(p.category)}
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-slate-900 block">{p.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                                    SKU: {p.sku}
                                    {p.sizeLabel ? ` · Size: ${p.sizeLabel}` : ''}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-amber-800 block">
                                {getCategoryDisplayName(p.category, categories)}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {p.subcategory || '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 font-mono">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={currentPriceVal}
                                  onChange={(e) =>
                                    setInlinePrices((prev) => ({ ...prev, [p.id]: e.target.value }))
                                  }
                                  onBlur={() => handleSaveInlineRow(p)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveInlineRow(p);
                                  }}
                                  className="w-24 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded px-2 py-1 font-mono tabular-nums font-bold text-slate-900 text-xs outline-none"
                                />
                                <span className="text-[11px] text-slate-400">/{p.unit}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                value={currentStockVal}
                                onChange={(e) =>
                                  setInlineStocks((prev) => ({ ...prev, [p.id]: e.target.value }))
                                }
                                onBlur={() => handleSaveInlineRow(p)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineRow(p);
                                }}
                                className="w-20 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded px-2 py-1 font-mono tabular-nums font-bold text-slate-900 text-xs outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-[11px] font-semibold">
                              <span
                                className={
                                  p.stockStatus === 'in_stock'
                                    ? 'text-emerald-700'
                                    : p.stockStatus === 'low_stock'
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }
                              >
                                {p.stockStatus.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isDirty && (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineRow(p)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded-lg text-[11px] cursor-pointer"
                                  >
                                    Save
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditProduct(p)}
                                  className="bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-slate-950 border border-amber-200 font-bold px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setProductToDelete(p)}
                                  className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: CATEGORIES & SUBCATEGORIES MANAGER                             */}
        {/* ===================================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {categoryNotice && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{categoryNotice}</span>
              </div>
            )}

            {/* Add New Main Category Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-amber-600" /> Add New Main Category
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create a new main department tab on the storefront along with its subcategories.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreDefaultCategories}
                  className="self-start sm:self-auto text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer"
                >
                  Restore Default Categories
                </button>
              </div>

              <form onSubmit={handleAddMainCategory} className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                <div className="md:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    Main Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sanitaryware, Paints"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="block font-bold text-slate-700 mb-1">
                    Subcategories (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wash Basins, Taps, Showers"
                    value={newCatSubs}
                    onChange={(e) => setNewCatSubs(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="md:col-span-4 flex flex-col justify-end">
                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-lg transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Create Main Category
                  </button>
                </div>
              </form>
            </div>

            {/* Active Main Categories & Their Subcategories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat, idx) => {
                const catProducts = products.filter(
                  (p) => p.category.toLowerCase() === cat.id.toLowerCase()
                );
                const mergedSubs = getSubcategoriesForCategory(cat.id);

                return (
                  <div
                    key={cat.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Category Header Row */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                            {getCategorySmallIcon(cat.id)}
                          </div>
                          <div className="min-w-0">
                            {editingCatId === cat.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingCatName}
                                  onChange={(e) => setEditingCatName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCategoryRename(cat.id);
                                    if (e.key === 'Escape') setEditingCatId(null);
                                  }}
                                  className="bg-slate-50 border border-amber-400 rounded px-2 py-1 text-sm font-bold text-slate-900 outline-none w-36"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveCategoryRename(cat.id)}
                                  className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-1 rounded cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-extrabold text-slate-900 truncate">
                                  {cat.name}
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCatId(cat.id);
                                    setEditingCatName(cat.name);
                                  }}
                                  className="text-slate-400 hover:text-amber-600 transition cursor-pointer"
                                  title="Rename main category"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {catProducts.length} SKUs · {mergedSubs.length} subcategories
                            </p>
                          </div>
                        </div>

                        {/* Reorder & Remove Category Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveCategory(idx, -1)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-35 transition cursor-pointer"
                            title="Move earlier in navigation bar"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === categories.length - 1}
                            onClick={() => handleMoveCategory(idx, 1)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-35 transition cursor-pointer"
                            title="Move later in navigation bar"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptRemoveCategory(cat)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition cursor-pointer"
                            title={`Remove ${cat.name} category`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subcategories List */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block mb-2">
                          Subcategories in {cat.name}:
                        </span>
                        {mergedSubs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            No subcategories yet. Add one below.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {mergedSubs.map((sub) => {
                              const subCount = catProducts.filter(
                                (p) => (p.subcategory || '').toLowerCase() === sub.toLowerCase()
                              ).length;
                              const isConfigured = cat.subcategories.some(
                                (s) => s.toLowerCase() === sub.toLowerCase()
                              );
                              return (
                                <div
                                  key={sub}
                                  className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleOpenComposer('builder', cat.id, sub)}
                                    className="font-semibold hover:text-amber-700 transition cursor-pointer"
                                    title={`Click to add material to ${cat.name} › ${sub}`}
                                  >
                                    {sub}
                                  </button>
                                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                                    ({subCount})
                                  </span>
                                  {isConfigured && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSubcategoryFromMain(cat.id, sub)}
                                      className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                      title={`Remove ${sub}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Subcategory + Quick Add Material Footer */}
                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`Add subcategory to ${cat.name} (comma-separated)...`}
                          value={subInputsByCat[cat.id] || ''}
                          onChange={(e) =>
                            setSubInputsByCat((prev) => ({ ...prev, [cat.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubcategoryToMain(cat.id);
                            }
                          }}
                          className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSubcategoryToMain(cat.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition cursor-pointer"
                        >
                          + Add Sub
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setAdminCategoryFilter(cat.id);
                            setAdminSubcategoryFilter('all');
                            setActiveTab('prices');
                          }}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                        >
                          View {catProducts.length} items in {cat.name} →
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenComposer('builder', cat.id, mergedSubs[0] || '')}
                          className="text-xs font-extrabold text-amber-700 hover:text-amber-800 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Material to {cat.name}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: INCOMING BOOKINGS QUEUE                                        */}
        {/* ===================================================================== */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Incoming Bookings &amp; Dispatch Manager
                </h3>
                <p className="text-xs text-slate-500">
                  Orders across Cart Delivery, Phone Callbacks, Image Slip OCR, and WhatsApp
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setBookingChannelFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                    bookingChannelFilter === 'all'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({bookings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBookingChannelFilter('cart_delivery')}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                    bookingChannelFilter === 'cart_delivery'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cart
                </button>
                <button
                  type="button"
                  onClick={() => setBookingChannelFilter('phone_callback')}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                    bookingChannelFilter === 'phone_callback'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Phone Call
                </button>
                <button
                  type="button"
                  onClick={() => setBookingChannelFilter('image_upload')}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                    bookingChannelFilter === 'image_upload'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Image Slip
                </button>
                <button
                  type="button"
                  onClick={() => setBookingChannelFilter('whatsapp_order')}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                    bookingChannelFilter === 'whatsapp_order'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            </div>

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
                    className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 hover:border-amber-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-amber-700 text-sm">
                          {booking.id}
                        </span>
                        <span className="text-slate-500 font-semibold uppercase">
                          · {booking.bookingType.replace('_', ' ')}
                        </span>
                        <span className="text-slate-400">
                          ·{' '}
                          {new Date(booking.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={booking.status}
                          onChange={(e: any) => onUpdateBookingStatus(booking.id, e.target.value)}
                          className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
                        >
                          <option value="new">New Order</option>
                          <option value="packing">Accepted &amp; Packing</option>
                          <option value="dispatched">Dispatched (En Route)</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>

                        {booking.status === 'new' && (
                          <button
                            type="button"
                            onClick={() => onUpdateBookingStatus(booking.id, 'packing')}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-lg text-xs transition flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" /> Accept &amp; Pack
                          </button>
                        )}

                        {booking.status === 'packing' && (
                          <button
                            type="button"
                            onClick={() => onUpdateBookingStatus(booking.id, 'dispatched')}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1 rounded-lg text-xs transition flex items-center gap-1"
                          >
                            <Truck className="w-3.5 h-3.5" /> Dispatch Rider
                          </button>
                        )}

                        {booking.status === 'dispatched' && (
                          <button
                            type="button"
                            onClick={() => onUpdateBookingStatus(booking.id, 'delivered')}
                            className="bg-green-600 hover:bg-green-500 text-white font-black px-3 py-1 rounded-lg text-xs transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Site:{' '}
                          <strong className="text-slate-900">
                            {booking.deliveryAddress || 'Hyderabad'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono tabular-nums text-xs">
                        <span className="text-slate-500">
                          Dist:{' '}
                          <strong className="text-amber-700 font-bold">
                            {booking.distanceKm || estimate.distanceKm} km
                          </strong>
                        </span>
                        <span className="text-emerald-700 font-extrabold">ETA: 15-30 mins</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">
                          Customer &amp; Plumber:
                        </span>
                        <p className="font-bold text-slate-900">{booking.customerName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <a
                            href={`tel:${booking.plumberPhone}`}
                            className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-mono font-black px-2.5 py-1 rounded-md text-xs border border-emerald-200 transition flex items-center gap-1"
                          >
                            <PhoneCall className="w-3.5 h-3.5" /> Call:{' '}
                            {booking.plumberPhone || 'N/A'}
                          </a>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">
                          Recipient Details:
                        </span>
                        <p className="font-bold text-slate-900">
                          {booking.recipientName || booking.customerName}
                        </p>
                        <p className="text-[11px] text-amber-700 font-mono font-bold">
                          {booking.recipientPhone || booking.plumberPhone}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">
                          Address &amp; Notes:
                        </span>
                        <p className="text-slate-800 font-medium text-xs">
                          {booking.deliveryAddress || 'No address specified'}
                        </p>
                        {booking.notes && (
                          <p className="mt-1 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 p-1.5 rounded">
                            {booking.notes}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-500 block font-semibold mb-0.5">
                          Order Total / Payment:
                        </span>
                        <p className="font-mono tabular-nums font-black text-amber-700 text-sm">
                          ₹{booking.totalPrice.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-slate-500 uppercase font-bold">
                          {booking.paymentMethod?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    {booking.geminiAnalysis && (
                      <div className="bg-cyan-50/50 border border-cyan-200 p-3 rounded-xl space-y-1 text-xs">
                        <span className="text-cyan-800 font-extrabold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-600" /> Extracted Slip Items
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {booking.geminiAnalysis.detectedItems.map((item, i) => (
                            <span
                              key={i}
                              className="bg-white text-slate-800 border border-cyan-200 px-2 py-0.5 rounded font-mono text-[11px]"
                            >
                              {item.estimatedQty}x {item.name} (₹
                              {item.estimatedUnitPrice.toFixed(2)}/unit)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {booking.imageBase64 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingForDetail(booking)}
                          className="text-cyan-700 hover:underline text-xs font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Uploaded Material Photo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: STORE SETTINGS & DATABASE                                      */}
        {/* ===================================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      Persistent Server Storage
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Disk JSON Storage:{' '}
                      <code className="text-amber-700 font-mono font-bold">/data/*.json</code>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncStorage}
                  disabled={isSyncingDb}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingDb ? 'animate-spin' : ''}`} />
                  {isSyncingDb ? 'Syncing...' : 'Verify & Sync Storage'}
                </button>
              </div>

              {dbSyncNotice && (
                <div className="bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-xl text-xs font-mono">
                  {dbSyncNotice}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                    Catalog SKUs
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
                    {dbStatus?.counts.products ?? products.length}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                    Main Categories
                  </span>
                  <span className="text-lg font-black text-amber-600 font-mono tabular-nums">
                    {categories.length}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                    Bookings Queue
                  </span>
                  <span className="text-lg font-black text-cyan-700 font-mono tabular-nums">
                    {dbStatus?.counts.bookings ?? bookings.length}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                    Storage Engine
                  </span>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    Persistent Disk
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-black text-slate-900 text-base">
                  Store, Helpline &amp; Billing Configuration
                </h3>
                <p className="text-[11px] text-slate-500">
                  All changes made here are saved permanently to server persistent storage.
                </p>
              </div>

              {settingsSaveNotice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{settingsSaveNotice}</span>
                </div>
              )}

              <form onSubmit={handleSaveAllSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Helpline Phone Number
                    </label>
                    <input
                      type="text"
                      value={settingsForm.helplineNumber}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, helplineNumber: e.target.value }))
                      }
                      onBlur={() => onUpdateStoreSettings(settingsForm)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      WhatsApp Order Number
                    </label>
                    <input
                      type="text"
                      value={settingsForm.whatsappNumber}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                      }
                      onBlur={() => onUpdateStoreSettings(settingsForm)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider block">
                    Online Billing &amp; Service Charges
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Platform Fee (₹)
                      </label>
                      <input
                        type="number"
                        value={settingsForm.platformFee ?? 5}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            platformFee: Number(e.target.value),
                          }))
                        }
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-mono tabular-nums font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Handling Charges (₹)
                      </label>
                      <input
                        type="number"
                        value={settingsForm.handlingFee ?? 10}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            handlingFee: Number(e.target.value),
                          }))
                        }
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-mono tabular-nums font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Min Order Free Delivery (₹)
                      </label>
                      <input
                        type="number"
                        value={settingsForm.minOrderFreeDelivery ?? 199}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            minOrderFreeDelivery: Number(e.target.value),
                          }))
                        }
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-mono tabular-nums font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                    Online UPI &amp; QR Scanner Settings
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Primary UPI ID</label>
                      <input
                        type="text"
                        value={settingsForm.upiId || 'mr.vinnu10@okicici'}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({ ...prev, upiId: e.target.value }))
                        }
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-emerald-700 font-mono font-bold px-3 py-2 rounded-lg focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={settingsForm.accountHolderName || 'THappetla Vinay Kumar'}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            accountHolderName: e.target.value,
                          }))
                        }
                        onBlur={() => onUpdateStoreSettings(settingsForm)}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-bold px-3 py-2 rounded-lg focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Standard Express Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.deliveryFeeExpress}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          deliveryFeeExpress: Number(e.target.value),
                        }))
                      }
                      onBlur={() => onUpdateStoreSettings(settingsForm)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono tabular-nums font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Admin Passcode PIN
                    </label>
                    <input
                      type="text"
                      value={settingsForm.adminPin}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, adminPin: e.target.value }))
                      }
                      onBlur={() => onUpdateStoreSettings(settingsForm)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Top Announcement Notice Banner
                  </label>
                  <input
                    type="text"
                    value={settingsForm.activeDeliveryNotice}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        activeDeliveryNotice: e.target.value,
                      }))
                    }
                    onBlur={() => onUpdateStoreSettings(settingsForm)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingSettings ? 'Saving Changes...' : 'Save Store Settings Permanently'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 1: ADD MATERIAL / MULTI-SIZE BUILDER / BULK SPREADSHEET STUDIO  */}
        {/* ===================================================================== */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-5 sm:p-6 text-slate-900 shadow-2xl relative space-y-4 my-auto max-h-[92vh] overflow-y-auto">
              {/* Modal Header + Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 pr-8">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Add Materials to Store Catalog
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Add single materials, main materials with multiple sizes, or bulk-paste spreadsheets
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setComposerMode('builder')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      composerMode === 'builder'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Material &amp; Sizes Builder
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerMode('bulk_table')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      composerMode === 'bulk_table'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bulk Table / Paste
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {composerToast && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {composerToast}
                  </span>
                  <span className="text-[11px] text-emerald-700">Ready for next item</span>
                </div>
              )}

              {composerMode === 'builder' ? (
                /* MODE A: SINGLE OR MULTI-SIZE MATERIAL BUILDER */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveBuilderMaterial(false);
                  }}
                  className="space-y-4 text-xs"
                >
                  {/* Step 1: Main Category & Subcategory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Main Category *</label>
                        <button
                          type="button"
                          onClick={() => setIsAddingInlineCategory((v) => !v)}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                        >
                          {isAddingInlineCategory ? 'Cancel' : '+ New Main Category'}
                        </button>
                      </div>
                      {isAddingInlineCategory ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="New category name..."
                            value={inlineCategoryName}
                            onChange={(e) => setInlineCategoryName(e.target.value)}
                            className="flex-1 bg-white border border-amber-400 rounded-lg px-2.5 py-2 font-semibold outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleCreateInlineCategory}
                            className="bg-amber-500 text-slate-950 font-bold px-3 py-2 rounded-lg whitespace-nowrap cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <select
                          value={newProductCategory}
                          onChange={(e) => handleSelectComposerCategory(e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg font-bold focus:outline-none focus:border-amber-500"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Subcategory</label>
                        <button
                          type="button"
                          onClick={() => setIsAddingInlineSubcategory((v) => !v)}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                        >
                          {isAddingInlineSubcategory ? 'Cancel' : '+ New Subcategory'}
                        </button>
                      </div>
                      {isAddingInlineSubcategory ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="New subcategory name..."
                            value={inlineSubcategoryName}
                            onChange={(e) => setInlineSubcategoryName(e.target.value)}
                            className="flex-1 bg-white border border-amber-400 rounded-lg px-2.5 py-2 font-semibold outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleCreateInlineSubcategory}
                            className="bg-amber-500 text-slate-950 font-bold px-3 py-2 rounded-lg whitespace-nowrap cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <select
                          value={newProductSubcategory}
                          onChange={(e) => setNewProductSubcategory(e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg font-semibold focus:outline-none focus:border-amber-500"
                        >
                          <option value="">General / Uncategorized</option>
                          {composerSubcategories.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Main Material Name, Unit & HSN */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="block font-bold mb-1 text-slate-700">
                        Main Material Name *
                      </label>
                      <input
                        ref={mainNameInputRef}
                        type="text"
                        required
                        placeholder={
                          newProductCategory === 'fans'
                            ? 'e.g. Crompton High Speed Ceiling Fan'
                            : newProductCategory === 'lights'
                            ? 'e.g. Philips LED Bulb Cool Daylight'
                            : 'e.g. CPVC Brass Elbow 90°'
                        }
                        value={newBaseName}
                        onChange={(e) => setNewBaseName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-3 py-2 rounded-lg font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-bold mb-1 text-slate-700">Unit Type</label>
                      <select
                        value={newProductUnit}
                        onChange={(e) => setNewProductUnit(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-2.5 py-2 rounded-lg font-semibold focus:outline-none focus:border-amber-500"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-bold mb-1 text-slate-700">
                        HSN Code (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 841451"
                        value={newProductHsnCode}
                        onChange={(e) => setNewProductHsnCode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Step 3: Single Item vs Multiple Sizes / Sub-Materials */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                          Sizes / Sub-Materials &amp; Pricing
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {hasMultipleSizesMode
                            ? 'Customers will see ONE card and pick their required size when clicking + Add'
                            : 'Single standard material without size variations'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setHasMultipleSizesMode(false)}
                          className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            !hasMultipleSizesMode
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Single Price
                        </button>
                        <button
                          type="button"
                          onClick={() => setHasMultipleSizesMode(true)}
                          className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            hasMultipleSizesMode
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Multiple Sizes / Variants
                        </button>
                      </div>
                    </div>

                    {!hasMultipleSizesMode ? (
                      /* Single Item Pricing Fields */
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div>
                          <label className="block font-bold mb-1 text-emerald-700">
                            Selling Price (₹) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required={!hasMultipleSizesMode}
                            placeholder="0.00"
                            value={singlePrice}
                            onChange={(e) => setSinglePrice(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono tabular-nums font-bold px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-600">MRP (₹)</label>
                            <button
                              type="button"
                              onClick={handleAutoMrpForSizeRows}
                              className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                            >
                              +15%
                            </button>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Optional"
                            value={singleOriginalPrice}
                            onChange={(e) => setSingleOriginalPrice(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 text-slate-700 font-mono tabular-nums px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-slate-700">Stock Count</label>
                          <input
                            type="number"
                            value={singleStock}
                            onChange={(e) => setSingleStock(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono tabular-nums font-bold px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1 text-slate-700">
                            SKU (Auto if blank)
                          </label>
                          <input
                            type="text"
                            placeholder="Auto-generated"
                            value={singleSku}
                            onChange={(e) => setSingleSku(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 text-slate-700 font-mono px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Multiple Sizes / Sub-Materials Matrix */
                      <div className="space-y-3 pt-1">
                        {/* Quick Size Presets */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-600">
                              1-Click Quick Sizes for{' '}
                              {getCategoryDisplayName(newProductCategory, categories)}:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleAddAllPresets}
                                className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                              >
                                + Add All Presets
                              </button>
                              <button
                                type="button"
                                onClick={handleCopyFirstPriceToEmptySizeRows}
                                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                · Copy 1st Price
                              </button>
                              <button
                                type="button"
                                onClick={handleAutoMrpForSizeRows}
                                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                              >
                                · Auto +15% MRP
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {sizePresetsForComposer.map((preset) => {
                              const isSelected = sizeRows.some(
                                (r) => r.sizeLabel.trim().toLowerCase() === preset.toLowerCase()
                              );
                              return (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleToggleSizePreset(preset)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition border cursor-pointer ${
                                    isSelected
                                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                                      : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                                  }`}
                                >
                                  {isSelected ? `✓ ${preset}` : `+ ${preset}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Size Variant Rows */}
                        <div className="space-y-2">
                          <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <div className="col-span-4">Size / Sub-Material Label *</div>
                            <div className="col-span-3">Selling Price (₹) *</div>
                            <div className="col-span-2">MRP (₹)</div>
                            <div className="col-span-2">Stock</div>
                            <div className="col-span-1 text-right">Remove</div>
                          </div>

                          {sizeRows.map((row, idx) => (
                            <div
                              key={row.tempId}
                              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50/70 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-slate-200"
                            >
                              <div className="sm:col-span-4">
                                <input
                                  type="text"
                                  placeholder={`Size #${idx + 1} (e.g. 1200mm, 9W, ¾")`}
                                  value={row.sizeLabel}
                                  onChange={(e) =>
                                    setSizeRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, sizeLabel: e.target.value } : r
                                      )
                                    )
                                  }
                                  className="w-full bg-white border border-slate-300 text-slate-900 font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Price ₹"
                                  value={row.price}
                                  onChange={(e) =>
                                    setSizeRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, price: e.target.value } : r
                                      )
                                    )
                                  }
                                  className="w-full bg-white border border-slate-300 text-slate-900 font-mono tabular-nums font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="MRP ₹"
                                  value={row.originalPrice}
                                  onChange={(e) =>
                                    setSizeRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, originalPrice: e.target.value } : r
                                      )
                                    )
                                  }
                                  className="w-full bg-white border border-slate-300 text-slate-700 font-mono tabular-nums px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <input
                                  type="number"
                                  placeholder="Stock"
                                  value={row.stockCount}
                                  onChange={(e) =>
                                    setSizeRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, stockCount: e.target.value } : r
                                      )
                                    )
                                  }
                                  className="w-full bg-white border border-slate-300 text-slate-900 font-mono tabular-nums px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  disabled={sizeRows.length <= 1}
                                  onClick={() =>
                                    setSizeRows((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                                  title="Remove size row"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSizeRows((prev) => [...prev, createEmptySizeRow()])}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Another Size / Sub-Material Row
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 4: Optional Image, Favorite & Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="block font-bold text-slate-700">
                        Material Image (Shared across sizes)
                      </label>
                      <div className="flex items-center gap-3">
                        {newProductImage ? (
                          <img
                            src={newProductImage}
                            alt="Preview"
                            className="w-12 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                            {getCategorySmallIcon(newProductCategory)}
                          </div>
                        )}
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <input
                            type="text"
                            placeholder="Image URL or /local_photo.jpg"
                            value={newProductImage}
                            onChange={(e) => setNewProductImage(e.target.value)}
                            className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
                          />
                          <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                            <Upload className="w-3.5 h-3.5" /> Upload Photo from Device
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Short Description (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Brand, rating, warranty or specs..."
                          value={newProductDesc}
                          onChange={(e) => setNewProductDesc(e.target.value)}
                          className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
                        />
                      </div>
                      <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProductPopular}
                          onChange={(e) => setNewProductPopular(e.target.checked)}
                          className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-amber-900">
                          ★ Mark as Trade Favorite
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Action Footer: Cancel | Save & Add Next | Save & Close */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowAddProductModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveBuilderMaterial(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Save &amp; Add Next Material
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> Save &amp; Close
                    </button>
                  </div>
                </form>
              ) : (
                /* MODE B: MULTI-ITEM SPREADSHEET / PASTE BULK ENTRY */
                <form onSubmit={handleSaveBulkTable} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Target Main Category
                      </label>
                      <select
                        value={bulkEntryCategory}
                        onChange={(e) => {
                          const cid = e.target.value;
                          setBulkEntryCategory(cid);
                          const subs = getSubcategoriesForCategory(cid);
                          const defSub = subs[0] || '';
                          setBulkEntrySubcategory(defSub);
                          setBulkRows((prev) =>
                            prev.map((r) => ({ ...r, subcategory: defSub }))
                          );
                        }}
                        className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg font-bold"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Default Subcategory
                      </label>
                      <select
                        value={bulkEntrySubcategory}
                        onChange={(e) => {
                          const sub = e.target.value;
                          setBulkEntrySubcategory(sub);
                          setBulkRows((prev) =>
                            prev.map((r) => (!r.subcategory ? { ...r, subcategory: sub } : r))
                          );
                        }}
                        className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg font-semibold"
                      >
                        <option value="">General</option>
                        {bulkEntrySubcategories.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Default Unit</label>
                      <select
                        value={bulkEntryUnit}
                        onChange={(e) => setBulkEntryUnit(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 px-3 py-2 rounded-lg font-semibold"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Optional Quick Paste Parser */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">
                        Quick Paste from Excel / WhatsApp (Optional)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Format: <code>Material Name, Size, Price</code> or <code>Material Name, Price</code>
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <textarea
                        rows={2}
                        placeholder={`Orient Ceiling Fan, 1200mm (48"), 1650\nOrient Ceiling Fan, 1400mm (56"), 1850\nPhilips LED Bulb, 9W, 85`}
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleParseBulkText}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg whitespace-nowrap self-end sm:self-stretch cursor-pointer"
                      >
                        Parse into Rows
                      </button>
                    </div>
                  </div>

                  {/* Multi-Row Spreadsheet Grid */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5">Main Material Name *</th>
                          <th className="py-2 px-2.5">Size / Variant (Optional)</th>
                          <th className="py-2 px-2.5">Subcategory</th>
                          <th className="py-2 px-2.5">Price (₹)</th>
                          <th className="py-2 px-2.5">MRP (₹)</th>
                          <th className="py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkRows.map((row, idx) => (
                          <tr key={row.tempId}>
                            <td className="p-1.5">
                              <input
                                type="text"
                                placeholder="Material name..."
                                value={row.baseName}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, baseName: e.target.value } : r
                                    )
                                  )
                                }
                                className="w-full min-w-[150px] bg-white border border-slate-200 focus:border-amber-500 rounded px-2 py-1.5 font-semibold outline-none"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                placeholder="e.g. 9W, 48 inch"
                                value={row.sizeLabel}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, sizeLabel: e.target.value } : r
                                    )
                                  )
                                }
                                className="w-full min-w-[110px] bg-white border border-slate-200 focus:border-amber-500 rounded px-2 py-1.5 font-mono outline-none"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                list="bulk-sub-suggestions"
                                placeholder="Subcategory"
                                value={row.subcategory}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, subcategory: e.target.value } : r
                                    )
                                  )
                                }
                                className="w-full min-w-[120px] bg-white border border-slate-200 focus:border-amber-500 rounded px-2 py-1.5 outline-none"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={row.price}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, price: e.target.value } : r
                                    )
                                  )
                                }
                                className="w-24 bg-white border border-slate-200 focus:border-amber-500 rounded px-2 py-1.5 font-mono tabular-nums font-bold outline-none"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="MRP"
                                value={row.originalPrice}
                                onChange={(e) =>
                                  setBulkRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, originalPrice: e.target.value } : r
                                    )
                                  )
                                }
                                className="w-20 bg-white border border-slate-200 focus:border-amber-500 rounded px-2 py-1.5 font-mono tabular-nums outline-none"
                              />
                            </td>
                            <td className="p-1.5 text-right">
                              <button
                                type="button"
                                disabled={bulkRows.length <= 1}
                                onClick={() =>
                                  setBulkRows((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <datalist id="bulk-sub-suggestions">
                      {bulkEntrySubcategories.map((sub) => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setBulkRows((prev) => [
                            ...prev,
                            createEmptyBulkRow(bulkEntrySubcategory, bulkEntryUnit),
                          ])
                        }
                        className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                      >
                        + Add 1 Row
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBulkRows((prev) => [
                            ...prev,
                            ...Array.from({ length: 5 }, () =>
                              createEmptyBulkRow(bulkEntrySubcategory, bulkEntryUnit)
                            ),
                          ])
                        }
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        · + Add 5 Rows
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddProductModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-4 h-4" /> Save All{' '}
                        {bulkRows.filter((r) => r.baseName.trim()).length || ''} Materials
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 2: MANAGE MAIN MATERIAL GROUP & ALL SIZES                       */}
        {/* ===================================================================== */}
        {editingGroup && (
          <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-5 sm:p-6 text-slate-900 shadow-2xl relative space-y-4 my-auto max-h-[92vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="border-b border-slate-200 pb-3 pr-8">
                <h3 className="text-lg font-black text-slate-900">
                  Manage Material &amp; Size Variants
                </h3>
                <p className="text-xs text-slate-500">
                  Update shared details, edit prices across sizes, or add new size variants to{' '}
                  <strong>{editingGroup.baseName}</strong>.
                </p>
              </div>

              <form onSubmit={handleSaveGroupEditor} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="sm:col-span-5">
                    <label className="block font-bold text-slate-700 mb-1">
                      Main Material Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={groupBaseName}
                      onChange={(e) => setGroupBaseName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Main Category</label>
                    <select
                      value={groupCategory}
                      onChange={(e) => {
                        setGroupCategory(e.target.value);
                        const subs = getSubcategoriesForCategory(e.target.value);
                        setGroupSubcategory(subs[0] || '');
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-bold text-slate-900"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">Subcategory</label>
                    <input
                      type="text"
                      list="group-sub-list"
                      value={groupSubcategory}
                      onChange={(e) => setGroupSubcategory(e.target.value)}
                      placeholder="Subcategory"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900"
                    />
                    <datalist id="group-sub-list">
                      {getSubcategoriesForCategory(groupCategory).map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Shared Image, Unit & Favorite */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-6 flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {groupImage ? (
                      <img
                        src={groupImage}
                        alt=""
                        className="w-11 h-11 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        {getCategorySmallIcon(groupCategory)}
                      </div>
                    )}
                    <div className="flex-1 space-y-1 min-w-0">
                      <input
                        type="text"
                        placeholder="Shared Image URL..."
                        value={groupImage}
                        onChange={(e) => setGroupImage(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                      <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-amber-800">
                        <Upload className="w-3 h-3" /> Upload Device Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleGroupImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 mb-1">Unit</label>
                    <select
                      value={groupUnit}
                      onChange={(e) => setGroupUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-semibold"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupPopular}
                        onChange={(e) => setGroupPopular(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                      <span className="font-bold text-amber-900">★ Favorite</span>
                    </label>
                  </div>
                </div>

                {/* Sizes Table */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">
                      Size Variants ({groupVariantRows.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGroupVariantRows((prev) => [
                          ...prev,
                          {
                            tempId: `new-sz-${Date.now()}-${Math.random()}`,
                            sizeLabel: '',
                            price: prev[0]?.price || '',
                            originalPrice: '',
                            stockCount: '100',
                            stockStatus: 'in_stock',
                            sku: '',
                            partCode: '',
                          },
                        ])
                      }
                      className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add New Size
                    </button>
                  </div>

                  {/* Quick Preset Chips inside Group Editor */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {getCategorySizePresets(groupCategory, groupSubcategory).map((preset) => {
                      const exists = groupVariantRows.some(
                        (r) => r.sizeLabel.trim().toLowerCase() === preset.toLowerCase()
                      );
                      if (exists) return null;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setGroupVariantRows((prev) => [
                              ...prev,
                              {
                                tempId: `preset-${Date.now()}-${Math.random()}`,
                                sizeLabel: preset,
                                price: prev[0]?.price || '',
                                originalPrice: '',
                                stockCount: '100',
                                stockStatus: 'in_stock',
                                sku: '',
                                partCode: '',
                              },
                            ])
                          }
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 font-mono text-[11px] font-semibold transition cursor-pointer"
                        >
                          + {preset}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-500 px-1">
                      <div className="col-span-4">Size Label</div>
                      <div className="col-span-2">Price (₹)</div>
                      <div className="col-span-2">MRP (₹)</div>
                      <div className="col-span-2">Stock</div>
                      <div className="col-span-2 text-right">Status / Del</div>
                    </div>
                    {groupVariantRows.map((row, idx) => (
                      <div
                        key={row.tempId}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50/70 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-slate-200"
                      >
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder={
                              groupVariantRows.length === 1
                                ? 'Standard (or enter size)'
                                : 'Size label (e.g. ¾ inch, 12W)'
                            }
                            value={row.sizeLabel}
                            onChange={(e) =>
                              setGroupVariantRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, sizeLabel: e.target.value } : r
                                )
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            value={row.price}
                            onChange={(e) =>
                              setGroupVariantRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, price: e.target.value } : r
                                )
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono tabular-nums font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="MRP"
                            value={row.originalPrice}
                            onChange={(e) =>
                              setGroupVariantRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, originalPrice: e.target.value } : r
                                )
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono tabular-nums"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            value={row.stockCount}
                            onChange={(e) =>
                              setGroupVariantRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, stockCount: e.target.value } : r
                                )
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono tabular-nums"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                          <select
                            value={row.stockStatus}
                            onChange={(e: any) =>
                              setGroupVariantRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, stockStatus: e.target.value } : r
                                )
                              )
                            }
                            className="bg-white border border-slate-300 rounded px-1.5 py-1.5 text-[11px] font-semibold"
                          >
                            <option value="in_stock">In Stock</option>
                            <option value="low_stock">Low</option>
                            <option value="out_of_stock">Out</option>
                          </select>
                          <button
                            type="button"
                            disabled={groupVariantRows.length <= 1}
                            onClick={() => {
                              if (row.id) {
                                setDeletedGroupVariantIds((prev) => [...prev, row.id!]);
                              }
                              setGroupVariantRows((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                            title="Delete this size variant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingGroup(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save All Size Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 3: SINGLE VARIANT DETAIL EDITOR                                 */}
        {/* ===================================================================== */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl relative space-y-4 my-8 max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Material Details</h3>
                  <p className="text-[11px] text-slate-500 font-mono">SKU: {editingProduct.sku}</p>
                </div>
              </div>

              <form onSubmit={handleSaveProductEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Display Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold px-3 py-2 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Main Material Group
                    </label>
                    <input
                      type="text"
                      placeholder="Optional base name"
                      value={editBaseName}
                      onChange={(e) => setEditBaseName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Size Label</label>
                    <input
                      type="text"
                      placeholder="e.g. 1200mm, 9W, ¾"
                      value={editSizeLabel}
                      onChange={(e) => setEditSizeLabel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono px-2.5 py-1.5 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Main Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => {
                        setEditCategory(e.target.value);
                        const subs = getSubcategoriesForCategory(e.target.value);
                        setEditSubcategory(subs[0] || '');
                      }}
                      className="w-full bg-slate-50 border border-slate-300 text-amber-800 font-bold px-2.5 py-2 rounded-lg"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subcategory</label>
                    <input
                      type="text"
                      list="edit-single-subs"
                      value={editSubcategory}
                      onChange={(e) => setEditSubcategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold px-2.5 py-2 rounded-lg"
                    />
                    <datalist id="edit-single-subs">
                      {getSubcategoriesForCategory(editCategory).map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block font-bold text-slate-700">Material Photo</label>
                  <div className="flex items-center gap-3">
                    {editImage ? (
                      <img
                        src={editImage}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        {getCategorySmallIcon(editCategory)}
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        placeholder="Image URL..."
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-[11px]"
                      />
                      <label className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        <Upload className="w-3.5 h-3.5" /> Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 text-amber-800 font-mono tabular-nums font-bold text-base px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Original MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editOriginalPrice || ''}
                      onChange={(e) =>
                        setEditOriginalPrice(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="w-full bg-slate-50 border border-slate-300 text-slate-700 font-mono tabular-nums px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit</label>
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold px-2 py-2 rounded-lg"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Stock</label>
                    <input
                      type="number"
                      value={editStockCount}
                      onChange={(e) => setEditStockCount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono tabular-nums font-bold px-2.5 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={editStockStatus}
                      onChange={(e: any) => setEditStockStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold px-2 py-2 rounded-lg"
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="low_stock">Low</option>
                      <option value="out_of_stock">Out</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPopular}
                    onChange={(e) => setEditPopular(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-900">
                    ★ Mark as Trade Favorite
                  </span>
                </label>

                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 4: REMOVE CATEGORY CONFIRMATION (REASSIGN OR DELETE PRODUCTS)   */}
        {/* ===================================================================== */}
        {categoryToRemove && (
          <div className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Remove "{categoryToRemove.name}" Category?
                  </h3>
                  <p className="text-xs text-slate-500">
                    {
                      products.filter(
                        (p) => p.category.toLowerCase() === categoryToRemove.id.toLowerCase()
                      ).length
                    }{' '}
                    materials currently belong to this category.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="catRemoveMode"
                    checked={removeCatAction === 'reassign'}
                    onChange={() => setRemoveCatAction('reassign')}
                    className="mt-0.5 accent-amber-500"
                  />
                  <div className="flex-1 space-y-1.5">
                    <span className="font-bold text-slate-900 block">
                      Move existing materials to another category
                    </span>
                    {removeCatAction === 'reassign' && (
                      <select
                        value={removeCatTargetId}
                        onChange={(e) => setRemoveCatTargetId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold"
                      >
                        {categories
                          .filter((c) => c.id !== categoryToRemove.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-2 pt-2 border-t border-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="catRemoveMode"
                    checked={removeCatAction === 'delete'}
                    onChange={() => setRemoveCatAction('delete')}
                    className="mt-0.5 accent-rose-600"
                  />
                  <span className="font-bold text-rose-700">
                    Delete the category and permanently remove all materials inside it
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCategoryToRemove(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemoveCategory}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  Confirm Remove Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 5: DELETE SINGLE ITEM OR MULTI-SIZE GROUP CONFIRMATION          */}
        {/* ===================================================================== */}
        {(productToDelete || groupToDelete) && (
          <div className="fixed inset-0 z-[60] bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 text-slate-900 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {groupToDelete
                      ? `Remove "${groupToDelete.baseName}" (${groupToDelete.variants.length} sizes)?`
                      : `Remove "${productToDelete?.name}"?`}
                  </h3>
                  <p className="text-xs text-rose-600 font-semibold">
                    Permanent removal from live store catalog
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {groupToDelete
                  ? `This will permanently delete all ${groupToDelete.variants.length} size variants of "${groupToDelete.baseName}" from the catalog.`
                  : `This will permanently delete "${productToDelete?.name}" (SKU: ${productToDelete?.sku}) from the catalog.`}
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setProductToDelete(null);
                    setGroupToDelete(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    groupToDelete
                      ? handleConfirmDeleteGroup(groupToDelete)
                      : productToDelete && handleConfirmDelete(productToDelete)
                  }
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Yes, Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MODAL 6: UPLOADED BOOKING PHOTO VIEWER                                */}
        {/* ===================================================================== */}
        {selectedBookingForDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 text-slate-900 shadow-2xl relative space-y-3">
              <button
                type="button"
                onClick={() => setSelectedBookingForDetail(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-bold text-slate-900">
                Uploaded Material Photo ({selectedBookingForDetail.id})
              </h3>

              {selectedBookingForDetail.imageBase64 &&
                selectedBookingForDetail.imageBase64.trim() !== '' && (
                  <img
                    src={selectedBookingForDetail.imageBase64}
                    alt="Uploaded Job Note"
                    className="w-full max-h-80 object-contain rounded-xl bg-slate-50 border border-slate-200"
                  />
                )}

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
                <p>
                  <strong className="text-amber-700">Plumber Phone:</strong>{' '}
                  {selectedBookingForDetail.plumberPhone}
                </p>
                <p>
                  <strong className="text-slate-600">Customer:</strong>{' '}
                  {selectedBookingForDetail.customerName}
                </p>
                <p>
                  <strong className="text-slate-600">Address:</strong>{' '}
                  {selectedBookingForDetail.deliveryAddress || 'N/A'}
                </p>
              </div>

              <a
                href={`tel:${selectedBookingForDetail.plumberPhone}`}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" /> Call Plumber Now (
                {selectedBookingForDetail.plumberPhone})
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
