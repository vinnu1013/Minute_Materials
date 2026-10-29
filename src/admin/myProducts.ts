import { Product } from '../types';
import {
  singleProduct,
  multiSizeProduct,
  ProductQuickOverride,
} from './productHelpers';

/**
 * ============================================================================
 * 4. ADD / EDIT / DISCOUNT / REMOVE PRODUCTS IN CODE
 * ============================================================================
 * Everything you do in the Admin Panel can be done right here in plain code!
 *
 * WHERE TO PUT PRODUCT IMAGES:
 *   Upload your images into the `/public/products/` folder (e.g. `fan1.jpg`),
 *   then write `'/products/fan1.jpg'` in `image` or `images` below!
 *   (Or paste any `https://...` image link.)
 *   Add 2 or more images inside `images: [...]` to enable AUTOMATIC SLIDING!
 */

// ----------------------------------------------------------------------------
// A) ADD NEW PRODUCTS (Single Products, Multi-Size Groups, Fans, Lights, Tools)
// ----------------------------------------------------------------------------
export const MY_PRODUCTS: Product[] = [
  // ==========================================================================
  // TEMPLATE 1: FAN / LIGHT / TOOL (Opens Full Product Page + Auto-Slide Images)
  // Uncomment & edit to add:
  // ==========================================================================
  /*
  singleProduct({
    name: 'Longway Starlite-1 P1 Ceiling Fan, 1200mm/48 inch, Anti-Dust Decorative Star Rated - Grey',
    category: 'fans',               // 'fans' | 'lights' | 'tools' | 'plumbing' | 'electrical'
    subcategory: 'Ceiling Fans',
    price: 1249,
    originalPrice: 2881,            // Optional MRP (shows 56% Off + appears in Price Drops)
    unit: 'unit',
    brand: 'Longway',
    warranty: '2 year',
    rating: 4.1,
    reviewCount: 716,
    images: [
      '/products/fan-1.jpg',        // 2+ images automatically slide!
      '/products/fan-2.jpg',
      '/products/fan-3.jpg',
    ],
    specifications: {
      'No of blades': '3',
      'Design type': 'Solid',
      'Power source': 'Electric Powered',
      'Colour name': 'Grey',
      'No of speed': '5',
      'Wattage': '50 W',
      'Controller type': 'Switch Control',
      'Model name': 'Starlite-1 P1',
      'Material type': 'Sheet Metal',
      'Product dimensions': '28 x 54 x 16 cm',
      'Voltage': '230 V',
      'Weight': '4 kg',
    },
    whatsInTheBox: '1 Ceiling Fan Motor, 3 Blades, 2 Canopies, Downrod, Shackle Kit, Warranty Card',
    warrantyDetails: '2 Year Manufacturer Brand Warranty against manufacturing defects.',
    description: 'Starlite-1 P1 Ceiling Fan | 120 cm | 50W | Anti-Dust Decorative | Star Rated',
    popular: true,
  }),
  */

  // ==========================================================================
  // TEMPLATE 2: MULTI-SIZE MATERIAL (Shows 1 card -> asks size on "Add to Cart")
  // Uncomment & edit (keep the `...` in front of `multiSizeProduct`):
  // ==========================================================================
  
  ...multiSizeProduct({
    baseName: 'Vinay',
    category: 'plumbing',
    subcategory: 'Brass & GI Fittings',
    unit: 'unit',
    image: 'https://cdn.corporatefinanceinstitute.com/assets/master-traders.jpeg',
    popular: false,
    sizes: [
      { size: '1/2"',       price: 65,  originalPrice: 80 },
      { size: '3/4"',       price: 95,  originalPrice: 115 },
      { size: '3/4" x 1/2"', price: 78, originalPrice: 95 },
      { size: '1"',         price: 145, originalPrice: 175 },
    ],
  }),
  

  // ==========================================================================
  // TEMPLATE 3: SIMPLE SINGLE PRODUCT (1 Size)
  // Uncomment & edit:
  // ==========================================================================
  
  singleProduct({
    name: '9W Cool Day White LED Bulb B22',
    category: 'lights',
    subcategory: 'Bulbs',
    price: 79,
    originalPrice: 140,
    brand: 'Philips',
    warranty: '1 year',
    images: ['https://cdn.zeptonow.com/production/tr:w-640,ar-2400-2891.566265060241,pr-true,f-auto,q-80/cms/product_variant/8bf8b66b-11cd-4a69-b183-f68083ce4222_aspect_ratios=3x4.jpeg', '/products/led-bulb-2.jpg'],
    specifications: {
      'Wattage': '9 W',
      'Light colour': 'Cool Day White (6500K)',
      'Base / Holder type': 'B22 Pin',
      'Power source': 'Corded Electric',
    },
  }),
  
];

// ----------------------------------------------------------------------------
// B) QUICKLY UPDATE EXISTING CATALOG PRODUCTS (By ID, SKU, or Exact Name)
// ----------------------------------------------------------------------------
// Example: { match: 'p-001', updates: { price: 18, originalPrice: 22 } }
export const PRODUCT_UPDATES: ProductQuickOverride[] = [
  // { match: 'p-001', updates: { price: 18, popular: true } },
];

// ----------------------------------------------------------------------------
// C) REMOVE / HIDE ANY EXISTING PRODUCT (By ID, SKU, Exact Name, or Base Name)
// ----------------------------------------------------------------------------
// Example: 'p-006' or 'PLM-2225706' or 'Elbow 90°'
export const REMOVE_PRODUCTS: string[] = [
  // 'p-999',
];

// ----------------------------------------------------------------------------
// D) BULK CATEGORY PRICE CHANGE (%) — Same as Admin Panel Bulk Price Tool!
// ----------------------------------------------------------------------------
// Set -10 for a 10% discount/price drop, or +5 for a 5% price increase.
// Leave at 0 for no bulk percentage change.
export const CATEGORY_BULK_PRICE_PERCENT: Record<string, number> = {
  plumbing: 0,
  electrical: 0,
  fans: 0,
  lights: 0,
  tools: 0,
};

// Re-export helpers so they are always recognized as used imports if templates are commented
export { singleProduct, multiSizeProduct };
