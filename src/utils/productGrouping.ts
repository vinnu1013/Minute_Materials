import { Product, ProductCategory } from '../types';

export interface ProductGroup {
  key: string;
  baseName: string;
  brand?: string;
  category: ProductCategory;
  subcategory: string;
  variants: Product[];
  popular: boolean;
}

export interface GroupVariantSummary {
  totalCount: number;
  sizeCount: number;
  colourCount: number;
  hasMultipleSizes: boolean;
  hasMultipleColours: boolean;
  hasMultipleOptions: boolean;
  badgeLabel: string;
  availabilityLabel: string;
  quoteAvailabilityLabel: string;
  buttonSuffix: string;
  selectorHeading: string;
  selectorSubheading: string;
}

const KNOWN_COLOUR_TOKEN =
  /^(?:snow white|ivory\s*\/\s*superior colours|ivory|superior colours|super special colours|french gold|rose gold|platinum|matte black|matt black|silky black|matte white|matt white|dark grey|dark gray|white|black|beige|coffee|grey|gray|gold|silver|chrome|bronze|copper|red|blue|green|yellow|brown|orange)$/i;

function isPartMatchingColour(part: string, specColour: string): boolean {
  const cleanPart = part.trim().toLowerCase();
  if (!cleanPart) return false;
  const barePart = cleanPart.replace(/\s*\([^)]*\)/g, '').trim();
  if (specColour) {
    const cleanSpec = specColour.trim().toLowerCase();
    const bareSpec = cleanSpec.replace(/\s*\([^)]*\)/g, '').trim();
    if (
      cleanPart === cleanSpec ||
      barePart === bareSpec ||
      cleanSpec.startsWith(barePart + ' ') ||
      cleanSpec.startsWith(cleanPart)
    ) {
      return true;
    }
  }
  return KNOWN_COLOUR_TOKEN.test(barePart) || KNOWN_COLOUR_TOKEN.test(cleanPart);
}

export function getGroupVariantSummary(variants: Product[]): GroupVariantSummary {
  const totalCount = variants.length;
  if (totalCount <= 1) {
    return {
      totalCount,
      sizeCount: totalCount,
      colourCount: 0,
      hasMultipleSizes: false,
      hasMultipleColours: false,
      hasMultipleOptions: false,
      badgeLabel: '',
      availabilityLabel: '',
      quoteAvailabilityLabel: '',
      buttonSuffix: 'Sizes',
      selectorHeading: 'Select Option:',
      selectorSubheading: 'Select required option and quantity to add to cart',
    };
  }

  const colourSet = new Set<string>();
  const sizeSet = new Set<string>();

  for (const v of variants) {
    const rawSpecColour = (
      v.specifications?.['Colour / Finish'] ||
      v.specifications?.['Colour name'] ||
      v.specifications?.['Color'] ||
      v.specifications?.['Colour'] ||
      ''
    ).trim();
    const specColour = rawSpecColour && rawSpecColour !== '-' ? rawSpecColour : '';
    if (specColour) {
      colourSet.add(specColour.toLowerCase());
    }

    const label = getVariantSizeLabel(v);
    if (label.includes('·')) {
      const parts = label.split('·').map((p) => p.trim()).filter(Boolean);
      const nonColourParts: string[] = [];
      for (const p of parts) {
        if (isPartMatchingColour(p, specColour)) {
          if (!specColour) {
            colourSet.add(p.toLowerCase());
          }
        } else {
          nonColourParts.push(p);
        }
      }
      if (nonColourParts.length > 0) {
        sizeSet.add(nonColourParts.join(' · ').toLowerCase());
      }
    } else if (isPartMatchingColour(label, specColour)) {
      if (!specColour) {
        colourSet.add(label.toLowerCase());
      }
    } else if (label && label !== 'Standard') {
      sizeSet.add(label.toLowerCase());
    }
  }

  const hasMultipleColours = colourSet.size > 1;
  // If no explicit sizes vary (sizeSet <= 1) and multiple colours exist, it's a pure colour variant group.
  // If colourCount === 0 and sizeCount <= 1 (e.g. part-code only fallbacks), treat variants.length as sizes.
  const hasMultipleSizes = sizeSet.size > 1 || (!hasMultipleColours && totalCount > 1);

  const colourCount = hasMultipleColours ? colourSet.size : colourSet.size;
  const sizeCount = hasMultipleSizes ? (sizeSet.size > 1 ? sizeSet.size : totalCount) : sizeSet.size;

  let badgeLabel = `${totalCount} Sizes`;
  let availabilityLabel = `${totalCount} sizes available`;
  let quoteAvailabilityLabel = `${totalCount} sizes · Quote`;
  let buttonSuffix = 'Sizes';
  let selectorHeading = `Select Size (${totalCount} options):`;
  let selectorSubheading = 'Select required size and quantity to add to cart';

  if (hasMultipleColours && hasMultipleSizes) {
    badgeLabel = `${sizeCount} Sizes · ${colourCount} Colours`;
    availabilityLabel = `${sizeCount} sizes · ${colourCount} colours`;
    quoteAvailabilityLabel = `${sizeCount} sizes · ${colourCount} colours`;
    buttonSuffix = 'Options';
    selectorHeading = `Select Size & Colour (${totalCount} options):`;
    selectorSubheading = 'Select required size, colour and quantity to add to cart';
  } else if (hasMultipleColours) {
    badgeLabel = `${colourCount} Colours`;
    availabilityLabel = `${colourCount} colours available`;
    quoteAvailabilityLabel = `${colourCount} colours · Quote`;
    buttonSuffix = 'Colours';
    selectorHeading = `Select Colour (${colourCount} colours):`;
    selectorSubheading = 'Select required colour and quantity to add to cart';
  } else {
    badgeLabel = `${sizeCount} Sizes`;
    availabilityLabel = `${sizeCount} sizes available`;
    quoteAvailabilityLabel = `${sizeCount} sizes · Quote`;
    buttonSuffix = 'Sizes';
    selectorHeading = `Select Size (${sizeCount} sizes):`;
    selectorSubheading = 'Select required size and quantity to add to cart';
  }

  return {
    totalCount,
    sizeCount,
    colourCount,
    hasMultipleSizes,
    hasMultipleColours,
    hasMultipleOptions: true,
    badgeLabel,
    availabilityLabel,
    quoteAvailabilityLabel,
    buttonSuffix,
    selectorHeading,
    selectorSubheading,
  };
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

export function getProductGroupKey(product: Product): string {
  const { baseName } = resolveBaseAndSize(product);
  const brandKey = (product.brand || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return `${product.category}::${brandKey}::${baseName.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

export function groupProductsByBaseName(products: Product[]): ProductGroup[] {
  const groupMap = new Map<string, ProductGroup>();

  for (const product of products) {
    const { baseName } = resolveBaseAndSize(product);
    const normalizedKey = getProductGroupKey(product);

    const existing = groupMap.get(normalizedKey);
    if (existing) {
      existing.variants.push(product);
      if (product.popular) {
        existing.popular = true;
      }
      if (!existing.brand && product.brand) {
        existing.brand = product.brand.trim();
      }
    } else {
      groupMap.set(normalizedKey, {
        key: normalizedKey,
        baseName,
        brand: product.brand?.trim() || undefined,
        category: product.category,
        subcategory: product.subcategory,
        variants: [product],
        popular: Boolean(product.popular),
      });
    }
  }

  return Array.from(groupMap.values());
}
