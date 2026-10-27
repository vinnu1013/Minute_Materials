export type ProductCategory = string;

export type ProductUnit =
  | 'piece'
  | 'unit'
  | 'ea'
  | 'ft'
  | 'box'
  | 'pack'
  | 'roll'
  | 'meter'
  | 'set'
  | 'pair'
  | 'coil'
  | 'kg'
  | 'ltr'
  | string;

export interface CategoryConfig {
  id: string;
  name: string;
  subcategories: string[];
  description?: string;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  baseName?: string;
  sizeLabel?: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  originalPrice?: number;
  unit: ProductUnit;
  brand?: string;
  fastDelivery?: boolean;
  stockStatus: StockStatus;
  stockCount: number;
  sku: string;
  hsnCode?: string;
  partCode?: string;
  description: string;
  image: string;
  popular?: boolean;
  specifications?: Record<string, string>;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customNotes?: string;
}

export type BookingType = 'cart_delivery' | 'phone_callback' | 'image_upload' | 'whatsapp_order';

export type OrderStatus = 'new' | 'packing' | 'dispatched' | 'delivered' | 'cancelled';

export interface GeminiDetectedItem {
  slNo?: number;
  item?: string;
  size?: string;
  quantity?: number;
  name: string;
  estimatedQty: number;
  estimatedUnitPrice: number;
  matchedProductId?: string;
  confidence?: number;
}

export interface CustomerLocation {
  address: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  driveTimeMins?: number;
}

export type UserRole = 'plumber_electrician' | 'customer';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  userRole?: UserRole;
  tradeCompany?: string;
  address?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  userId?: string;
  bookingType: BookingType;
  createdAt: string;
  status: OrderStatus;
  customerName: string;
  userRole?: UserRole;
  plumberPhone: string; // MANDATORY for Image Upload & Callback, required for orders
  tradeCompany?: string;
  deliveryAddress?: string;
  customerLat?: number;
  customerLng?: number;
  distanceKm?: number;
  driveTimeMins?: number;
  deliveryOption?: 'express_60min' | 'scheduled_2hr' | 'same_day';
  scheduledDate?: string;
  scheduledTime?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: ProductCategory;
    unit: string;
  }>;
  imageBase64?: string;
  geminiAnalysis?: {
    detectedItems: GeminiDetectedItem[];
    totalEstimatedCost: number;
    rawNotes?: string;
  };
  whatsappMessage?: string;
  notes?: string;
  recipientType?: 'me' | 'others';
  recipientName?: string;
  recipientPhone?: string;
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  handlingFee?: number;
  gstAmount?: number;
  totalPrice: number;
  paymentMethod?: 'cash_on_delivery' | 'online_upi' | 'qr_scanner' | 'trade_credit' | 'card_online';
  upiTxnRef?: string;
  paymentStatus?: 'pending' | 'verified' | 'paid_cod' | 'paid_online';
}

export interface StoreSettings {
  storeName: string;
  helplineNumber: string;
  whatsappNumber: string;
  deliveryFeeExpress: number;
  deliveryFeeStandard: number;
  minOrderFreeDelivery: number;
  platformFee: number;
  handlingFee: number;
  gstPercentage: number;
  upiId: string;
  accountHolderName: string;
  activeDeliveryNotice: string;
  adminPin: string;
  depotLat: number;
  depotLng: number;
  depotAddress: string;
}

export interface StoreConfig {
  callNumber?: string;
  emergencyCallNumber?: string;
  whatsappNumber: string;
  storeName?: string;
}

export interface UserLocation {
  address?: string;
  lat?: number;
  lng?: number;
  areaName?: string;
}

