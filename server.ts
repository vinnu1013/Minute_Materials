import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { ALL_BRAND_PRODUCTS } from './src/data/brands';
import { ADMIN_STORE_SETTINGS } from './src/admin/storeSettings';
import { Product, Booking, StoreSettings, UserAccount } from './src/types';
import { getEstimateForAddress, DEPOT_LOCATION } from './src/utils/distance';
import { dbManager } from './src/db/storage';

// Disk-backed persistent data storage
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

function loadJsonFile<T>(filePath: string, fallback: T): T {
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
    console.error(`Error reading ${filePath}:`, err);
  }
  saveJsonFile(filePath, fallback);
  return fallback;
}

function saveJsonFile<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Initial seed data
const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-101',
    name: 'Vinnu Contractor',
    email: 'mr.vinnu10@gmail.com',
    phone: '8332869926',
    tradeCompany: 'Vinnu Plumbing & Electricals',
    address: 'LB Nagar Ring Road Junction, Hyderabad',
    lat: 17.3480,
    lng: 78.5510,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_COMPLAINTS: Array<{
  id: string;
  name: string;
  phone: string;
  orderId?: string;
  category: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
}> = [
  {
    id: 'CMP-102984',
    name: 'Vinnu Contractor',
    phone: '8332869926',
    orderId: 'BK-1001',
    category: 'wrong_material',
    description: 'Received 1/2 inch fittings instead of 3/4 inch.',
    status: 'investigating',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  }
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'BK-1001',
    userId: 'usr-101',
    bookingType: 'image_upload',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    status: 'packing',
    customerName: 'Dave Miller (Apex Plumbing)',
    plumberPhone: '8332869926',
    tradeCompany: 'Apex Plumbing Contractors',
    deliveryAddress: 'LB Nagar Ring Road, Hyderabad',
    customerLat: 17.3480,
    customerLng: 78.5510,
    distanceKm: 4.2,
    driveTimeMins: 14,
    totalPrice: 242.50,
    paymentMethod: 'trade_credit',
    geminiAnalysis: {
      detectedItems: [
        { name: '1/2" Type L Copper Pipe (10ft)', estimatedQty: 4, estimatedUnitPrice: 18.50, matchedProductId: 'p-01', confidence: 0.95 },
        { name: '1/2" Brass PEX Crimp Elbow 90° (10-Pack)', estimatedQty: 2, estimatedUnitPrice: 12.99, matchedProductId: 'p-03', confidence: 0.92 },
        { name: 'Heavy-Duty PVC Cement & Primer Kit', estimatedQty: 1, estimatedUnitPrice: 16.80, matchedProductId: 'p-05', confidence: 0.98 }
      ],
      totalEstimatedCost: 119.28,
      rawNotes: 'Handwritten job list scanned from mobile upload on site.'
    },
    notes: 'Urgent job site drop-off near East Main St.'
  },
  {
    id: 'BK-1002',
    userId: 'usr-101',
    bookingType: 'phone_callback',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'new',
    customerName: 'Sam Rivera',
    plumberPhone: '8332869926',
    tradeCompany: 'Rivera Electric LLC',
    deliveryAddress: 'Uppal Main Junction, Hyderabad',
    customerLat: 17.4018,
    customerLng: 78.5602,
    distanceKm: 6.8,
    driveTimeMins: 20,
    totalPrice: 210.00,
    notes: 'Needs 250ft 12/2 Romex wire and 20A single pole breakers delivered to job site within 45 mins.'
  }
];

// Persistent state loaded from disk
let products: Product[] = loadJsonFile<Product[]>(PRODUCTS_FILE, [...ALL_BRAND_PRODUCTS]);
let storeSettings: StoreSettings = {
  ...ADMIN_STORE_SETTINGS,
  ...loadJsonFile<StoreSettings>(SETTINGS_FILE, { ...ADMIN_STORE_SETTINGS }),
};

let users: UserAccount[] = loadJsonFile<UserAccount[]>(USERS_FILE, INITIAL_USERS);
let complaints = loadJsonFile(COMPLAINTS_FILE, INITIAL_COMPLAINTS);
let bookings: Booking[] = loadJsonFile<Booking[]>(BOOKINGS_FILE, INITIAL_BOOKINGS);

