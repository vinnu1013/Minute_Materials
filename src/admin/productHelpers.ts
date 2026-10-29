import { Product, ProductUnit, StockStatus } from '../types';

function makeSlug(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/"/g, 'in')
    .replace(/½/g, '1-2')
    .replace(/¾/g, '3-4')
    .replace(/¼/g, '1-4')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeDeterministicSku(category: string, name: string, sizeLabel = ''): string {
  const catPrefix = (category || 'MAT')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  const words = (name || 'ITEM')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join('');
  const sizePart = sizeLabel
    ? '-' +
      makeSlug(sizeLabel)
        .replace(/-/g, '')
        .toUpperCase()
        .slice(0, 6)
    : '';
  return `${catPrefix}-${words || 'ITM'}${sizePart}`;
}

function computeStockStatus(stockCount: number, explicit?: StockStatus): StockStatus {
  if (explicit) return explicit;
  if (stockCount <= 0) return 'out_of_stock';
  if (stockCount <= 10) return 'low_stock';
  return 'in_stock';
}

export interface SimpleProductInput {
  /** Optional custom ID (auto-generated from category + name if omitted) */
  id?: string;
  /** Full product name shown on cards & product page */
  name: string;
  /** Main category id: 'plumbing' | 'electrical' | 'fans' | 'lights' | 'tools' (or any custom category id) */
  category: string;
  /** Subcategory name (e.g., 'Ceiling Fans', 'Decorative Lights', 'CPVC Pipes & Fittings') */
  subcategory?: string;
  /** Selling price in ₹ */
  price: number;
  /** Optional MRP / original price in ₹ (shows strikethrough + % OFF & appears in Price Drops!) */
  originalPrice?: number;
  /** Unit label: 'unit' | 'piece' | 'set' | 'box' | 'meter' | 'roll' | 'pair' | 'ft' | 'kg' | 'ltr' */
  unit?: ProductUnit;
  /** Single cover image path (e.g., '/products/fan-1.jpg' or 'https://...') */
  image?: string;
  /** Multiple images! Add 2+ image paths/URLs and they will AUTOMATICALLY SLIDE! */
  images?: string[];
  /** Brand name (e.g., 'Longway', 'Polycab', 'Usha', 'Havells', 'Astral') */
  brand?: string;
  /** Short description */
  description?: string;
  /** Stock quantity (defaults to 100) */
  stockCount?: number;
  /** Optional explicit stock status ('in_stock' | 'low_stock' | 'out_of_stock') */
  stockStatus?: StockStatus;
  /** Show in Popular / Featured items */
  popular?: boolean;
  /** Optional SKU (auto-generated if omitted) */
  sku?: string;
  /** Optional HSN code for GST invoices */
  hsnCode?: string;
  /** Star rating (e.g., 4.2) */
  rating?: number;
  /** Number of customer ratings/reviews (e.g., 716) */
  reviewCount?: number;
  /** Warranty badge text (e.g., '2 year', '1 Year Warranty') */
  warranty?: string;
  /** Detailed warranty coverage text */
  warrantyDetails?: string;
  /** Box contents (e.g., '1 Motor, 3 Blades, 2 Canopies, Downrod, Warranty Card') */
  whatsInTheBox?: string;
  /** Vendor / supplier details */
  vendorDetails?: string;
  /** Technical specifications & key highlights shown on the Product Details Page */
  specifications?: Record<string, string>;
  /** Optional manufacturer banner images shown under Brand Images */
  brandImages?: string[];
}

export interface SizeOptionInput {
  /** Size label shown when customer clicks Add to Cart (e.g., '1/2"', '3/4"', '1200mm (48")', '9W') */
  size: string;
  /** Selling price for this size in ₹ */
  price: number;
  /** Optional MRP / original price for this size in ₹ */
  originalPrice?: number;
  /** Optional stock count for this size (defaults to 100) */
  stockCount?: number;
  /** Optional custom SKU for this size */
  sku?: string;
  /** Optional size-specific image or gallery */
  image?: string;
  images?: string[];
}

export interface MultiSizeProductInput extends Omit<SimpleProductInput, 'name' | 'price' | 'originalPrice'> {
  /** Shared product name (e.g., 'CPVC Brass Elbow', 'Polycab Ceiling Fan', 'LED Bulb') */
  baseName: string;
  /** List of sizes & prices — automatically grouped into 1 card that asks size on Add to Cart! */
  sizes: SizeOptionInput[];
}

/**
 * Helper 1: Create a single product (Plumbing, Electrical, Fan, Light, or Tool)
 */
export function singleProduct(input: SimpleProductInput): Product {
  const gallery = [
    ...(Array.isArray(input.images) ? input.images : []),
    ...(input.image ? [input.image] : []),
  ]
    .map((u) => (u || '').trim())
    .filter((u, idx, arr) => Boolean(u) && arr.indexOf(u) === idx);

  const stockCount = input.stockCount !== undefined ? input.stockCount : 100;
  const cleanCat = (input.category || 'plumbing').toLowerCase().trim();
  const id = input.id || `code-${makeSlug(cleanCat)}-${makeSlug(input.name)}`;

  const keyHighlights: Record<string, string> = {};
  if (input.specifications) {
    Object.entries(input.specifications)
      .slice(0, 6)
      .forEach(([k, v]) => {
        if (k && String(v ?? '').trim()) {
          keyHighlights[k.trim()] = String(v).trim();
        }
      });
  }
  if (input.warranty && !keyHighlights['Warranty']) {
    keyHighlights['Warranty'] = input.warranty;
  }

  return {
    id,
    name: input.name.trim(),
    category: cleanCat,
    subcategory: (input.subcategory || 'General').trim(),
    price: Number(input.price) || 0,
    originalPrice: input.originalPrice !== undefined ? Number(input.originalPrice) : undefined,
    unit: input.unit || 'unit',
    brand: input.brand?.trim() || undefined,
    stockCount,
    stockStatus: computeStockStatus(stockCount, input.stockStatus),
    sku: input.sku || makeDeterministicSku(cleanCat, input.name),
    hsnCode: input.hsnCode,
    description: input.description || '',
    image: gallery[0] || '',
    images: gallery.length > 0 ? gallery : undefined,
    brandImages: input.brandImages?.filter(Boolean),
    popular: Boolean(input.popular),
    rating: input.rating,
    reviewCount: input.reviewCount,
    warranty: input.warranty,
    warrantyDetails: input.warrantyDetails,
    whatsInTheBox: input.whatsInTheBox,
    vendorDetails: input.vendorDetails,
    specifications: input.specifications,
    keyHighlights: Object.keys(keyHighlights).length > 0 ? keyHighlights : undefined,
  };
}

/**
 * Helper 2: Create a multi-size product group (spread with `...multiSizeProduct({...})`)
 * Shows as ONE card in the catalog and asks the customer to pick the size when clicking Add to Cart!
 */
export function multiSizeProduct(input: MultiSizeProductInput): Product[] {
  const cleanBase = input.baseName.trim();
  const cleanCat = (input.category || 'plumbing').toLowerCase().trim();

  return input.sizes.map((sz) => {
    const cleanSize = sz.size.trim();
    const fullName = `${cleanBase} ${cleanSize}`;
    const variantGallery =
      (sz.images && sz.images.length > 0) || sz.image
        ? [
            ...(Array.isArray(sz.images) ? sz.images : []),
            ...(sz.image ? [sz.image] : []),
          ]
        : input.images;

    const built = singleProduct({
      ...input,
      id: input.id
        ? `${input.id}-${makeSlug(cleanSize)}`
        : `code-${makeSlug(cleanCat)}-${makeSlug(cleanBase)}-${makeSlug(cleanSize)}`,
      name: fullName,
      price: sz.price,
      originalPrice: sz.originalPrice,
      stockCount: sz.stockCount ?? input.stockCount ?? 100,
      sku: sz.sku || makeDeterministicSku(cleanCat, cleanBase, cleanSize),
      image: sz.image || input.image,
      images: variantGallery,
    });

    return {
      ...built,
      baseName: cleanBase,
      sizeLabel: cleanSize,
    };
  });
}

export interface ProductQuickOverride {
  /** Match an existing product by its ID (e.g. 'p-001'), SKU (e.g. 'PLM-2225701'), or exact Name */
  match: string;
  /** Fields to update on that product (price, originalPrice, stockCount, image, images, popular, etc.) */
  updates: Partial<Product>;
}
