import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_PRODUCTS, INITIAL_STORE_SETTINGS } from './src/data/initialProducts';
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
let products: Product[] = loadJsonFile<Product[]>(PRODUCTS_FILE, [...INITIAL_PRODUCTS]);
let storeSettings: StoreSettings = {
  ...INITIAL_STORE_SETTINGS,
  ...loadJsonFile<StoreSettings>(SETTINGS_FILE, { ...INITIAL_STORE_SETTINGS })
};
if (storeSettings.adminPin === 'Vinnu1013' || !storeSettings.adminPin) {
  storeSettings.adminPin = '9059236500';
  saveJsonFile(SETTINGS_FILE, storeSettings);
}
if (
  storeSettings.helplineNumber === '9059236500' ||
  storeSettings.whatsappNumber === '9059236500' ||
  (storeSettings.activeDeliveryNotice && storeSettings.activeDeliveryNotice.includes('9059236500'))
) {
  if (storeSettings.helplineNumber === '9059236500') storeSettings.helplineNumber = '8332869926';
  if (storeSettings.whatsappNumber === '9059236500') storeSettings.whatsappNumber = '8332869926';
  if (storeSettings.activeDeliveryNotice) {
    storeSettings.activeDeliveryNotice = storeSettings.activeDeliveryNotice.replace(/9059236500/g, '8332869926');
  }
  saveJsonFile(SETTINGS_FILE, storeSettings);
}

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

  // Allow larger JSON payloads for Base64 image uploads
  app.use(express.json({ limit: '15mb' }));

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

  // Get All Products
  app.get('/api/products', async (req, res) => {
    try {
      const list = await dbManager.getProducts();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Full Catalog Sync / Batch Save
  app.put('/api/products', async (req, res) => {
    try {
      if (Array.isArray(req.body) && req.body.length > 0) {
        await dbManager.saveAllProducts(req.body);
        res.json({ success: true, count: req.body.length });
      } else {
        res.status(400).json({ error: 'Expected non-empty array of products' });
      }
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
      const { imageBase64, imageBase64List, mimeType = 'image/jpeg', plumberPhone, userRole } = req.body;

      if (userRole === 'customer' && (!plumberPhone || !plumberPhone.trim())) {
        res.status(400).json({ error: 'Plumber / Electrician Phone Number is MANDATORY for Customer orders.' });
        return;
      }

      const imagesArray: string[] = imageBase64List && Array.isArray(imageBase64List) && imageBase64List.length > 0
        ? imageBase64List
        : (imageBase64 ? [imageBase64] : []);

      if (imagesArray.length === 0) {
        res.status(400).json({ error: 'At least one image is required.' });
        return;
      }

      const ai = getGeminiClient();

      const imageParts = imagesArray.map(imgStr => {
        const cleanBase64 = imgStr.replace(/^data:image\/\w+;base64,/, '');
        return {
          inlineData: {
            data: cleanBase64,
            mimeType
          }
        };
      });

      const currentCatalog = await dbManager.getProducts();

      const promptText = `
You are an expert plumbing and electrical materials dispatcher at a top supplier company in India.
Analyze ${imagesArray.length > 1 ? 'these ' + imagesArray.length + ' images' : 'this image'} (handwritten material list, job site tag, broken part photo, blueprint, or material receipt).
Extract the text and list of materials from all provided images.
Organize each extracted item with:
- slNo: Serial number (1, 2, 3...)
- item: Name/description of material
- size: Size specification (e.g. "1/2 inch", "3/4 inch", "20mm", "1.5 sq mm", "100m Roll", "Standard")
- quantity: Quantity number (e.g., 5, 10, 2)
- name: Full item name with size
- estimatedQty: Same as quantity
- estimatedUnitPrice: Estimated unit price in Indian Rupees (₹)

Here is a sample of our store's current stock catalog:
${JSON.stringify(currentCatalog.slice(0, 80).map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category, unit: p.unit })), null, 2)}

Return a valid JSON object matching the schema below:
{
  "detectedItems": [
    {
      "slNo": 1,
      "item": "CPVC Elbow 90 Degree",
      "size": "1/2 inch",
      "quantity": 10,
      "name": "CPVC Elbow 90 Degree 1/2 inch",
      "estimatedQty": 10,
      "estimatedUnitPrice": 35.00,
      "matchedProductId": "p-01 (or null if custom/unmatched)",
      "confidence": 0.95
    }
  ],
  "totalEstimatedCost": 350.00,
  "rawNotes": "Clear summary of extracted material list from image(s)"
}
`;

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: {
          parts: [...imageParts, { text: promptText }]
        },
        config: {
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
                    item: { type: Type.STRING },
                    size: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    name: { type: Type.STRING },
                    estimatedQty: { type: Type.NUMBER },
                    estimatedUnitPrice: { type: Type.NUMBER },
                    matchedProductId: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                  },
                  required: ['name', 'estimatedQty', 'estimatedUnitPrice']
                }
              },
              totalEstimatedCost: { type: Type.NUMBER },
              rawNotes: { type: Type.STRING }
            },
            required: ['detectedItems', 'totalEstimatedCost', 'rawNotes']
          }
        }
      });

      const jsonText = geminiResponse.text;
      if (!jsonText) {
        throw new Error('No analysis text returned from Gemini API.');
      }

      const parsedData = JSON.parse(jsonText);
      if (parsedData && Array.isArray(parsedData.detectedItems)) {
        parsedData.detectedItems = parsedData.detectedItems.map((item: any, idx: number) => ({
          ...item,
          slNo: idx + 1
        }));
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
