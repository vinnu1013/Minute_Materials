import { Product } from '../../types';
import {
  ASHIRVAD_PRODUCTS,
  CATALOG_VERSION,
  INITIAL_STORE_SETTINGS,
} from './ashirvadProducts';
import { CERA_SANITARY_PRODUCTS } from './ceraSanitaryProducts';
import { CERA_FAUCETS_PRODUCTS } from './ceraFaucetsProducts';

/**
 * ============================================================================
 * BRAND-WISE PRODUCT CATALOG REGISTRY (/src/data/brands/)
 * ============================================================================
 * Every brand has its own separate file inside `/src/data/brands/` for easy editing:
 *   - Ashirvad          : ./ashirvadProducts.ts     (ASHIRVAD_PRODUCTS)
 *   - Cera Sanitaryware : ./ceraSanitaryProducts.ts (CERA_SANITARY_PRODUCTS)
 *   - Cera Faucets/Fits : ./ceraFaucetsProducts.ts  (CERA_FAUCETS_PRODUCTS)
 *
 * HOW TO ADD ANOTHER BRAND (e.g. Astral, Finolex, Supreme, Polycab, Havells):
 *   1. Create a new file in this folder, e.g. `/src/data/brands/astralProducts.ts`:
 *        import { Product } from '../../types';
 *        export const ASTRAL_PRODUCTS: Product[] = [ ... ];
 *      (Set `"brand": "Astral"` on each product item!)
 *   2. Import it below and spread `...ASTRAL_PRODUCTS` inside `ALL_BRAND_PRODUCTS`.
 *   3. Save! All products auto-sync to the store and appear in the Brand Filter.
 */

export const ALL_BRAND_PRODUCTS: Product[] = [
  ...ASHIRVAD_PRODUCTS,
  ...CERA_SANITARY_PRODUCTS,
  ...CERA_FAUCETS_PRODUCTS,
];

export {
  ASHIRVAD_PRODUCTS,
  CERA_SANITARY_PRODUCTS,
  CERA_FAUCETS_PRODUCTS,
  ALL_BRAND_PRODUCTS as INITIAL_PRODUCTS,
  CATALOG_VERSION,
  INITIAL_STORE_SETTINGS,
};