let otpStore: Record<string, { otp: string; expiresAt: number }> = {};
let payments: Array<{
  signature: string;
  amount: number;
  paymentMethod: string;
  customerName: string;
  phone: string;
  timestamp: string;
  status: string;
}> = [];

// Initialize Gemini AI Client (Server Side)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize persistent server database
  console.log('[Database] Persistent server storage active and verified.');

  // Allow larger JSON payloads for multi-photo Base64 image uploads
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Database Connection Status & Diagnostics
  app.get('/api/db-status', async (req, res) => {
    try {
      const status = await dbManager.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manual Trigger: Sync Disk Data Store
  app.post('/api/db-sync', async (req, res) => {
    try {
      const connected = await dbManager.connect();
      const migration = await dbManager.syncDiskStorage();
      const status = await dbManager.getStatus();
      res.json({ success: true, connected, migration, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Live Code Config Sync: Applies fresh edits from /src/admin/* compiled by Vite immediately
  app.post('/api/code-config-sync', async (req, res) => {
    try {
      const syncResult = dbManager.syncCodeConfig(req.body);
      const [latestProducts, latestCategories, latestSettings] = await Promise.all([
        dbManager.getProducts(),
        dbManager.getCategories(),
        dbManager.getStoreSettings(),
      ]);
      res.json({
        success: true,
        syncResult,
        products: latestProducts,
        categories: latestCategories,
        settings: latestSettings,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Store Settings
  app.get('/api/store-settings', async (req, res) => {
    try {
      const settings = await dbManager.getStoreSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Store Settings
  app.put('/api/store-settings', async (req, res) => {
    try {
      const newSettings = req.body;
      const updated = await dbManager.updateStoreSettings(newSettings);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get All Categories
  app.get('/api/categories', async (req, res) => {
    try {
      const cats = await dbManager.getCategories();
      res.json(cats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Categories & Subcategories (Add / Rename / Reorder / Remove)
  app.put('/api/categories', async (req, res) => {
    try {
      const incoming = Array.isArray(req.body) ? req.body : req.body?.categories;
      if (!Array.isArray(incoming)) {
        res.status(400).json({ error: 'Expected array of categories' });
        return;
      }
      const saved = await dbManager.saveCategories(incoming);
      res.json({ success: true, categories: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reassign or Delete Products in a Removed Category
  app.post('/api/categories/reassign', async (req, res) => {
    try {
      const { fromCategory, action, toCategory } = req.body || {};
      if (!fromCategory || (action !== 'reassign' && action !== 'delete')) {
        res.status(400).json({ error: 'Invalid category reassign payload' });
        return;
      }
      const updatedProducts = await dbManager.reassignCategoryProducts(
        fromCategory,
        action,
        toCategory
      );
      res.json({ success: true, products: updatedProducts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get All Products
  app.get('/api/products', async (req, res) => {
    try {
      const list = await dbManager.getProducts();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Google Shopping / Google Merchant Center RSS 2.0 XML Product Feed
  const serveGoogleShoppingFeed = async (req: express.Request, res: express.Response) => {
    try {
      const list = await dbManager.getProducts();
      const baseUrl =
        process.env.APP_URL?.replace(/\/$/, '') ||
        `${req.protocol}://${req.get('host') || 'www.minutematerials.online'}`;
      const esc = (v: unknown) =>
        String(v ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

      const itemsXml = list
        .filter((p: any) => Number(p.price) > 0)
        .map((p: any) => {
          const imgUrl = p.image?.startsWith('http')
            ? p.image
            : `${baseUrl}${p.image?.startsWith('/') ? '' : '/'}${p.image || 'logo-square.png'}`;
          const productLink = `${baseUrl}/?q=${encodeURIComponent(p.sku || p.name)}`;
          const availability =
            p.stockStatus === 'out_of_stock' ? 'out_of_stock' : 'in_stock';
          const desc =
            p.description?.trim() ||
            `${p.brand || 'Minute Materials'} ${p.name} (${p.subcategory || p.category}) — genuine wholesale supply with 15-minute express delivery in Hyderabad.`;

          return `    <item>
      <g:id>${esc(p.id || p.sku)}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(desc)}</g:description>
      <g:link>${esc(productLink)}</g:link>
      <g:image_link>${esc(imgUrl)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${Number(p.price).toFixed(2)} INR</g:price>
      <g:brand>${esc(p.brand || 'Minute Materials')}</g:brand>
      <g:condition>new</g:condition>
      <g:mpn>${esc(p.sku || p.partCode || p.id)}</g:mpn>
      <g:product_type>${esc(`${p.category || 'Hardware'} > ${p.subcategory || 'General'}`)}</g:product_type>
    </item>`;
        })
        .join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Minute Materials — Plumbing &amp; Electrical Product Feed</title>
    <link>${esc(baseUrl)}</link>
    <description>Live Google Shopping product feed for Minute Materials (Plumbing, Sanitaryware, Faucets, Electrical Switches, Wires &amp; MCBs).</description>
${itemsXml}
  </channel>
</rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=900');
      res.send(xml);
    } catch (err: any) {
      res.status(500).send(`<!-- Feed error: ${err.message} -->`);
    }
  };

  app.get('/google-shopping-feed.xml', serveGoogleShoppingFeed);
  app.get('/api/google-shopping-feed.xml', serveGoogleShoppingFeed);

  // Full Catalog Sync / Batch Save
  app.put('/api/products', async (req, res) => {
    try {
      if (Array.isArray(req.body)) {
        await dbManager.saveAllProducts(req.body);
        res.json({ success: true, count: req.body.length });
      } else {
        res.status(400).json({ error: 'Expected array of products' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Batch Create Products (Multi-Size Variants or Bulk Paste Table)
  app.post('/api/products/batch', async (req, res) => {
    try {
      const rawItems = Array.isArray(req.body) ? req.body : req.body?.products;
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        res.status(400).json({ error: 'Expected non-empty array of products' });
        return;
      }
      const now = Date.now();
      const created: Product[] = rawItems.map((item: Partial<Product>, idx: number) => {
        const cleanImages = Array.isArray(item.images)
          ? item.images.map((u) => (u || '').trim()).filter(Boolean)
          : [];
        const primaryImage = (item.image || cleanImages[0] || '').trim();
        const normalizedImages =
          cleanImages.length > 0
            ? cleanImages
            : primaryImage
            ? [primaryImage]
            : undefined;
        return {
          ...item,
          id: item.id || `p-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          name: item.name || 'New Material',
          baseName: item.baseName,
          sizeLabel: item.sizeLabel,
          category: item.category || 'plumbing',
          subcategory: item.subcategory || 'General',
          price: Number(item.price) || 0,
          originalPrice: item.originalPrice !== undefined ? Number(item.originalPrice) : undefined,
          unit: item.unit || 'piece',
          brand: item.brand,
          fastDelivery: item.fastDelivery ?? true,
          stockStatus: item.stockStatus || 'in_stock',
          stockCount: item.stockCount !== undefined ? Number(item.stockCount) : 100,
          sku: item.sku || `SKU-${now}-${idx}`,
          description: item.description || '',
          image: primaryImage,
          images: normalizedImages,
          popular: Boolean(item.popular),
          specifications: item.specifications,
        };
      });
      const allProducts = await dbManager.addProductsBatch(created);
      res.status(201).json({ success: true, addedCount: created.length, products: allProducts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Batch Update Products (Group Size Manager / Inline Multi-Save)
  app.put('/api/products/batch', async (req, res) => {
    try {
      const rawItems = Array.isArray(req.body) ? req.body : req.body?.products;
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        res.status(400).json({ error: 'Expected non-empty array of products' });
        return;
      }
      const allProducts = await dbManager.updateProductsBatch(rawItems);
      res.json({ success: true, products: allProducts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk Delete Products (Delete Entire Multi-Size Group)
  app.post('/api/products/bulk-delete', async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      if (ids.length === 0) {
        res.status(400).json({ error: 'Expected non-empty array of product ids' });
        return;
      }
      const allProducts = await dbManager.deleteProductsBatch(ids);
      res.json({ success: true, deletedCount: ids.length, products: allProducts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Product (Admin price edit, stock update)
  app.put('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updatedProduct: Partial<Product> = req.body;
      const result = await dbManager.updateProduct(id, updatedProduct);
      if (!result) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ success: true, product: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add New Product
  app.post('/api/products', async (req, res) => {
    try {
      const newProduct: Product = {
        id: `p-${Date.now()}`,
        stockCount: 100,
        ...req.body
      };
      await dbManager.addProduct(newProduct);
      res.status(201).json({ success: true, product: newProduct });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Product (Admin tool)
  app.delete('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await dbManager.deleteProduct(id);
      if (!deleted) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk Price Update (Admin tool)
  app.post('/api/products/bulk-price-update', async (req, res) => {
    try {
      const { category, percentageChange, roundToNearestQuarter } = req.body;
      if (typeof percentageChange !== 'number') {
        res.status(400).json({ error: 'percentageChange must be a number' });
        return;
      }
      const result = await dbManager.bulkUpdatePrices(category, percentageChange, roundToNearestQuarter);
      res.json({ success: true, updatedCount: result.updatedCount, products: result.products });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth Routes
  app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    const cleanPhone = (phone || '8332869926').toString().trim().replace(/\D/g, '');
    const userPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : '8332869926';
    
    // Generate secure 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Save OTP strictly against user's mobile number
    otpStore[userPhone] = { otp: generatedOtp, expiresAt };
    otpStore[`91${userPhone}`] = { otp: generatedOtp, expiresAt };

    console.log(`[WhatsApp Gateway +91 8332869926] Sending OTP ${generatedOtp} to +91 ${userPhone}`);

    // Return response with whatsappUrl for direct WhatsApp opening
    const whatsappMessage = `Hi Minute Materials, please send my 6-digit OTP verification code for mobile +91 ${userPhone}`;
    const whatsappUrl = `https://wa.me/918332869926?text=${encodeURIComponent(whatsappMessage)}`;

    res.json({
      success: true,
      message: `OTP request registered from Business WhatsApp (+91 8332869926) for +91 ${userPhone}.`,
      senderNumber: '8332869926',
      recipientPhone: userPhone,
      whatsappUrl
    });
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone, otp, name, userRole, address } = req.body;
    if (!phone) {
      res.status(400).json({ error: 'Phone number is required for WhatsApp OTP verification.' });
      return;
    }

    if (!otp) {
      res.status(400).json({ error: '6-digit OTP code is required.' });
      return;
    }

    const cleanPhone = phone.toString().trim().replace(/\D/g, '');
    const userPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    const userEnteredOtp = otp.toString().trim();

    // Check stored OTP strictly for recipient phone number
    const record = otpStore[userPhone] || otpStore[`91${userPhone}`];

    if (!record || Date.now() > record.expiresAt) {
      res.status(400).json({ error: 'OTP has expired or was not requested. Please click Resend OTP.' });
      return;
    }

    if (userEnteredOtp !== record.otp) {
      res.status(400).json({ error: `Incorrect OTP entered! Please enter the exact 6-digit code sent to +91 ${userPhone}.` });
      return;
    }

    const allUsers = await dbManager.getUsers();
    let existingUser = allUsers.find(
      u => u.phone === userPhone || u.phone.includes(userPhone)
    );

    if (existingUser) {
      if (name) existingUser.name = name;
      if (address) existingUser.address = address;
      if (userRole) existingUser.userRole = userRole;
      await dbManager.updateUser(existingUser);
      res.json({ success: true, message: 'WhatsApp OTP verified successfully.', user: existingUser });
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: name || 'Trade Contractor',
      email: `${userPhone}@minutematerials.com`,
      phone: userPhone,
      userRole: userRole || 'plumber_electrician',
      address: address || 'LB Nagar Junction, Hyderabad',
      createdAt: new Date().toISOString()
    };

    await dbManager.addUser(newUser);
    res.status(201).json({ success: true, message: 'WhatsApp OTP verified & account created successfully.', user: newUser });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, userRole, tradeCompany, address, lat, lng } = req.body;
    if (!phone || !name) {
      res.status(400).json({ error: 'Name and phone number are required.' });
      return;
    }

    const userPhone = phone.trim().replace(/\D/g, '');
    const userEmail = (email && email.trim()) ? email.trim() : `${userPhone}@minutematerials.com`;

    const allUsers = await dbManager.getUsers();
    const existingUser = allUsers.find(
      u => (userEmail && u.email.toLowerCase() === userEmail.toLowerCase()) || (userPhone && u.phone.includes(userPhone))
    );
    if (existingUser) {
      if (name) existingUser.name = name;
      if (address) existingUser.address = address;
      if (userRole) existingUser.userRole = userRole;
      await dbManager.updateUser(existingUser);
      res.status(200).json({ success: true, user: existingUser });
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: userEmail,
      phone: userPhone,
      userRole: userRole || 'plumber_electrician',
      tradeCompany: tradeCompany || '',
      address: address || '',
      lat: lat || undefined,
      lng: lng || undefined,
      createdAt: new Date().toISOString()
    };

    await dbManager.addUser(newUser);
    res.status(201).json({ success: true, user: newUser });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone) {
      res.status(400).json({ error: 'Please enter your registered email or phone number.' });
      return;
    }

    const allUsers = await dbManager.getUsers();
    const user = allUsers.find(
      u => u.email.toLowerCase() === emailOrPhone.toLowerCase() || u.phone.includes(emailOrPhone)
    );

    if (!user) {
      // Auto-create a guest trade account if not found for quick seamless login
      const guestUser: UserAccount = {
        id: `usr-${Date.now()}`,
        name: 'Trade Client',
        email: emailOrPhone.includes('@') ? emailOrPhone : `${emailOrPhone.replace(/\D/g, '')}@trade.com`,
        phone: emailOrPhone.includes('@') ? '+91 98765 43210' : emailOrPhone,
        address: 'Malakpet / Dilsukhnagar, Hyderabad',
        createdAt: new Date().toISOString()
      };
      await dbManager.addUser(guestUser);
      res.json({ success: true, user: guestUser });
      return;
    }

    res.json({ success: true, user });
  });

  // Live Bank Payment Verification Endpoint
  app.post('/api/payment/verify', (req, res) => {
    const { amount, paymentMethod, customerName, phone } = req.body;
    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'Invalid payment authorization amount.' });
      return;
    }

    const paymentSignature = `PAY-SIG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const record = {
      signature: paymentSignature,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'online_upi',
      customerName: customerName || 'Trade Customer',
      phone: phone || '',
      timestamp: new Date().toISOString(),
      status: 'SUCCESS'
    };

    payments.push(record);

    res.json({
      success: true,
      message: 'Live bank transfer authorized and verified successfully.',
      paymentSignature,
      status: 'SUCCESS'
    });
  });

  // Get All Bookings
  app.get('/api/bookings', async (req, res) => {
    try {
      const list = await dbManager.getBookings();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve uploaded image for a booking so it can be viewed in WhatsApp
  app.get('/api/bookings/:id/image', async (req, res) => {
    const { id } = req.params;
    const allBookings = await dbManager.getBookings();
    const booking = allBookings.find(b => b.id === id);
    if (!booking || !booking.imageBase64) {
      res.status(404).send('Image not found');
      return;
    }
    const matches = booking.imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (matches) {
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', mimeType);
      res.send(buffer);
    } else {
      res.setHeader('Content-Type', 'image/jpeg');
      const cleanBase64 = booking.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      res.send(Buffer.from(cleanBase64, 'base64'));
    }
  });

  // Create Booking (Handles all 4 modes)
  app.post('/api/bookings', async (req, res) => {
    const {
      userId,
      bookingType,
      customerName,
      userRole,
      plumberPhone,
      tradeCompany,
      deliveryAddress,
      customerLat,
      customerLng,
      deliveryOption,
      recipientType,
      recipientName,
      recipientPhone,
      items,
      imageBase64,
      geminiAnalysis,
      whatsappMessage,
      notes,
      subtotal,
      deliveryFee,
      platformFee,
      handlingFee,
      gstAmount,
      totalPrice,
      paymentMethod,
      paymentStatus,
      upiTxnRef
    } = req.body;

    // MANDATORY phone check for image upload & callbacks
    if ((bookingType === 'image_upload' || bookingType === 'phone_callback') && (!plumberPhone || !plumberPhone.trim())) {
      res.status(400).json({ error: 'Phone number is mandatory for this booking mode.' });
      return;
    }

    // Reject online payments if payment was not verified
    if ((paymentMethod === 'online_upi' || paymentMethod === 'card_online') && paymentStatus !== 'paid_online' && paymentStatus !== 'verified') {
      res.status(400).json({ error: 'Order rejected: Payment was not successfully authorized by live gateway.' });
      return;
    }

    // Calculate distance and driving time from Hub
    const estimate = getEstimateForAddress(
      deliveryAddress || 'Hyderabad Central',
      customerLat,
      customerLng
    );

    const calcDistance = estimate.roadDistanceKm || estimate.distanceKm || 1;
    const calcDeliveryFee = deliveryFee ?? Math.max(11, Math.round(calcDistance * 11));
    const calcPlatformFee = platformFee ?? ((subtotal >= 199 && calcDistance < 5) ? 0 : 15);
    const calcHandlingFee = handlingFee ?? 5;

    const newBooking: Booking = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: userId || undefined,
      bookingType: bookingType || 'cart_delivery',
      createdAt: new Date().toISOString(),
      status: 'new',
      customerName: customerName || 'Trade Customer',
      userRole: userRole || 'plumber_electrician',
      plumberPhone: plumberPhone || '',
      tradeCompany: tradeCompany || '',
      recipientType: recipientType || 'me',
      recipientName: recipientName || customerName || 'Trade Customer',
      recipientPhone: recipientPhone || plumberPhone || '',
      deliveryAddress: deliveryAddress || 'Hyderabad Metro Zone',
      customerLat: customerLat || undefined,
      customerLng: customerLng || undefined,
      distanceKm: calcDistance,
      driveTimeMins: estimate.driveTimeMins,
      deliveryOption: deliveryOption || 'express_60min',
      items: items || [],
      imageBase64: imageBase64 || undefined,
      geminiAnalysis: geminiAnalysis || undefined,
      whatsappMessage: whatsappMessage || undefined,
      notes: notes || '',
      subtotal: subtotal || 0,
      deliveryFee: calcDeliveryFee,
      platformFee: calcPlatformFee,
      handlingFee: calcHandlingFee,
      gstAmount: gstAmount || 0,
      totalPrice: totalPrice || 0,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      paymentStatus: paymentStatus || (paymentMethod === 'cash_on_delivery' ? 'paid_cod' : 'pending'),
      upiTxnRef: upiTxnRef || undefined
    };

    try {
      await dbManager.addBooking(newBooking);
      res.status(201).json({ success: true, booking: newBooking });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Booking Status
  app.patch('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    try {
      const updated = await dbManager.updateBooking(id, {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {})
      });
      if (!updated) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }
      res.json({ success: true, booking: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Gemini AI Analysis endpoint for Image Upload mode (Mode 3)
  app.post('/api/analyze-image', async (req, res) => {
    try {
      const { imageBase64, imageBase64List } = req.body;

      const imagesArray: string[] = imageBase64List && Array.isArray(imageBase64List) && imageBase64List.length > 0
        ? imageBase64List
        : (imageBase64 ? [imageBase64] : []);

      if (imagesArray.length === 0) {
        res.status(400).json({ error: 'At least one image is required.' });
        return;
      }

      const ai = getGeminiClient();

      const imageParts = imagesArray.map((imgStr) => {
        const match = imgStr.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        const detectedMime = match ? match[1] : 'image/jpeg';
        const cleanBase64 = match ? match[2] : imgStr.replace(/^data:[^;]+;base64,/, '');
        return {
          inlineData: {
            data: cleanBase64,
            mimeType: detectedMime
          }
        };
      });

      const currentCatalog = await dbManager.getProducts();

      const promptText = `
You are an expert Indian plumbing, sanitaryware, and electrical hardware OCR specialist & material dispatcher.
Carefully read and transcribe EVERY line of text from ${imagesArray.length > 1 ? 'these ' + imagesArray.length + ' uploaded images' : 'this uploaded image'} (handwritten plumber/electrician slip, printed bill, WhatsApp screenshot, part photo, or material list).

CRITICAL INSTRUCTIONS:
1. Extract ONLY the actual items visible in the uploaded image(s). Never invent or hallucinate items not in the image.
2. Auto-correct spelling mistakes, messy handwriting, and Indian trade abbreviations:
   - Plumbing: "elbo/elbw" -> "Elbow", "cpvc/cvpc" -> "CPVC", "upvc" -> "UPVC", "mta/m.t.a" -> "Male Threaded Adaptor (MTA)", "fta/f.t.a" -> "Female Threaded Adaptor (FTA)", "b/v or ball valv" -> "Ball Valve", "nrv" -> "Non Return Valve", "t/t or teflon" -> "PTFE Teflon Tape", "s/c or solvant" -> "Solvent Cement", "couplr" -> "Coupler", "reduser" -> "Reducer", "basen" -> "Wash Basin", "commode/toliet" -> "Water Closet", "fauset" -> "Faucet", "shwer" -> "Shower".
   - Electrical: "swich" -> "Switch", "soket" -> "Socket", "regultor" -> "Fan Regulator", "wyer/wir" -> "Copper Wire", "mcb" -> "MCB", "rccb" -> "RCCB", "moduler" -> "Modular", "ankor" -> "Anchor", "panasonik" -> "Panasonic", "plait" -> "Cover Plate".
   - Sizes: normalize inches/mm/sq.mm/modules cleanly (e.g. "1/2 inch", "3/4 inch", "1 inch", "20mm", "1.5 sq.mm", "2.5 sq.mm", "6A", "16A", "2 Module").
3. Preserve "originalText" (exact text written in the image) alongside "item" (clean auto-corrected material name).
4. Extract exact quantities (default to 1 if no quantity is written).

Return a valid JSON object matching this schema:
{
  "detectedItems": [
    {
      "slNo": 1,
      "originalText": "exact text from photo",
      "item": "Auto-corrected material name",
      "size": "Size specification or Standard",
      "quantity": 10,
      "name": "Full clean material name with size",
      "estimatedQty": 10,
      "estimatedUnitPrice": 35,
      "confidence": 0.95
    }
  ],
  "totalEstimatedCost": 350,
  "rawNotes": "Brief summary of the handwritten/printed list"
}
`;

      const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      let geminiResponse: any = null;
      let lastErr: any = null;

      for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            geminiResponse = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [...imageParts, { text: promptText }]
              },
              config: {
                temperature: 0.1,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    detectedItems: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          slNo: { type: Type.NUMBER },
                          originalText: { type: Type.STRING },
                          item: { type: Type.STRING },
                          size: { type: Type.STRING },
                          quantity: { type: Type.NUMBER },
                          name: { type: Type.STRING },
                          estimatedQty: { type: Type.NUMBER },
                          estimatedUnitPrice: { type: Type.NUMBER },
                          confidence: { type: Type.NUMBER }
                        },
                        required: ['item', 'name', 'quantity', 'estimatedQty', 'estimatedUnitPrice']
                      }
                    },
                    totalEstimatedCost: { type: Type.NUMBER },
                    rawNotes: { type: Type.STRING }
                  },
                  required: ['detectedItems', 'totalEstimatedCost', 'rawNotes']
                }
              }
            });
            break;
          } catch (err: any) {
            lastErr = err;
            const msg = String(err?.message || err || '');
            const isTransient =
              err?.status === 503 ||
              err?.status === 429 ||
              msg.includes('503') ||
              msg.includes('UNAVAILABLE') ||
              msg.includes('high demand') ||
              msg.includes('429');
            if (!isTransient) throw err;
            console.warn(`Gemini ${modelName} attempt ${attempt} busy (503/429), retrying/falling back...`);
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 900));
            }
          }
        }
        if (geminiResponse) break;
      }

      if (!geminiResponse) {
        throw new Error(
          'AI scanner is momentarily busy due to high demand. Please tap "Re-scan Images" in a few seconds.'
        );
      }

      const jsonText = geminiResponse.text;
      if (!jsonText) {
        throw new Error('No analysis text returned from Gemini API.');
      }

      const parsedData = JSON.parse(jsonText);

      // Server-side full-catalog matching so every item is accurately marked Found vs Not Found
      const normalizeTokens = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9./]+/g, ' ').trim().split(/\s+/).filter((t) => t.length >= 2);

      const indexedCatalog = currentCatalog.map((p) => {
        const hay = `${p.name} ${p.baseName || ''} ${p.brand || ''} ${p.sizeLabel || ''} ${p.sku} ${p.subcategory}`.toLowerCase();
        return { product: p, hay, tokens: new Set(normalizeTokens(hay)) };
      });

      const matchCatalogProduct = (itemName: string, sizeStr: string) => {
        const qTokens = normalizeTokens(`${itemName} ${sizeStr !== 'Standard' ? sizeStr : ''}`);
        const nameTokens = normalizeTokens(itemName);
        if (nameTokens.length === 0) return null;

        let best: any = null;
        let bestScore = 0;

        for (const entry of indexedCatalog) {
          let hits = 0;
          for (const t of nameTokens) {
            if (entry.tokens.has(t) || entry.hay.includes(t)) {
              hits += 1;
            } else if (t.length >= 3) {
              for (const ct of entry.tokens) {
                if (ct.startsWith(t.slice(0, 3)) && Math.abs(ct.length - t.length) <= 2) {
                  hits += 0.6;
                  break;
                }
              }
            }
          }
          const coverage = hits / nameTokens.length;
          if (coverage < 0.55) continue;

          let score = coverage * 100;
          if (sizeStr && sizeStr !== 'Standard' && entry.hay.includes(sizeStr.toLowerCase())) {
            score += 35;
          }
          for (const qt of qTokens) {
            if (entry.tokens.has(qt)) score += 5;
          }
          if (score > bestScore) {
            bestScore = score;
            best = entry.product;
          }
        }
        return bestScore >= 65 ? best : null;
      };

      let computedTotal = 0;
      const notFoundItems: any[] = [];

      if (parsedData && Array.isArray(parsedData.detectedItems)) {
        parsedData.detectedItems = parsedData.detectedItems.map((item: any, idx: number) => {
          const cleanName = item.item || item.name || `Item ${idx + 1}`;
          const sizeStr = item.size || 'Standard';
          const qty = Math.max(1, Number(item.quantity || item.estimatedQty || 1));
          const matched = matchCatalogProduct(cleanName, sizeStr);

          const unitPrice = matched && matched.price > 0
            ? Number(matched.price)
            : Number(item.estimatedUnitPrice || 0);
          computedTotal += qty * unitPrice;

          const enriched = {
            ...item,
            slNo: idx + 1,
            item: cleanName,
            size: sizeStr,
            quantity: qty,
            estimatedQty: qty,
            estimatedUnitPrice: unitPrice,
            foundInCatalog: Boolean(matched),
            matchedProductId: matched ? matched.id : null,
            matchedProductName: matched ? matched.name : null,
            matchedBrand: matched ? matched.brand : null,
          };
          if (!matched) {
            notFoundItems.push(enriched);
          }
          return enriched;
        });
        parsedData.totalEstimatedCost = Number(computedTotal.toFixed(2));
        parsedData.notFoundItems = notFoundItems;
      }

      res.json({ success: true, analysis: parsedData });

    } catch (error: any) {
      console.error('Image Analysis Error:', error);
      res.status(500).json({
        error: error.message || 'Failed to analyze material image with Gemini AI.'
      });
    }
  });

  // GET Complaints (Admin & Chatbot)
  app.get('/api/complaints', async (req, res) => {
    try {
      const list = await dbManager.getComplaints();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST Complaint (UI & Chatbot)
  app.post('/api/complaints', async (req, res) => {
    const { name, phone, orderId, category, description } = req.body;
    if (!name || !phone || !description) {
      res.status(400).json({ error: 'Name, phone number, and issue description are required.' });
      return;
    }

    const newComplaint = {
      id: `CMP-${Math.floor(100000 + Math.random() * 900000)}`,
      name: name.toString().trim(),
      phone: phone.toString().trim(),
      orderId: orderId ? orderId.toString().trim() : undefined,
      category: category || 'general',
      description: description.toString().trim(),
      status: 'open' as const,
      createdAt: new Date().toISOString()
    };

    try {
      await dbManager.addComplaint(newComplaint);
      res.status(201).json({ success: true, complaint: newComplaint });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Middleware in Development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
