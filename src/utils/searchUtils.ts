import { Product } from '../types';

/**
 * Common plumbing & electrical typo corrections for instant auto-correct.
 */
const COMMON_TYPO_MAP: Record<string, string> = {
  swich: 'switch',
  swiches: 'switches',
  switche: 'switch',
  soket: 'socket',
  sokets: 'sockets',
  sockt: 'socket',
  elbo: 'elbow',
  elboe: 'elbow',
  elbw: 'elbow',
  wyer: 'wire',
  wyr: 'wire',
  cabl: 'cable',
  cabel: 'cable',
  ashirwad: 'ashirvad',
  asirvad: 'ashirvad',
  ashirvd: 'ashirvad',
  ankor: 'anchor',
  anchr: 'anchor',
  panasonik: 'panasonic',
  panasonc: 'panasonic',
  sera: 'cera',
  ceera: 'cera',
  basen: 'basin',
  bassin: 'basin',
  fauset: 'faucet',
  faucit: 'faucet',
  fosit: 'faucet',
  regultor: 'regulator',
  regulater: 'regulator',
  dimer: 'dimmer',
  plait: 'plate',
  plet: 'plate',
  pype: 'pipe',
  pip: 'pipe',
  valv: 'valve',
  valb: 'valve',
  couplr: 'coupler',
  cupler: 'coupler',
  adopter: 'adaptor',
  adpter: 'adaptor',
  reduser: 'reducer',
  redcer: 'reducer',
  flange: 'flange',
  unoin: 'union',
  bushing: 'bush',
  solvant: 'solvent',
  ciment: 'cement',
  teflon: 'ptfe',
  commode: 'closet',
  comode: 'closet',
  toliet: 'closet',
  toilet: 'closet',
  shwer: 'shower',
  showr: 'shower',
  diverter: 'diverter',
  divertor: 'diverter',
  conceld: 'concealed',
  consild: 'concealed',
  mcb: 'mcb',
  rccb: 'rccb',
};

/**
 * Bounded Levenshtein distance (returns maxDist + 1 early if exceeded).
 */
