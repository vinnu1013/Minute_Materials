import { Product } from '../../types';
import {
  ASHIRVAD_PRODUCTS,
  CATALOG_VERSION,
  INITIAL_STORE_SETTINGS,
} from './ashirvadProducts';
import { CERA_SANITARY_PRODUCTS } from './ceraSanitaryProducts';
import { CERA_FAUCETS_PRODUCTS } from './ceraFaucetsProducts';
import { ANCHOR_ELECTRICAL_PRODUCTS } from './anchorElectricalProducts';
import { PANASONIC_ELECTRICAL_PRODUCTS } from './panasonicElectricalProducts';
import { MARU_ELECTRICAL_PRODUCTS } from './maruElectricalProducts';
import { SUDHAKAR_PLUMBING_PRODUCTS } from './sudhakarPlumbingProducts';
import { VECTUS_BATHWARE_PRODUCTS } from './vectusBathwareProducts';
import { POLYCAB_ELECTRICAL_PRODUCTS } from './polycabElectricalProducts';

/**
 * ============================================================================
 * BRAND-WISE PRODUCT CATALOG REGISTRY (/src/data/brands/)
 * ============================================================================
 * Every brand has its own separate file inside `/src/data/brands/` for easy editing:
 *   - Ashirvad              : ./ashirvadProducts.ts          (ASHIRVAD_PRODUCTS)
 *   - Cera Sanitaryware     : ./ceraSanitaryProducts.ts      (CERA_SANITARY_PRODUCTS)
 *   - Cera Faucets/Fits     : ./ceraFaucetsProducts.ts       (CERA_FAUCETS_PRODUCTS)
 *   - Anchor by Panasonic   : ./anchorElectricalProducts.ts  (ANCHOR_ELECTRICAL_PRODUCTS)
 *   - Panasonic Electrical  : ./panasonicElectricalProducts.ts (PANASONIC_ELECTRICAL_PRODUCTS)
 *   - Maru Electricals      : ./maruElectricalProducts.ts    (MARU_ELECTRICAL_PRODUCTS)
 *   - Polycab Wires         : ./polycabElectricalProducts.ts (POLYCAB_ELECTRICAL_PRODUCTS)
 *   - Sudhakar Pipes        : ./sudhakarPlumbingProducts.ts  (SUDHAKAR_PLUMBING_PRODUCTS)
 *   - Vectus Bathware       : ./vectusBathwareProducts.ts    (VECTUS_BATHWARE_PRODUCTS)
 */

export const ALL_BRAND_PRODUCTS: Product[] = [
  ...ASHIRVAD_PRODUCTS,
  ...CERA_SANITARY_PRODUCTS,
  ...CERA_FAUCETS_PRODUCTS,
  ...ANCHOR_ELECTRICAL_PRODUCTS,
  ...PANASONIC_ELECTRICAL_PRODUCTS,
  ...MARU_ELECTRICAL_PRODUCTS,
  ...POLYCAB_ELECTRICAL_PRODUCTS,
  ...SUDHAKAR_PLUMBING_PRODUCTS,
  ...VECTUS_BATHWARE_PRODUCTS,
];

export {
  ASHIRVAD_PRODUCTS,
  CERA_SANITARY_PRODUCTS,
  CERA_FAUCETS_PRODUCTS,
  ANCHOR_ELECTRICAL_PRODUCTS,
  PANASONIC_ELECTRICAL_PRODUCTS,
  MARU_ELECTRICAL_PRODUCTS,
  POLYCAB_ELECTRICAL_PRODUCTS,
  SUDHAKAR_PLUMBING_PRODUCTS,
  VECTUS_BATHWARE_PRODUCTS,
  ALL_BRAND_PRODUCTS as INITIAL_PRODUCTS,
  CATALOG_VERSION,
  INITIAL_STORE_SETTINGS,
};
