import path from 'path';
import fs from 'fs';
import { Product, StoreSettings, Booking, UserAccount } from '../types';
import { INITIAL_PRODUCTS, INITIAL_STORE_SETTINGS } from '../data/initialProducts';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'storeSettings.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Local disk persistent storage helpers
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

class DatabaseManager {
  private isConnected: boolean = true;
  private lastConnectedAt: string = new Date().toISOString();

  constructor() {
    // Ensure all data files are initialized on startup
    loadDiskJson<Product[]>(PRODUCTS_FILE, [...INITIAL_PRODUCTS]);
    loadDiskJson<StoreSettings>(SETTINGS_FILE, { ...INITIAL_STORE_SETTINGS });
    loadDiskJson<Booking[]>(BOOKINGS_FILE, []);
    loadDiskJson<ComplaintRecord[]>(COMPLAINTS_FILE, []);
    loadDiskJson<UserAccount[]>(USERS_FILE, []);
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
    return {
      success: true,
      migrated: { message: 'Persistent disk data storage synchronized and operational.' }
    };
  }

  public async getStatus(): Promise<DatabaseStatus> {
    const prods = loadDiskJson<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
    const bks = loadDiskJson<Booking[]>(BOOKINGS_FILE, []);
    const usrs = loadDiskJson<UserAccount[]>(USERS_FILE, []);
    const cmps = loadDiskJson<ComplaintRecord[]>(COMPLAINTS_FILE, []);
    const sets = loadDiskJson<StoreSettings>(SETTINGS_FILE, INITIAL_STORE_SETTINGS);

    return {
      connected: true,
      dbName: 'minute_materials_store',
      cluster: 'Persistent Server Disk (JSON)',
      uriConfigured: true,
      lastConnectedAt: this.lastConnectedAt,
      isIpWhitelistRequired: false,
      outboundIp: 'Local Persistent Storage',
      counts: {
        products: prods.length,
        bookings: bks.length,
        users: usrs.length,
        complaints: cmps.length,
        settingsConfigured: Boolean(sets && sets.storeName)
      }
    };
  }

  // --- PRODUCTS DATA OPERATIONS ---
  public async getProducts(): Promise<Product[]> {
    return loadDiskJson<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
  }

  public async saveAllProducts(productsList: Product[]): Promise<boolean> {
    saveDiskJson(PRODUCTS_FILE, productsList);
    return true;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
    const index = list.findIndex(p => p.id === id);
    if (index === -1) {
      return null;
    }
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    saveDiskJson(PRODUCTS_FILE, list);
    return updated;
  }

  public async addProduct(product: Product): Promise<Product> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
    list.unshift(product);
    saveDiskJson(PRODUCTS_FILE, list);
    return product;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const list = loadDiskJson<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
    const filtered = list.filter(p => p.id !== id);
    const deleted = filtered.length !== list.length;
    saveDiskJson(PRODUCTS_FILE, filtered);
    return deleted;
  }

  public async bulkUpdatePrices(
    category?: string,
    percentageChange: number = 0,
    roundToNearestQuarter: boolean = false
  ): Promise<{ updatedCount: number; products: Product[] }> {
    const list = await this.getProducts();
    const factor = 1 + percentageChange / 100;
    let updatedCount = 0;

    const updatedList = list.map(p => {
      if (!category || category === 'all' || p.category === category) {
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
          price: Math.max(0.5, newPrice)
        };
      }
      return p;
    });

    await this.saveAllProducts(updatedList);
    return { updatedCount, products: updatedList };
  }

  // --- STORE SETTINGS DATA OPERATIONS ---
  public async getStoreSettings(): Promise<StoreSettings> {
    const loaded = loadDiskJson<StoreSettings>(SETTINGS_FILE, INITIAL_STORE_SETTINGS);
    let changed = false;
    if (loaded.helplineNumber === '9059236500') {
      loaded.helplineNumber = '8332869926';
      changed = true;
    }
    if (loaded.whatsappNumber === '9059236500') {
      loaded.whatsappNumber = '8332869926';
      changed = true;
    }
    if (loaded.activeDeliveryNotice && loaded.activeDeliveryNotice.includes('9059236500')) {
      loaded.activeDeliveryNotice = loaded.activeDeliveryNotice.replace(/9059236500/g, '8332869926');
      changed = true;
    }
    if (changed) {
      saveDiskJson(SETTINGS_FILE, loaded);
    }
    return loaded;
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
    const index = list.findIndex(b => b.id === id);
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
    const idx = list.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      list[idx] = user;
      saveDiskJson(USERS_FILE, list);
    }
    return user;
  }
}

export const dbManager = new DatabaseManager();
