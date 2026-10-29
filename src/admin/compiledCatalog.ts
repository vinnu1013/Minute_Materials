import { Product, StoreSettings, CategoryConfig } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { ADMIN_STORE_SETTINGS } from './storeSettings';
import { ADMIN_CATEGORIES } from './categories';
import { ADMIN_DELIVERY_AREAS } from './deliveryAreas';
import {
  MY_PRODUCTS,
  PRODUCT_UPDATES,
  REMOVE_PRODUCTS,
  CATEGORY_BULK_PRICE_PERCENT,
} from './myProducts';
import { ProductQuickOverride } from './productHelpers';

/**
 * Fast, deterministic FNV-1a hash that runs identically in Browser & Node.js.
 */
export function fastDeterministicHash(input: unknown): string {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  let h1 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + '-' + str.length.toString(36);
}

export interface CodeSyncPayload {
  storeSettings: StoreSettings;
  categories: CategoryConfig[];
  myProducts: Product[];
  productUpdates: ProductQuickOverride[];
  removeProducts: string[];
  categoryBulkPricePercent: Record<string, number>;
  baseProductsHashes?: Record<string, string>;
}

export function computeProductsHashMap(list: Product[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of list) {
    if (item && item.id) {
      map[item.id] = fastDeterministicHash(item);
    }
  }
  return map;
}

export function applyCodeRulesToProductList(
  currentList: Product[],
  options: {
    myProducts: Product[];
    prevMyProductIds?: string[];
    productUpdates: ProductQuickOverride[];
    removeProducts: string[];
    categoryBulkDeltaPercent?: Record<string, number>;
  }
): Product[] {
  const prevMyIds = new Set(options.prevMyProductIds || []);
  const currentMyById = new Map(options.myProducts.map((p) => [p.id, p]));

  // 1. Remove any MY_PRODUCTS items that were deleted/commented out in code,
  //    and update any existing MY_PRODUCTS items in-place
  const seenMyIds = new Set<string>();
  let working: Product[] = [];

  for (const existing of currentList) {
    if (!existing || !existing.id) continue;
    if (currentMyById.has(existing.id)) {
      working.push(currentMyById.get(existing.id)!);
      seenMyIds.add(existing.id);
    } else if (prevMyIds.has(existing.id)) {
      // Deleted from MY_PRODUCTS in code -> drop it
      continue;
    } else {
      working.push(existing);
    }
  }

  // Prepend newly added MY_PRODUCTS items so they appear first
  const brandNewMyProducts = options.myProducts.filter((p) => !seenMyIds.has(p.id));
  if (brandNewMyProducts.length > 0) {
    working = [...brandNewMyProducts, ...working];
  }

  // 2. Apply PRODUCT_UPDATES overrides (matched by id, sku, or exact name)
  if (options.productUpdates.length > 0) {
    working = working.map((prod) => {
      let updated = prod;
      for (const rule of options.productUpdates) {
        const needle = (rule.match || '').trim().toLowerCase();
        if (!needle) continue;
        const matches =
          prod.id.toLowerCase() === needle ||
          (prod.sku && prod.sku.toLowerCase() === needle) ||
          prod.name.toLowerCase() === needle ||
          (prod.baseName && prod.baseName.toLowerCase() === needle);
        if (matches) {
          const nextGallery =
            rule.updates.images && rule.updates.images.length > 0
              ? rule.updates.images
              : rule.updates.image
              ? [rule.updates.image, ...(updated.images || []).filter((u) => u !== rule.updates.image)]
              : updated.images;
          updated = {
            ...updated,
            ...rule.updates,
            image: rule.updates.image ?? (nextGallery && nextGallery[0]) ?? updated.image,
            images: nextGallery,
          };
        }
      }
      return updated;
    });
  }

  // 3. Apply REMOVE_PRODUCTS (matched by id, sku, exact name, or baseName)
  if (options.removeProducts.length > 0) {
    const removeSet = new Set(
      options.removeProducts.map((r) => (r || '').trim().toLowerCase()).filter(Boolean)
    );
    if (removeSet.size > 0) {
      working = working.filter((prod) => {
        if (removeSet.has(prod.id.toLowerCase())) return false;
        if (prod.sku && removeSet.has(prod.sku.toLowerCase())) return false;
        if (removeSet.has(prod.name.toLowerCase())) return false;
        if (prod.baseName && removeSet.has(prod.baseName.toLowerCase())) return false;
        return true;
      });
    }
  }

  // 4. Apply bulk percentage adjustments per category (if any non-zero delta)
  if (options.categoryBulkDeltaPercent) {
    const activeCats = Object.entries(options.categoryBulkDeltaPercent).filter(
      ([, pct]) => typeof pct === 'number' && !Number.isNaN(pct) && pct !== 0
    );
    if (activeCats.length > 0) {
      const pctByCat = new Map(activeCats.map(([c, pct]) => [c.toLowerCase(), pct]));
      working = working.map((prod) => {
        const pct = pctByCat.get((prod.category || '').toLowerCase());
        if (!pct || prod.price <= 0) return prod;
        const baseRefPrice =
          pct < 0 && (!prod.originalPrice || prod.originalPrice <= prod.price)
            ? prod.price
            : prod.originalPrice;
        const nextPrice = Math.max(0.5, Math.round(prod.price * (1 + pct / 100) * 100) / 100);
        return {
          ...prod,
          originalPrice: pct < 0 ? baseRefPrice : prod.originalPrice,
          price: nextPrice,
        };
      });
    }
  }

  return working;
}

export function buildCompiledInitialProducts(): Product[] {
  return applyCodeRulesToProductList([...INITIAL_PRODUCTS], {
    myProducts: MY_PRODUCTS,
    productUpdates: PRODUCT_UPDATES,
    removeProducts: REMOVE_PRODUCTS,
    categoryBulkDeltaPercent: CATEGORY_BULK_PRICE_PERCENT,
  });
}

export function getCodeConfigSignature(): string {
  return fastDeterministicHash({
    settings: ADMIN_STORE_SETTINGS,
    categories: ADMIN_CATEGORIES,
    areas: ADMIN_DELIVERY_AREAS,
    myProducts: MY_PRODUCTS,
    updates: PRODUCT_UPDATES,
    removes: REMOVE_PRODUCTS,
    bulkPct: CATEGORY_BULK_PRICE_PERCENT,
    baseProductsSig: fastDeterministicHash(INITIAL_PRODUCTS),
  });
}

export {
  ADMIN_STORE_SETTINGS,
  ADMIN_CATEGORIES,
  ADMIN_DELIVERY_AREAS,
  INITIAL_PRODUCTS as BASE_INITIAL_PRODUCTS,
  MY_PRODUCTS,
  PRODUCT_UPDATES,
  REMOVE_PRODUCTS,
  CATEGORY_BULK_PRICE_PERCENT,
};
