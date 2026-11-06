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
  // Add custom products here using singleProduct({...}) or ...multiSizeProduct({...})
  // ==========================================================================
];

// ----------------------------------------------------------------------------
// B) QUICKLY UPDATE EXISTING CATALOG PRODUCTS (Add / Modify Images or Prices)
// ----------------------------------------------------------------------------
// You can match any product by:
//   1. Product ID (e.g. 'plm-2225701')
//   2. SKU (e.g. 'PLM-2225701')
//   3. Base Name (e.g. 'Elbow 90°' or 'Ball Valve') — updates ALL sizes at once!
//
// Examples of adding / modifying single or multiple images:
//
// Example 1: Add multiple images to an existing fitting:
// {
//   match: 'Elbow 90°',
//   updates: {
//     image: '/products/cpvc-elbow-front.jpg',
//     images: [
//       '/products/cpvc-elbow-front.jpg',
//       '/products/cpvc-elbow-side.jpg',
//       '/products/cpvc-elbow-packaging.jpg',
//     ],
//   },
// },
//
// Example 2: Add images to a specific part number:
// {
//   match: 'plm-2225701',
//   updates: {
//     image: '/products/elbow-half-inch.jpg',
//     images: ['/products/elbow-half-inch.jpg', '/products/elbow-half-inch-box.jpg'],
//   },
// },
export const PRODUCT_UPDATES: ProductQuickOverride[] = [
  // Add your image or price updates here:
];

// ----------------------------------------------------------------------------
// C) REMOVE / HIDE ANY EXISTING PRODUCT (By ID, SKU, Exact Name, or Base Name)
// ----------------------------------------------------------------------------
// Example: 'plm-2225706' or 'PLM-2225706' or 'Elbow 90°'
export const REMOVE_PRODUCTS: string[] = [
  // 'plm-999',
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
