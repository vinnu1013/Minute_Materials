import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

function formatCpvcSize(raw) {
  let s = (raw || '').replace(/\s+/g, ' ').trim();
  if (!s || s === '-' || s === '- -') return 'Standard';

  const ozMatch = s.match(/^(\d+(?:\.\d+)?\s*oz)\s+(\d+(?:\.\d+)?\s*ml)(?:\s+(Tin|Tube|Bottle))?$/i);
  if (ozMatch) {
    return `${ozMatch[1]} (${ozMatch[2]})${ozMatch[3] ? ' ' + ozMatch[3] : ''}`;
  }

  const reducerMatch = s.match(/^((?:(?:\d+\s+)?[¼½¾]|\d+(?:\.\d+)?)\s*x\s*(?:(?:\d+\s+)?[¼½¾]|\d+(?:\.\d+)?))\s+((?:\d+(?:\.\d+)?)\s*x\s*(?:\d+(?:\.\d+)?))$/i);
  if (reducerMatch) {
    return `${reducerMatch[1]}" (${reducerMatch[2]} cm)`;
  }

  const teeReducerMatch = s.match(/^((?:(?:\d+\s+)?[¼½¾]|\d+(?:\.\d+)?)\s*x\s*(?:(?:\d+\s+)?[¼½¾]|\d+(?:\.\d+)?)\s*x\s*(?:(?:\d+\s+)?[¼½¾]|\d+(?:\.\d+)?))\s+((?:\d+(?:\.\d+)?)\s*x\s*(?:\d+(?:\.\d+)?)\s*x\s*(?:\d+(?:\.\d+)?))$/i);
  if (teeReducerMatch) {
    return `${teeReducerMatch[1]}" (${teeReducerMatch[2]} cm)`;
  }

  const singleMatch = s.match(/^((?:\d+\s+)?[¼½¾]|\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
  if (singleMatch) {
    return `${singleMatch[1]}" (${singleMatch[2]} cm)`;
  }

  if (s.toLowerCase().includes('medium flow')) return 'Medium Flow';
  if (s.toLowerCase().includes('high flow')) return 'High Flow';
  if (s.toLowerCase().includes('shower')) return 'Shower';

  s = s.replace(/\s*-\s*$/, '').trim();
  return s;
}

async function run() {
  const buf = fs.readFileSync('public/assets/aistudio/CPVC_Pricelist_Ashirvad_3507e1bf.pdf');
  const parser = new PDFParse(new Uint8Array(buf));
  const textResult = await parser.getText();

  const hsnPattern = /(3917|3506|8308|8481|7307|7318|4016|8207|8204|9603)/;

  const products = [];
  const seenIds = new Set();

  for (let p = 0; p < 15; p++) {
    const metaLines = textResult.pages[p].text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const priceLines = textResult.pages[p + 15].text.trim().split('\n').map(l => l.trim()).filter(Boolean);

    for (let r = 0; r < metaLines.length; r++) {
      const m = metaLines[r];
      const pr = priceLines[r] || '';

      if (m.toLowerCase().includes('product name') && m.toLowerCase().includes('hsn code')) continue;

      const match = m.match(hsnPattern);
      if (!match) continue;

      const hsn = match[1];
      const hsnIdx = m.indexOf(hsn);
      let rawProdName = m.substring(0, hsnIdx).trim();
      const rem = m.substring(hsnIdx + hsn.length).trim();

      // Fix prefix for 3 in 1 Mixer Adaptor if omitted
      if (rawProdName.startsWith('Top and Side (7")') || rawProdName.startsWith('Hot Up and Cold Down (7")') || rawProdName.startsWith('Hot Side and Cold Down (7")')) {
        rawProdName = '3 in 1 Mixer Adaptor ' + rawProdName;
      }

      // Determine subcategory
      let subcategory = 'CPVC Pipes & Fittings';
      const lowerName = rawProdName.toLowerCase();
      if (lowerName.includes('solvent cement') || lowerName.includes('primer') || lowerName.includes('brush')) {
        subcategory = 'Solvent, Thread & Sealants';
      } else if (lowerName.includes('(brass)') || lowerName.includes('mabt') || lowerName.includes('fabt') || lowerName.includes('brass elbow') || lowerName.includes('brass tee') || lowerName.includes('brass mechanism')) {
        subcategory = 'Brass & GI Fittings';
      } else if (lowerName.includes('valve') || lowerName.includes('diverter') || lowerName.includes('mixer adaptor') || lowerName.includes('cartridge') || lowerName.includes('spindle')) {
        subcategory = 'Valves, Taps & Mixers';
      } else if (lowerName.includes('clamp') || lowerName.includes('washer') || lowerName.includes('gasket') || lowerName.includes('bolt') || lowerName.includes('knob') || lowerName.includes('screw') || lowerName.includes('front plate') || lowerName.includes('allen key') || lowerName.includes('buttons') || lowerName.includes('flange') || lowerName.includes('hex nut')) {
        subcategory = 'Clamps & Hardware';
      }

      const sevenDigitMatches = rem.match(/\b\d{7}\b/g) || [];

      // Dual SCH 40 & SCH 80 row handling
      if (rawProdName.includes('SCH 40 & 80') && sevenDigitMatches.length === 2) {
        const p40 = sevenDigitMatches[0];
        const p80 = sevenDigitMatches[1];

        const remBeforePart = rem.substring(0, rem.indexOf(p40)).trim();
        const tokens = remBeforePart.split(/\s+/).filter(Boolean);
        let sizeInch = '';
        let sizeCm = '';
        if (tokens.includes('x') && tokens.indexOf('x') < tokens.lastIndexOf('x')) {
          const firstX = tokens.indexOf('x');
          sizeInch = tokens.slice(0, firstX + 2).join(' ');
          sizeCm = tokens.slice(firstX + 2).join(' ');
        } else {
          sizeInch = tokens.slice(0, Math.ceil(tokens.length / 2)).join(' ');
          sizeCm = tokens.slice(Math.ceil(tokens.length / 2)).join(' ');
        }

        const pTokens = pr.split(/\s+/).filter(Boolean).filter(t => t !== '-');
        const numTokens = pTokens.map(t => parseFloat(t)).filter(n => !isNaN(n));
        const price40 = numTokens[0] || 0;
        const price80 = numTokens[1] || price40;
        const baseClean = rawProdName.replace('(SCH 40 & 80)', '').trim();

        if (price40 > 0 && p40 && !seenIds.has(`plm-${p40}`)) {
          seenIds.add(`plm-${p40}`);
          products.push({
            id: `plm-${p40}`,
            name: `${baseClean} (SCH 40) ${sizeInch}" (${sizeCm} cm)`,
            baseName: `${baseClean} (SCH 40)`,
            sizeLabel: `${sizeInch}" (${sizeCm} cm)`,
            category: 'plumbing',
            subcategory,
            price: price40,
            originalPrice: Math.round(price40 * 1.2),
            unit: 'piece',
            brand: 'Ashirvad',
            fastDelivery: true,
            stockStatus: 'in_stock',
            stockCount: 100,
            sku: `PLM-${p40}`,
            partCode: p40,
            hsnCode: hsn,
            description: '',
            image: '',
            images: [],
          });
        }

        if (price80 > 0 && p80 && !seenIds.has(`plm-${p80}`)) {
          seenIds.add(`plm-${p80}`);
          products.push({
            id: `plm-${p80}`,
            name: `${baseClean} (SCH 80) ${sizeInch}" (${sizeCm} cm)`,
            baseName: `${baseClean} (SCH 80)`,
            sizeLabel: `${sizeInch}" (${sizeCm} cm)`,
            category: 'plumbing',
            subcategory,
            price: price80,
            originalPrice: Math.round(price80 * 1.2),
            unit: 'piece',
            brand: 'Ashirvad',
            fastDelivery: true,
            stockStatus: 'in_stock',
            stockCount: 100,
            sku: `PLM-${p80}`,
            partCode: p80,
            hsnCode: hsn,
            description: '',
            image: '',
            images: [],
          });
        }
        continue;
      }

      // Standard single part row
      const partNo = sevenDigitMatches[0];
      if (!partNo) continue;

      let remBeforePart = rem;
      const partIdx = rem.indexOf(partNo);
      if (partIdx !== -1) {
        remBeforePart = rem.substring(0, partIdx).trim();
      }

      let price = 0;
      if (pr.includes('/mtr')) {
        const nums = pr.split(/\s+/).map(t => parseFloat(t)).filter(n => !isNaN(n));
        price = nums[nums.length - 1] || nums[0] || 0;
      } else {
        const tokens = pr.split(/\s+/).filter(Boolean).filter(t => t !== '-');
        const firstNum = parseFloat(tokens[0]);
        if (!isNaN(firstNum)) price = firstNum;
      }

      if (price <= 0 || isNaN(price)) continue;

      const id = `plm-${partNo}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const sizeLabel = formatCpvcSize(remBeforePart);
      const cleanBaseName = rawProdName.trim();
      const fullName = sizeLabel === 'Standard' ? cleanBaseName : `${cleanBaseName} ${sizeLabel}`;

      let unit = 'piece';
      if (lowerName.includes('solvent cement') || lowerName.includes('primer')) {
        unit = sizeLabel.toLowerCase().includes('tin') ? 'tin' : 'tube';
      } else if (lowerName.includes('pipes')) {
        unit = 'piece';
      }

      products.push({
        id,
        name: fullName,
        baseName: cleanBaseName,
        sizeLabel,
        category: 'plumbing',
        subcategory,
        price,
        originalPrice: Math.round(price * 1.2),
        unit,
        brand: 'Ashirvad',
        fastDelivery: true,
        stockStatus: 'in_stock',
        stockCount: 100,
        sku: `PLM-${partNo}`,
        partCode: partNo,
        hsnCode: hsn,
        description: '',
        image: '',
        images: [],
      });
    }
  }

  console.log(`Generated total of ${products.length} products!`);

  // Write to src/data/initialProducts.ts
  const tsContent = `import { Product, StoreSettings } from '../types';

export const CATALOG_VERSION = '2026-11-05-no-desc-no-images-v1';

export const INITIAL_PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: 'Minute Materials',
  helplineNumber: '8332869926',
  whatsappNumber: '8332869926',
  deliveryFeeExpress: 15.00,
  deliveryFeeStandard: 5.00,
  minOrderFreeDelivery: 499.00,
  platformFee: 5.00,
  handlingFee: 10.00,
  gstPercentage: 0,
  upiId: 'mr.vinnu10@okicici',
  accountHolderName: 'THappetla Vinay Kumar',
  activeDeliveryNotice: '🚚 FREE Express Delivery on Orders ₹499+ | Minute Materials LB Nagar & Vanasthalipuram | Call/WhatsApp: 8332869926',
  adminPin: '9059236500',
  depotLat: 17.343629,
  depotLng: 78.554161,
  depotAddress: 'Minute Materials Express Hub'
};
`;

  fs.writeFileSync('src/data/initialProducts.ts', tsContent, 'utf-8');
  console.log('Saved src/data/initialProducts.ts');

  // Write to data/products.json
  fs.writeFileSync('data/products.json', JSON.stringify(products, null, 2), 'utf-8');
  console.log('Saved data/products.json');

  // Clear data/.codeSyncState.json so dbManager re-syncs cleanly
  if (fs.existsSync('data/.codeSyncState.json')) {
    fs.unlinkSync('data/.codeSyncState.json');
    console.log('Removed data/.codeSyncState.json');
  }
}

run().catch(console.error);
