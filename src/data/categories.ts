import { CategoryConfig } from '../types';
import { ADMIN_CATEGORIES } from '../admin/categories';

export const CATEGORIES_VERSION = '2026-04-main-categories-v2';

export const DEFAULT_CATEGORIES: CategoryConfig[] = ADMIN_CATEGORIES;

export function slugifyCategoryId(name: string): string {
  const cleaned = (name || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `cat-${Date.now()}`;
}

export function getCategoryDisplayName(
  categoryId: string,
  categories: CategoryConfig[] = DEFAULT_CATEGORIES
): string {
  if (!categoryId || categoryId.toLowerCase() === 'all') {
    return 'All Materials';
  }
  const match = categories.find(
    (c) => c.id.toLowerCase() === categoryId.toLowerCase()
  );
  if (match) return match.name;
  return categoryId
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function getCategorySizePresets(categoryId: string, subcategory = ''): string[] {
  const cat = (categoryId || '').toLowerCase();
  const sub = (subcategory || '').toLowerCase();

  if (cat === 'plumbing') {
    if (sub.includes('solvent') || sub.includes('sealant')) {
      return ['50 ml', '100 ml', '250 ml', '500 ml', '1 Ltr'];
    }
    if (sub.includes('swr') || sub.includes('pvc')) {
      return ['40mm (1.5")', '50mm (2")', '75mm (2.5")', '110mm (4")', '160mm (6")'];
    }
    return ['1/2"', '3/4"', '1"', '1 1/4"', '1 1/2"', '2"', '1" x 1/2"', '3/4" x 1/2"'];
  }

  if (cat === 'electrical') {
    if (sub.includes('wire') || sub.includes('cable')) {
      return ['0.75 sqmm', '1.0 sqmm', '1.5 sqmm', '2.5 sqmm', '4.0 sqmm', '6.0 sqmm'];
    }
    if (sub.includes('mcb') || sub.includes('rccb') || sub.includes('distribution')) {
      return ['6A SP', '10A SP', '16A SP', '20A SP', '32A SP', '40A DP', '63A DP', '4-Way DB', '8-Way DB', '12-Way DB'];
    }
    if (sub.includes('switch') || sub.includes('socket') || sub.includes('box')) {
      return ['1M', '2M', '3M', '4M', '6M', '8M', '12M', '6A', '16A'];
    }
    if (sub.includes('conduit')) {
      return ['20mm Light', '20mm Medium', '20mm Heavy', '25mm Medium', '25mm Heavy'];
    }
    return ['1.0 sqmm', '1.5 sqmm', '2.5 sqmm', '4.0 sqmm', '6A', '16A', '32A', '20mm', '25mm'];
  }

  if (cat === 'fans') {
    if (sub.includes('exhaust')) {
      return ['150mm (6")', '200mm (8")', '225mm (9")', '250mm (10")', '300mm (12")'];
    }
    if (sub.includes('table') || sub.includes('portable')) {
      return ['200mm (8")', '300mm (12")', '400mm (16")', 'USB Rechargeable'];
    }
    return ['600mm (24")', '900mm (36")', '1200mm (48")', '1400mm (56")', '150mm (6")', '225mm (9")', '400mm (16")'];
  }

  if (cat === 'lights') {
    if (sub.includes('tube')) {
      return ['10W (2ft)', '20W (4ft)', '22W (4ft)', '36W High-Lumen', 'Cool Day White', 'Warm White'];
    }
    if (sub.includes('bed')) {
      return ['0.5W Night Plug', '3W Warm White', '5W Warm Touch', '7W Reading Lamp'];
    }
    if (sub.includes('decorative')) {
      return ['3W', '6W', '12W', '18W', '5 Meter Strip', 'Warm White', '3-in-1 Tri-Color'];
    }
    return ['0.5W', '5W', '7W', '9W', '12W', '15W', '18W', '20W (4ft)', '30W', '50W'];
  }

  if (cat === 'tools') {
    return ['6"', '8"', '10"', '12"', '14"', '18"', '24"', '6mm', '8mm', '10mm', '3 Meter', '5 Meter'];
  }

  return ['Small', 'Medium', 'Large', 'Standard', 'Heavy Duty'];
}

export function generateAutoSku(
  categoryId: string,
  baseName: string,
  sizeLabel = '',
  index = 1
): string {
  const catCode = (categoryId || 'MAT')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  const nameCode = (baseName || 'ITEM')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join('');
  const sizeCode = sizeLabel
    ? '-' +
      sizeLabel
        .replace(/"/g, 'IN')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 5)
    : '';
  const suffix = String(Date.now() % 10000).padStart(4, '0');
  return `${catCode}-${nameCode || 'ITM'}${sizeCode}-${suffix}${index > 1 ? index : ''}`;
}

export function isDetailPageCategory(
  categoryId: string,
  categories: CategoryConfig[] = DEFAULT_CATEGORIES
): boolean {
  const raw = (categoryId || '').toLowerCase().trim();
  if (!raw || raw === 'all') return false;
  if (
    raw === 'fans' ||
    raw === 'lights' ||
    raw === 'tools' ||
    raw.includes('fan') ||
    raw.includes('light') ||
    raw.includes('lamp') ||
    raw.includes('bulb') ||
    raw.includes('tool')
  ) {
    return true;
  }
  const display = getCategoryDisplayName(categoryId, categories).toLowerCase();
  return (
    display.includes('fan') ||
    display.includes('light') ||
    display.includes('lamp') ||
    display.includes('bulb') ||
    display.includes('tool')
  );
}

export function getProductGalleryImages(
  product?: { image?: string; images?: string[] } | null,
  fallbackVariants?: Array<{ image?: string; images?: string[] }>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const pushUrl = (url?: string) => {
    const clean = (url || '').trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    result.push(clean);
  };

  if (product) {
    if (Array.isArray(product.images)) {
      product.images.forEach(pushUrl);
    }
    pushUrl(product.image);
  }

  if (result.length === 0 && Array.isArray(fallbackVariants)) {
    fallbackVariants.forEach((v) => {
      if (Array.isArray(v.images)) {
        v.images.forEach(pushUrl);
      }
      pushUrl(v.image);
    });
  }

  return result;
}

export function getCategorySpecPresets(categoryId: string): string[] {
  const cat = (categoryId || '').toLowerCase();
  if (cat.includes('fan')) {
    return [
      'No of blades',
      'Design type',
      'Power source',
      'Colour name',
      'No of speed',
      'Wattage',
      'Sweep size',
      'Controller type',
      'Model name',
      'Material type',
      'Blade material',
      'Product dimensions',
      'Voltage',
      'Weight',
      'Speed control',
    ];
  }
  if (cat.includes('light') || cat.includes('bulb') || cat.includes('lamp')) {
    return [
      'Wattage',
      'Light colour',
      'Design type',
      'Power source',
      'Colour name',
      'Base / Holder type',
      'Material type',
      'Lumen output',
      'Voltage',
      'Model name',
      'Product dimensions',
      'Weight',
    ];
  }
  if (cat.includes('tool')) {
    return [
      'Material type',
      'Design type',
      'Power source',
      'Colour name',
      'Size / Capacity',
      'Handle material',
      'Model name',
      'Product dimensions',
      'Weight',
      'Usage / Application',
    ];
  }
  return [
    'Material type',
    'Size / Rating',
    'Colour name',
    'Model name',
    'Standard / Grade',
    'Weight',
  ];
}