export function levenshteinBounded(a: string, b: string, maxDist: number): number {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;
  if (Math.abs(alen - blen) > maxDist) return maxDist + 1;

  let prev = new Array<number>(blen + 1);
  let curr = new Array<number>(blen + 1);
  for (let j = 0; j <= blen; j++) prev[j] = j;

  for (let i = 1; i <= alen; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= blen; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const val = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr[j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[blen];
}

export function normalizeQueryToken(token: string): string {
  const clean = token.toLowerCase().replace(/[^a-z0-9./-]/g, '');
  return COMMON_TYPO_MAP[clean] || clean;
}

export interface SearchableProductIndex {
  product: Product;
  fullText: string;
  nameLower: string;
  brandLower: string;
  skuLower: string;
  tokens: string[];
}

export function buildSearchIndex(products: Product[]): SearchableProductIndex[] {
  return products.map((product) => {
    const nameLower = (product.name || '').toLowerCase();
    const baseLower = (product.baseName || '').toLowerCase();
    const brandLower = (product.brand || '').toLowerCase();
    const sizeLower = (product.sizeLabel || '').toLowerCase();
    const skuLower = (product.sku || '').toLowerCase();
    const partLower = (product.partCode || '').toLowerCase();
    const subLower = (product.subcategory || '').toLowerCase();
    const catLower = (product.category || '').toLowerCase();
    const descLower = (product.description || '').toLowerCase();

    const fullText = `${nameLower} ${baseLower} ${brandLower} ${sizeLower} ${skuLower} ${partLower} ${subLower} ${catLower} ${descLower}`;
    const rawTokens = fullText.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
    const tokens = Array.from(new Set(rawTokens));

    return {
      product,
      fullText,
      nameLower,
      brandLower,
      skuLower,
      tokens,
    };
  });
}

/**
 * Scores how well an indexed product matches a search query.
 * - Returns > 0 if matched, 0 if not matched.
 * - Supports 3-letter prefix matching (e.g. "elb", "swi", "cpv", "wir", "anc").
 * - Supports typo auto-correct & fuzzy Levenshtein matching.
 */
export function scoreProductMatch(entry: SearchableProductIndex, rawQuery: string): number {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) return 1;

  // Fast exact substring checks first
  if (entry.skuLower === trimmed) return 1000;
  if (entry.nameLower.startsWith(trimmed)) return 500;
  if (entry.brandLower.startsWith(trimmed)) return 420;
  if (entry.fullText.includes(trimmed)) return 300;

  // Tokenize & apply common typo corrections
  const queryTokens = trimmed
    .split(/\s+/)
    .map((t) => normalizeQueryToken(t))
    .filter(Boolean);

  if (queryTokens.length === 0) return 1;

  let totalScore = 0;

  for (const qt of queryTokens) {
    let tokenBest = 0;

    // 1. Direct substring match on fullText
    if (entry.fullText.includes(qt)) {
      tokenBest = Math.max(tokenBest, 180);
    }

    // 2. Prefix match (especially responsive from the first 3 letters typed)
    if (tokenBest < 220) {
      const prefixLen = qt.length >= 3 ? qt.length : qt.length;
      for (const pt of entry.tokens) {
        if (pt.startsWith(qt)) {
          tokenBest = Math.max(tokenBest, 220);
          break;
        }
        // First 3 letters prefix match when user typed >= 3 chars
        if (prefixLen >= 3 && pt.length >= 3 && pt.slice(0, 3) === qt.slice(0, 3)) {
          // Check fuzzy similarity on the rest if query is longer than 3 chars
          if (qt.length === 3) {
            tokenBest = Math.max(tokenBest, 200);
            break;
          } else {
            const maxD = qt.length <= 5 ? 1 : 2;
            const d = levenshteinBounded(qt, pt, maxD);
            if (d <= maxD) {
              tokenBest = Math.max(tokenBest, 150 - d * 25);
            }
          }
        }
      }
    }

    // 3. Full fuzzy Levenshtein match for spelling mistakes (4+ char tokens)
    if (tokenBest === 0 && qt.length >= 4) {
      const maxDist = qt.length <= 5 ? 1 : 2;
      for (const pt of entry.tokens) {
        if (Math.abs(pt.length - qt.length) > maxDist) continue;
        const d = levenshteinBounded(qt, pt, maxDist);
        if (d <= maxDist) {
          tokenBest = Math.max(tokenBest, 120 - d * 30);
          if (d === 1) break;
        }
      }
    }

    if (tokenBest === 0) return 0; // All query tokens must match (exact, prefix, or fuzzy)
    totalScore += tokenBest;
  }

  return totalScore;
}

/**
 * Returns a human-friendly auto-corrected query string if any token was corrected.
 */
export function getCorrectedQuery(rawQuery: string): string | null {
  const words = rawQuery.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  let changed = false;
  const corrected = words.map((w) => {
    const low = w.toLowerCase();
    const mapped = COMMON_TYPO_MAP[low];
    if (mapped && mapped !== low) {
      changed = true;
      return mapped;
    }
    return w;
  });
  return changed ? corrected.join(' ') : null;
}

/**
 * Finds the best matching catalog product for an item scanned from an uploaded material list image.
 */
export function findBestCatalogMatch(
  itemName: string,
  sizeText: string | undefined,
  products: Product[]
): Product | null {
  if (!products.length || !itemName.trim()) return null;

  const queryWithSize = `${itemName} ${sizeText || ''}`.trim();
  const index = buildSearchIndex(products);

  let bestProduct: Product | null = null;
  let bestScore = 0;

  // Try full item + size first, then item name alone
  for (const entry of index) {
    let score = scoreProductMatch(entry, queryWithSize);
    if (score === 0) {
      score = scoreProductMatch(entry, itemName) * 0.75;
    }
    // Bonus if size matches
    if (score > 0 && sizeText && entry.fullText.includes(sizeText.toLowerCase())) {
      score += 80;
    }
    if (score > bestScore) {
      bestScore = score;
      bestProduct = entry.product;
    }
  }

  return bestScore >= 90 ? bestProduct : null;
}
