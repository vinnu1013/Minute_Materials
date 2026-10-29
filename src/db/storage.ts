import path from 'path';
import fs from 'fs';
import { Product, StoreSettings, Booking, UserAccount, CategoryConfig } from '../types';
import {
  ADMIN_STORE_SETTINGS,
  ADMIN_CATEGORIES,
  BASE_INITIAL_PRODUCTS,
  MY_PRODUCTS,
  PRODUCT_UPDATES,
  REMOVE_PRODUCTS,
  CATEGORY_BULK_PRICE_PERCENT,
  CodeSyncPayload,
  applyCodeRulesToProductList,
  computeProductsHashMap,
  fastDeterministicHash,
} from '../admin/compiledCatalog';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'storeSettings.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CODE_SYNC_STATE_FILE = path.join(DATA_DIR, '.codeSyncState.json');

export function loadDiskJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (parsed !== undefined && parsed !== null) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error(`[Disk Storage] Error reading ${filePath}:`, err);
  }
  saveDiskJson(filePath, fallback);
  return fallback;
}

export function saveDiskJson<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[Disk Storage] Error writing ${filePath}:`, err);
  }
}

export interface ComplaintRecord {
  id: string;
  name: string;
  phone: string;
  orderId?: string;
  category: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
}

export interface DatabaseStatus {
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

interface PersistedCodeSyncState {
  storeSettingsSnapshot: StoreSettings;
  categoriesHash: string;
  baseProductsHashes: Record<string, string>;
  myProductIds: string[];
  myProductsHash: string;
  overridesHash: string;
  appliedBulkPercent: Record<string, number>;
}

class DatabaseManager {
  private isConnected: boolean = true;
  private lastConnectedAt: string = new Date().toISOString();

  constructor() {
    // Initialize persistent files on disk
    const loadedProducts = loadDiskJson<Product[]>(PRODUCTS_FILE, [...BASE_INITIAL_PRODUCTS]);
    const initialById = new Map(BASE_INITIAL_PRODUCTS.map((p) => [p.id, p]));
    let needsMetadataSave = false;
    const enrichedProducts = loadedProducts.map((p) => {
      const ref = initialById.get(p.id);
      if (ref && (!p.baseName || (ref.sizeLabel && !p.sizeLabel))) {
        needsMetadataSave = true;
        return {
          ...p,
          baseName: p.baseName || ref.baseName,
          sizeLabel: p.sizeLabel || ref.sizeLabel,
        };
      }
      return p;
    });
    if (needsMetadataSave) {
      saveDiskJson(PRODUCTS_FILE, enrichedProducts);
    }

    loadDiskJson<CategoryConfig[]>(CATEGORIES_FILE, [...ADMIN_CATEGORIES]);
    loadDiskJson<StoreSettings>(SETTINGS_FILE, { ...ADMIN_STORE_SETTINGS });
    loadDiskJson<Booking[]>(BOOKINGS_FILE, []);
    loadDiskJson<ComplaintRecord[]>(COMPLAINTS_FILE, []);
    loadDiskJson<UserAccount[]>(USERS_FILE, []);

    // Synchronize any code-level changes in src/admin/* or src/data/initialProducts.ts
    this.syncCodeConfig();
  }

  /**
   * Synchronizes code edits from `/src/admin/*` and `/src/data/initialProducts.ts`
   * into the persistent `/data/*.json` store while preserving Web Admin Panel changes.
   */
  public syncCodeConfig(
    incoming?: CodeSyncPayload & { baseProducts?: Product[] }
  ): {
    updatedSettings: boolean;
    updatedCategories: boolean;
    updatedProducts: boolean;
  } {
    const codeSettings = incoming?.storeSettings || ADMIN_STORE_SETTINGS;
    const codeCategories = incoming?.categories || ADMIN_CATEGORIES;
    const codeMyProducts = incoming?.myProducts || MY_PRODUCTS;
    const codeUpdates = incoming?.productUpdates || PRODUCT_UPDATES;
    const codeRemoves = incoming?.removeProducts || REMOVE_PRODUCTS;
    const codeBulkPct = incoming?.categoryBulkPricePercent || CATEGORY_BULK_PRICE_PERCENT;
    const baseProductsList = incoming?.baseProducts || BASE_INITIAL_PRODUCTS;

    const currentCategoriesHash = fastDeterministicHash(codeCategories);
    const currentBaseHashes =
      incoming?.baseProductsHashes || computeProductsHashMap(baseProductsList);
    const currentMyProductIds = codeMyProducts.map((p) => p.id);
    const currentMyProductsHash = fastDeterministicHash(codeMyProducts);
    const currentOverridesHash = fastDeterministicHash({
      updates: codeUpdates,
      removes: codeRemoves,
      bulk: codeBulkPct,
    });

    const hasExistingState = fs.existsSync(CODE_SYNC_STATE_FILE);
    let updatedSettings = false;
    let updatedCategories = false;
    let updatedProducts = false;

    if (!hasExistingState) {
      // First-time baseline: apply any active MY_PRODUCTS / rules if configured, then record snapshot
      const hasInitialCodeRules =
        codeMyProducts.length > 0 ||
        codeUpdates.length > 0 ||
        codeRemoves.length > 0 ||
        Object.values(codeBulkPct).some((v) => v !== 0);

      if (hasInitialCodeRules) {
        const diskProds = loadDiskJson<Product[]>(PRODUCTS_FILE, [...BASE_INITIAL_PRODUCTS]);
        const nextProds = applyCodeRulesToProductList(diskProds, {
          myProducts: codeMyProducts,
          prevMyProductIds: [],
          productUpdates: codeUpdates,
          removeProducts: codeRemoves,
          categoryBulkDeltaPercent: codeBulkPct,
        });
        saveDiskJson(PRODUCTS_FILE, nextProds);
        updatedProducts = true;
      }

      const initialState: PersistedCodeSyncState = {
        storeSettingsSnapshot: { ...codeSettings },
        categoriesHash: currentCategoriesHash,
        baseProductsHashes: currentBaseHashes,
        myProductIds: currentMyProductIds,
        myProductsHash: currentMyProductsHash,
        overridesHash: currentOverridesHash,
        appliedBulkPercent: { ...codeBulkPct },
      };
      saveDiskJson(CODE_SYNC_STATE_FILE, initialState);
      return { updatedSettings, updatedCategories, updatedProducts };
    }

    const prevState = loadDiskJson<PersistedCodeSyncState>(CODE_SYNC_STATE_FILE, {
      storeSettingsSnapshot: { ...codeSettings },
      categoriesHash: currentCategoriesHash,
      baseProductsHashes: currentBaseHashes,
      myProductIds: currentMyProductIds,
      myProductsHash: currentMyProductsHash,
      overridesHash: currentOverridesHash,
      appliedBulkPercent: { ...codeBulkPct },
    });

    // 1. Check field-by-field diff on StoreSettings
    const prevSettings = prevState.storeSettingsSnapshot || ({} as StoreSettings);
    const changedSettingsPatch: Partial<StoreSettings> = {};
    (Object.keys(codeSettings) as Array<keyof StoreSettings>).forEach((key) => {
      if (codeSettings[key] !== prevSettings[key]) {
        (changedSettingsPatch as any)[key] = codeSettings[key];
        updatedSettings = true;
      }
    });

    if (updatedSettings) {
      const currentDiskSettings = loadDiskJson<StoreSettings>(SETTINGS_FILE, {
        ...ADMIN_STORE_SETTINGS,
      });
      saveDiskJson(SETTINGS_FILE, {
        ...currentDiskSettings,
        ...changedSettingsPatch,
      });
    }

    // 2. Check Categories diff
    if (currentCategoriesHash !== prevState.categoriesHash) {
      saveDiskJson(CATEGORIES_FILE, codeCategories);
      updatedCategories = true;
    }

    // 3. Check Base INITIAL_PRODUCTS diff + MY_PRODUCTS / Overrides diff
    const prevBaseHashes = prevState.baseProductsHashes || {};
    let baseChanged = false;
    const baseKeysNow = Object.keys(currentBaseHashes);
    const baseKeysPrev = Object.keys(prevBaseHashes);

    if (baseKeysNow.length !== baseKeysPrev.length) {
      baseChanged = true;
    } else {
      for (const id of baseKeysNow) {
        if (currentBaseHashes[id] !== prevBaseHashes[id]) {
          baseChanged = true;
          break;
        }
      }
    }

    const myOrOverridesChanged =
      currentMyProductsHash !== prevState.myProductsHash ||
      currentOverridesHash !== prevState.overridesHash;

    if (baseChanged || myOrOverridesChanged) {
      let workingList = loadDiskJson<Product[]>(PRODUCTS_FILE, [...BASE_INITIAL_PRODUCTS]);

      if (baseChanged && (!incoming || incoming.baseProducts)) {
        const baseById = new Map(baseProductsList.map((p) => [p.id, p]));
        const deletedBaseIds = new Set(baseKeysPrev.filter((id) => !currentBaseHashes[id]));
        const modifiedBaseIds = new Set(
          baseKeysNow.filter((id) => prevBaseHashes[id] && prevBaseHashes[id] !== currentBaseHashes[id])
        );
        const addedBaseItems = baseProductsList.filter((p) => !prevBaseHashes[p.id]);

        workingList = workingList
          .filter((p) => !deletedBaseIds.has(p.id))
          .map((p) => (modifiedBaseIds.has(p.id) && baseById.has(p.id) ? baseById.get(p.id)! : p));

        if (addedBaseItems.length > 0) {
          const existingIds = new Set(workingList.map((p) => p.id));
          const trulyNew = addedBaseItems.filter((p) => !existingIds.has(p.id));
          workingList = [...trulyNew, ...workingList];
        }
      }

      // Compute only newly changed bulk % per category so discounts aren't applied twice
      const prevBulk = prevState.appliedBulkPercent || {};
      const deltaBulk: Record<string, number> = {};
      Object.entries(codeBulkPct).forEach(([cat, pct]) => {
        const prevPct = prevBulk[cat] ?? 0;
        if (pct !== prevPct && pct !== 0) {
          deltaBulk[cat] = pct;
        }
      });

      workingList = applyCodeRulesToProductList(workingList, {
        myProducts: codeMyProducts,
        prevMyProductIds: prevState.myProductIds || [],
        productUpdates: codeUpdates,
        removeProducts: codeRemoves,
        categoryBulkDeltaPercent: deltaBulk,
      });

      saveDiskJson(PRODUCTS_FILE, workingList);
      updatedProducts = true;
    }

    if (updatedSettings || updatedCategories || updatedProducts) {
      const nextState: PersistedCodeSyncState = {
        storeSettingsSnapshot: { ...codeSettings },
        categoriesHash: currentCategoriesHash,
        baseProductsHashes: currentBaseHashes,
        myProductIds: currentMyProductIds,
        myProductsHash: currentMyProductsHash,
        overridesHash: currentOverridesHash,
        appliedBulkPercent: { ...codeBulkPct },
      };
      saveDiskJson(CODE_SYNC_STATE_FILE, nextState);
    }

    return { updatedSettings, updatedCategories, updatedProducts };
  }

  public async detectOutboundIp(): Promise<string> {
    return '127.0.0.1 (Local Server Storage)';
  }

  public async connect(): Promise<boolean> {
    this.isConnected = true;
    this.lastConnectedAt = new Date().toISOString();
    return true;
  }

  public async syncDiskStorage(): Promise<{ success: boolean; migrated: any }> {
    const syncResult = this.syncCodeConfig();
    return {
      success: true,
      migrated: {
        message: 'Persistent disk data storage and code configs synchronized.',
        ...syncResult,
      },
    };
  }

  public async getStatus(): Promise<DatabaseStatus> {
    const prods = loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
    const bks = loadDiskJson<Booking[]>(BOOKINGS_FILE, []);
    const usrs = loadDiskJson<UserAccount[]>(USERS_FILE, []);
    const cmps = loadDiskJson<ComplaintRecord[]>(COMPLAINTS_FILE, []);
    const sets = loadDiskJson<StoreSettings>(SETTINGS_FILE, ADMIN_STORE_SETTINGS);

    return {
      connected: true,
      dbName: 'minute_materials_store',
      cluster: 'Persistent Server Disk + Code Admin Sync',
      uriConfigured: true,
      lastConnectedAt: this.lastConnectedAt,
      isIpWhitelistRequired: false,
      outboundIp: 'Local Persistent Storage',
      counts: {
        products: prods.length,
        bookings: bks.length,
        users: usrs.length,
        complaints: cmps.length,
        settingsConfigured: Boolean(sets && sets.storeName),
      },
    };
  }

  // --- PRODUCTS DATA OPERATIONS ---
  public async getProducts(): Promise<Product[]> {
    return loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
  }

  public async saveAllProducts(productsList: Product[]): Promise<boolean> {
    saveDiskJson(PRODUCTS_FILE, productsList);
    return true;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) {
      return null;
    }
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    saveDiskJson(PRODUCTS_FILE, list);
    return updated;
  }

  public async addProduct(product: Product): Promise<Product> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
    list.unshift(product);
    saveDiskJson(PRODUCTS_FILE, list);
    return product;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
    const filtered = list.filter((p) => p.id !== id);
    const deleted = filtered.length !== list.length;
    saveDiskJson(PRODUCTS_FILE, filtered);
    return deleted;
  }

  public async addProductsBatch(newItems: Product[]): Promise<Product[]> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
    const combined = [...newItems, ...list];
    saveDiskJson(PRODUCTS_FILE, combined);
    return combined;
  }

  public async updateProductsBatch(updatedItems: Product[]): Promise<Product[]> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
    const byId = new Map(updatedItems.map((p) => [p.id, p]));
    const merged = list.map((existing) => {
      const incoming = byId.get(existing.id);
      return incoming ? { ...existing, ...incoming } : existing;
    });
    saveDiskJson(PRODUCTS_FILE, merged);
    return merged;
  }

  public async deleteProductsBatch(ids: string[]): Promise<Product[]> {
    const idSet = new Set(ids);
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
    const remaining = list.filter((p) => !idSet.has(p.id));
    saveDiskJson(PRODUCTS_FILE, remaining);
    return remaining;
  }

  // --- CATEGORIES DATA OPERATIONS ---
  public async getCategories(): Promise<CategoryConfig[]> {
    return loadDiskJson<CategoryConfig[]>(CATEGORIES_FILE, ADMIN_CATEGORIES);
  }

  public async saveCategories(categoriesList: CategoryConfig[]): Promise<CategoryConfig[]> {
    saveDiskJson(CATEGORIES_FILE, categoriesList);
    return categoriesList;
  }

  public async reassignCategoryProducts(
    fromCategory: string,
    action: 'reassign' | 'delete',
    toCategory?: string
  ): Promise<Product[]> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, BASE_INITIAL_PRODUCTS);
    const cleanFrom = (fromCategory || '').toLowerCase();
    const cleanTo = (toCategory || '').toLowerCase();

    let next: Product[];
    if (action === 'delete') {
      next = list.filter((p) => (p.category || '').toLowerCase() !== cleanFrom);
    } else if (cleanTo) {
      next = list.map((p) =>
        (p.category || '').toLowerCase() === cleanFrom ? { ...p, category: cleanTo } : p
      );
    } else {
      next = list;
    }

    saveDiskJson(PRODUCTS_FILE, next);
    return next;
  }

  public async bulkUpdatePrices(
    category?: string,
    percentageChange: number = 0,
    roundToNearestQuarter: boolean = false
  ): Promise<{ updatedCount: number; products: Product[] }> {
    const list = await this.getProducts();
    const factor = 1 + percentageChange / 100;
    let updatedCount = 0;

    const updatedList = list.map((p) => {
      if ((!category || category === 'all' || p.category === category) && p.price > 0) {
        let newPrice = p.price * factor;
        if (roundToNearestQuarter) {
          newPrice = Math.round(newPrice * 4) / 4;
        } else {
          newPrice = Math.round(newPrice * 100) / 100;
        }
        updatedCount++;
        return {
          ...p,
          originalPrice: p.price,
          price: Math.max(0.5, newPrice),
        };
      }
      return p;
    });

    await this.saveAllProducts(updatedList);
    return { updatedCount, products: updatedList };
  }

  // --- STORE SETTINGS DATA OPERATIONS ---
  public async getStoreSettings(): Promise<StoreSettings> {
    return loadDiskJson<StoreSettings>(SETTINGS_FILE, ADMIN_STORE_SETTINGS);
  }

  public async updateStoreSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    const current = await this.getStoreSettings();
    const merged: StoreSettings = { ...current, ...updates };
    saveDiskJson(SETTINGS_FILE, merged);
    return merged;
  }

  // --- BOOKINGS DATA OPERATIONS ---
  public async getBookings(): Promise<Booking[]> {
    return loadDiskJson<Booking[]>(BOOKINGS_FILE, []);
  }

  public async addBooking(booking: Booking): Promise<Booking> {
    const list = loadDiskJson<Booking[]>(BOOKINGS_FILE, []);
    list.unshift(booking);
    saveDiskJson(BOOKINGS_FILE, list);
    return booking;
  }

  public async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    const list = loadDiskJson<Booking[]>(BOOKINGS_FILE, []);
    const index = list.findIndex((b) => b.id === id);
    if (index === -1) {
      return null;
    }
    list[index] = { ...list[index], ...updates };
    saveDiskJson(BOOKINGS_FILE, list);
    return list[index];
  }

  // --- COMPLAINTS DATA OPERATIONS ---
  public async getComplaints(): Promise<ComplaintRecord[]> {
    return loadDiskJson<ComplaintRecord[]>(COMPLAINTS_FILE, []);
  }

  public async addComplaint(complaint: ComplaintRecord): Promise<ComplaintRecord> {
    const list = loadDiskJson<ComplaintRecord[]>(COMPLAINTS_FILE, []);
    list.unshift(complaint);
    saveDiskJson(COMPLAINTS_FILE, list);
    return complaint;
  }

  // --- USERS DATA OPERATIONS ---
  public async getUsers(): Promise<UserAccount[]> {
    return loadDiskJson<UserAccount[]>(USERS_FILE, []);
  }

  public async addUser(user: UserAccount): Promise<UserAccount> {
    const list = loadDiskJson<UserAccount[]>(USERS_FILE, []);
    list.push(user);
    saveDiskJson(USERS_FILE, list);
    return user;
  }

  public async updateUser(user: UserAccount): Promise<UserAccount> {
    const list = loadDiskJson<UserAccount[]>(USERS_FILE, []);
    const idx = list.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      list[idx] = user;
      saveDiskJson(USERS_FILE, list);
    }
    return user;
  }
}

export const dbManager = new DatabaseManager();
