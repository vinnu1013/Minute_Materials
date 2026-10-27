import { Product, ProductCategory } from '../types';

export interface ProductGroup {
  key: string;
  baseName: string;
  category: ProductCategory;
  subcategory: string;
  variants: Product[];
  popular: boolean;
}

// Fallback parser for custom/admin-added products that don't explicitly define baseName/sizeLabel
const TRAILING_SIZE_PATTERN =
  /^(.*?)\s+((?:(?:\d+\s+)?[¼½¾]|\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)(?:\s*(?:x|X|×|and|&)\s*(?:(?:\d+\s+)?[¼½¾]|\d+(?:\.\d+)?(?:\s*\/\s*\d+)?))*(?:\s*(?:inch|in|"|mm|cm|mtr|m|ft|oz|ml|sq\s*mm|amp|a))?(?:\s*\([^)]+\))*)$/i;

export function resolveBaseAndSize(product: Product): { baseName: string; sizeLabel: string } {
  if (product.baseName && product.baseName.trim()) {
    const cleanBase = product.baseName.trim();
    if (product.sizeLabel && product.sizeLabel.trim()) {
      return { baseName: cleanBase, sizeLabel: product.sizeLabel.trim() };
    }
    const remainder = product.name.startsWith(cleanBase)
      ? product.name.slice(cleanBase.length).trim()
      : '';
    return {
      baseName: cleanBase,
      sizeLabel: remainder || (product.partCode ? `Part #${product.partCode}` : 'Standard'),
    };
  }

  const trimmedName = (product.name || '').trim();
  const match = trimmedName.match(TRAILING_SIZE_PATTERN);
  if (match && match[1] && match[2]) {
    // Avoid splitting names ending in degree numbers like "Elbow 90" without °
    const candidateBase = match[1].trim();
    const candidateSize = match[2].trim();
    if (candidateBase.length >= 3) {
      return { baseName: candidateBase, sizeLabel: candidateSize };
    }
  }

  return {
    baseName: trimmedName,
    sizeLabel: product.sizeLabel?.trim() || (product.partCode ? `Part #${product.partCode}` : 'Standard'),
  };
}

export function getVariantSizeLabel(product: Product): string {
  const { baseName, sizeLabel } = resolveBaseAndSize(product);
  if (sizeLabel && sizeLabel !== 'Standard') {
    return sizeLabel;
  }
  const diff = product.name.replace(baseName, '').trim();
  if (diff) return diff;
  if (product.partCode) return `Part #${product.partCode}`;
  return product.sku || product.name;
}

export function groupProductsByBaseName(products: Product[]): ProductGroup[] {
  const groupMap = new Map<string, ProductGroup>();

  for (const product of products) {
    const { baseName } = resolveBaseAndSize(product);
    const normalizedKey = `${product.category}::${baseName.toLowerCase().replace(/\s+/g, ' ').trim()}`;

    const existing = groupMap.get(normalizedKey);
    if (existing) {
      existing.variants.push(product);
      if (product.popular) {
        existing.popular = true;
      }
    } else {
      groupMap.set(normalizedKey, {
        key: normalizedKey,
        baseName,
        category: product.category,
        subcategory: product.subcategory,
        variants: [product],
        popular: Boolean(product.popular),
      });
    }
  }

  return Array.from(groupMap.values());
}
