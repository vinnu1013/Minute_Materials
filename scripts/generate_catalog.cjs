const fs = require('fs');
const path = require('path');

// Verified patch map for the 58 industrial & spare items from Ashirvad CPVC 2018 Price List
const PATCH_MAP = {
  // Solvent Cement Brush
  '1810052': { price: 35, partCode: '1810052' },

  // SCH 80 6" Elbow, Tee, Coupler
  'Elbow 90° (SCH 80)::6 (15 cm)': { price: 6850, partCode: '2228204' },
  'Tee 90° (SCH 80)::6 (15 cm)': { price: 9125, partCode: '2228304' },
  'Coupler (SCH 80)::6 (15 cm)': { price: 3745, partCode: '2228104' },

  // End Cap SCH 40
  'End Cap (SCH 40)::2 ½ (6.5 cm)': { price: 204, partCode: '2228711' },
  'End Cap (SCH 40)::3 (8 cm)': { price: 301.5, partCode: '2228712' },
  'End Cap (SCH 40)::4 (10 cm)': { price: 522, partCode: '2228713' },
  'End Cap (SCH 40)::6 (15 cm)': { price: 1617.5, partCode: '2228714' },

  // End Cap SCH 80
  'End Cap (SCH 80)::2 ½ (6.5 cm)': { price: 351.5, partCode: '2228701' },
  'End Cap (SCH 80)::3 (8 cm)': { price: 517.5, partCode: '2228702' },
  'End Cap (SCH 80)::4 (10 cm)': { price: 899, partCode: '2228703' },
  'End Cap (SCH 80)::6 (15 cm)': { price: 2780, partCode: '2228704' },

  // Flange with Gasket - End Cap Open
  'Flange with Gasket - End Cap Open::2 ½ (6.5 cm)': { price: 842, partCode: '2228511' },
  'Flange with Gasket - End Cap Open::3 (8 cm)': { price: 1160, partCode: '2228512' },
  'Flange with Gasket - End Cap Open::4 (10 cm)': { price: 1685, partCode: '2228513' },
  'Flange with Gasket - End Cap Open::6 (15 cm)': { price: 3450, partCode: '2228514' },

  // Flange with Gasket - End Cap Closed
  'Flange with Gasket - End Cap Closed::2 ½ (6.5 cm)': { price: 920, partCode: '2228611' },
  'Flange with Gasket - End Cap Closed::3 (8 cm)': { price: 1280, partCode: '2228612' },
  'Flange with Gasket - End Cap Closed::4 (10 cm)': { price: 1850, partCode: '2228613' },
  'Flange with Gasket - End Cap Closed::6 (15 cm)': { price: 3780, partCode: '2228614' },

  // Rubber Gasket for Flange
  'Rubber Gasket for Flange::1 (2.5 cm)': { price: 24, partCode: '1190080' },
  'Rubber Gasket for Flange::1 ¼ (3.2 cm)': { price: 28, partCode: '1190081' },
  'Rubber Gasket for Flange::1 ½ (4 cm)': { price: 32, partCode: '1190082' },
  'Rubber Gasket for Flange::2 (5 cm)': { price: 40, partCode: '1190083' },
  'Rubber Gasket for Flange::2 ½ (6.5 cm)': { price: 58, partCode: '1190084' },
  'Rubber Gasket for Flange::3 (8 cm)': { price: 72, partCode: '1190085' },
  'Rubber Gasket for Flange::4 (10 cm)': { price: 96, partCode: '1190086' },
  'Rubber Gasket for Flange::6 (15 cm)': { price: 185, partCode: '1190087' },

  // Short Bend (SCH 40 & 80)
  'Short Bend (SCH 40 & 80)::2 ½ (6.5 cm)': { price: 540, partCode: '2227201' },
  'Short Bend (SCH 40 & 80)::3 (8 cm)': { price: 795, partCode: '2227202' },
  'Short Bend (SCH 40 & 80)::4 (10 cm)': { price: 1320, partCode: '2227203' },
  'Short Bend (SCH 40 & 80)::6 (15 cm)': { price: 3950, partCode: '2227204' },

  // Reducer Coupler (SCH 40 & 80)
  'Reducer Coupler (SCH 40 & 80)::2 ½ x ¾ (6.5 x 2.0 cm)': { price: 365, partCode: '2224622' },
  'Reducer Coupler (SCH 40 & 80)::2 ½ x 1 (6.5 x 2.5 cm)': { price: 365, partCode: '2224623' },
  'Reducer Coupler (SCH 40 & 80)::2 ½ x 1 ¼ (6.5 x 3.2 cm)': { price: 385, partCode: '2224624' },
  'Reducer Coupler (SCH 40 & 80)::2 ½ x 1 ½ (6.5 x 4.0 cm)': { price: 410, partCode: '2224625' },
  'Reducer Coupler (SCH 40 & 80)::2 ½ x 2 (6.5 x 5.0 cm)': { price: 435, partCode: '2224616' },
  'Reducer Coupler (SCH 40 & 80)::3 x 2 (8.0 x 5.0 cm)': { price: 580, partCode: '2224620' },
  'Reducer Coupler (SCH 40 & 80)::3 x 2 ½ (8.0 x 6.5 cm)': { price: 625, partCode: '2224617' },

  // Reducer Tee (SCH 40 & 80)
  'Reducer Tee (SCH 40 & 80)::2 ½ x ¾ (6.5 x 2.0 cm)': { price: 790, partCode: '2221922' },
  'Reducer Tee (SCH 40 & 80)::2 ½ x 1 (6.5 x 2.5 cm)': { price: 810, partCode: '2221923' },
  'Reducer Tee (SCH 40 & 80)::2 ½ x 1 ¼ (6.5 x 3.2 cm)': { price: 845, partCode: '2221924' },
  'Reducer Tee (SCH 40 & 80)::2 ½ x 1 ½ (6.5 x 4.0 cm)': { price: 885, partCode: '2221925' },
  'Reducer Tee (SCH 40 & 80)::2 ½ x 2 (6.5 x 5.0 cm)': { price: 945, partCode: '2224919' },
  'Reducer Tee (SCH 40 & 80)::3 x 2 (8.0 x 5.0 cm)': { price: 1290, partCode: '2224923' },
  'Reducer Tee (SCH 40 & 80)::3 x 2 ½ (8.0 x 6.5 cm)': { price: 1375, partCode: '2224920' },

  // FAPT (SCH 80)
  'Female Adapter Plastic Threaded - FAPT (SCH 80)::2 ½ (6.5 cm)': { price: 520, partCode: '2225407' },
  'Female Adapter Plastic Threaded - FAPT (SCH 80)::3 (8 cm)': { price: 745, partCode: '2225408' },
  'Female Adapter Plastic Threaded - FAPT (SCH 80)::4 (10 cm)': { price: 1180, partCode: '2225409' },

  // MAPT (SCH 80)
  'Male Adapter Plastic Threaded - MAPT (SCH 80)::2 ½ (6.5 cm)': { price: 480, partCode: '2225307' },
  'Male Adapter Plastic Threaded - MAPT (SCH 80)::3 (8 cm)': { price: 690, partCode: '2225308' },
  'Male Adapter Plastic Threaded - MAPT (SCH 80)::4 (10 cm)': { price: 1120, partCode: '2225309' },

  // Bushings (SCH 80)
  'Bushings (SCH 80)::2 ½ x 2 (CTS) (6.5 x 5.0 cm)': { price: 325, partCode: '2228411' },
  'Bushings (SCH 80)::3 x 2 (CTS) (8.0 x 5.0 cm)': { price: 460, partCode: '2228412' },
  'Bushings (SCH 80)::3 x 2 ½ (8.0 x 6.5 cm)': { price: 490, partCode: '2228413' },
  'Bushings (SCH 80)::4 x 2 (CTS) (10.0 x 5.0 cm)': { price: 680, partCode: '2228414' },
  'Bushings (SCH 80)::4 x 2 ½ (10.0 x 6.5 cm)': { price: 720, partCode: '2228415' },
  'Bushings (SCH 80)::4 x 3 (10.0 x 8.0 cm)': { price: 760, partCode: '2228416' },

  // Bushings (SCH 40)
  'Bushings (SCH 40)::6 x 2 (15.0 x 5.0 cm)': { price: 1450, partCode: '2228419' },
  'Bushings (SCH 40)::6 x 2 ½ (15.0 x 6.5 cm)': { price: 1520, partCode: '2228420' },
  'Bushings (SCH 40)::6 x 3 (15.0 x 8.0 cm)': { price: 1650, partCode: '2228417' },
  'Bushings (SCH 40)::6 x 4 (15.0 x 10.0 cm)': { price: 1780, partCode: '2228418' }
};

// 22 CPVC SDR 11 & SDR 13.5 Pipes from Page 24 of Ashirvad FlowGuard Plus Price List
const ADDITIONAL_CPVC_PIPES = [
  // SDR 11 - 3 mtr
  { name: 'CPVC Pipes (SDR 11 - 3 mtr)', hsn: '3917', inch: '½', cm: '1.5', part: '2125101', mrp: '76.00 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 3 mtr)', hsn: '3917', inch: '¾', cm: '2', part: '2125102', mrp: '118.50 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 3 mtr)', hsn: '3917', inch: '1', cm: '2.5', part: '2125103', mrp: '187.00 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 3 mtr)', hsn: '3917', inch: '1 ¼', cm: '3.2', part: '2125104', mrp: '285.50 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 3 mtr)', hsn: '3917', inch: '1 ½', cm: '4', part: '2125105', mrp: '399.00 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 3 mtr)', hsn: '3917', inch: '2', cm: '5', part: '2125106', mrp: '692.00 /mtr' },

  // SDR 11 - 5 mtr
  { name: 'CPVC Pipes (SDR 11 - 5 mtr)', hsn: '3917', inch: '½', cm: '1.5', part: '2125111', mrp: '76.00 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 5 mtr)', hsn: '3917', inch: '¾', cm: '2', part: '2125112', mrp: '118.50 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 5 mtr)', hsn: '3917', inch: '1', cm: '2.5', part: '2125113', mrp: '187.00 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 5 mtr)', hsn: '3917', inch: '1 ¼', cm: '3.2', part: '2125114', mrp: '285.50 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 5 mtr)', hsn: '3917', inch: '1 ½', cm: '4', part: '2125115', mrp: '399.00 /mtr' },
  { name: 'CPVC Pipes (SDR 11 - 5 mtr)', hsn: '3917', inch: '2', cm: '5', part: '2125116', mrp: '692.00 /mtr' },

  // SDR 13.5 - 3 mtr
  { name: 'CPVC Pipes (SDR 13.5 - 3 mtr)', hsn: '3917', inch: '¾', cm: '2', part: '2125202', mrp: '98.00 /mtr' },
  { name: 'CPVC Pipes (SDR 13.5 - 3 mtr)', hsn: '3917', inch: '1', cm: '2.5', part: '2125203', mrp: '151.00 /mtr' },
  { name: 'CPVC Pipes (SDR 13.5 - 3 mtr)', hsn: '3917', inch: '1 ¼', cm: '3.2', part: '2125204', mrp: '228.00 /mtr' },
  { name: 'CPVC Pipes (SDR 13.5 - 3 mtr)', hsn: '3917', inch: '1 ½', cm: '4', part: '2125205', mrp: '323.50 /mtr' },
  { name: 'CPVC Pipes (SDR 13.5 - 3 mtr)', hsn: '3917', inch: '2', cm: '5', part: '2125206', mrp: '549.50 /mtr' },

  // SDR 13.5 - 5 mtr
  { name: 'CPVC Pipes (SDR 13.5 - 5 mtr)', hsn: '3917', inch: '¾', cm: '2', part: '2125212', mrp: '98.00 /mtr' },
  { name: 'CPVC Pipes (SDR 13.5 - 5 mtr)', hsn: '3917', inch: '1', cm: '2.5', part: '2125213', mrp: '151.00 /mtr' },
  { name: 'CPVC Pipes (SDR 13.5 - 5 mtr)', hsn: '3917', inch: '1 ¼', cm: '3.2', part: '2125214', mrp: '228.00 /mtr' },
  { name: 'CPVC Pipes (SDR 13.5 - 5 mtr)', hsn: '3917', inch: '1 ½', cm: '4', part: '2125215', mrp: '323.50 /mtr' },
  { name: 'CPVC Pipes (SDR 13.5 - 5 mtr)', hsn: '3917', inch: '2', cm: '5', part: '2125216', mrp: '549.50 /mtr' },
];

function getSubcategory(baseName) {
  const lower = baseName.toLowerCase();
  if (lower.includes('pipe')) return 'CPVC Pipes';
  if (lower.includes('elbow') || lower.includes('bend')) return 'Elbows & Bends';
  if (lower.includes('tee') || lower.includes('coupler')) return 'Tees & Couplers';
  if (lower.includes('adapter') || lower.includes('union') || lower.includes('bushing') || lower.includes('nipple') || lower.includes('end cap') || lower.includes('mapt') || lower.includes('fapt') || lower.includes('mabt') || lower.includes('fabt')) {
    return 'Adapters, Unions & Nipples';
  }
  if (lower.includes('valve') || lower.includes('diverter') || lower.includes('cock') || lower.includes('spindle')) {
    return 'Valves & Diverters';
  }
  if (lower.includes('clamp') || lower.includes('flange') || lower.includes('washer') || lower.includes('gasket')) {
    return 'Clamps, Flanges & Washers';
  }
  if (lower.includes('solvent') || lower.includes('cement') || lower.includes('primer')) {
    return 'Solvent Cements';
  }
  return 'Spares & Accessories';
}

function getPlumbingImage(baseName) {
  const lower = baseName.toLowerCase();
  if (lower.includes('elbow') && !lower.includes('holder')) {
    return '/elbow_fitting.jpg';
  }
  return '';
}

// Read rawData from generate_plumbing.cjs
const genSource = fs.readFileSync(path.join(process.cwd(), 'generate_plumbing.cjs'), 'utf-8');
const rawDataMatch = genSource.match(/const rawData = `([\s\S]*?)`;/);
if (!rawDataMatch) {
  console.error('Could not find rawData in generate_plumbing.cjs');
  process.exit(1);
}

const rawLines = rawDataMatch[1].trim().split('\n').filter(Boolean);

// Combine rawLines with ADDITIONAL_CPVC_PIPES
const allRawItems = [];
for (const line of rawLines) {
  const parts = line.split('\t');
  if (parts.length >= 6) {
    allRawItems.push({
      productName: parts[0].trim(),
      hsnCode: parts[1].trim(),
      sizeInch: parts[2].trim(),
      sizeCm: parts[3].trim(),
      partNo: parts[4].trim(),
      rawMrp: parts[5].trim()
    });
  }
}

for (const p of ADDITIONAL_CPVC_PIPES) {
  allRawItems.push({
    productName: p.name,
    hsnCode: p.hsn,
    sizeInch: p.inch,
    sizeCm: p.cm,
    partNo: p.part,
    rawMrp: p.mrp
  });
}

console.log(`Total raw plumbing entries: ${allRawItems.length}`);

// Parse rows and apply patch map
const parsedRows = allRawItems.map((item) => {
  const { productName, hsnCode, sizeInch, sizeCm, partNo, rawMrp } = item;
  const baseName = productName;
  let rawSizeLabel = '';
  if (sizeInch && sizeInch !== '-' && sizeInch !== 'x') {
    if (sizeCm && sizeCm !== '-' && sizeCm !== 'x') {
      rawSizeLabel = `${sizeInch} (${sizeCm} cm)`;
    } else {
      rawSizeLabel = sizeInch;
    }
  } else if (sizeCm && sizeCm !== '-' && sizeCm !== 'x') {
    rawSizeLabel = `${sizeCm} cm`;
  }

  const formattedName = rawSizeLabel ? `${baseName} ${rawSizeLabel}` : baseName;
  const patchKey = `${baseName}::${rawSizeLabel}`;

  let finalPartNo = partNo;
  let finalMrp = rawMrp;

  if (PATCH_MAP[partNo]) {
    finalPartNo = PATCH_MAP[partNo].partCode;
    finalMrp = String(PATCH_MAP[partNo].price);
  } else if (PATCH_MAP[patchKey]) {
    finalPartNo = PATCH_MAP[patchKey].partCode;
    finalMrp = String(PATCH_MAP[patchKey].price);
  }

  return {
    baseName,
    rawSizeLabel,
    formattedName,
    hsnCode,
    partNo: finalPartNo,
    rawMrp: finalMrp
  };
});

// Count name frequencies for disambiguation if needed
const nameFreq = {};
const baseNameFreq = {};
for (const r of parsedRows) {
  nameFreq[r.formattedName] = (nameFreq[r.formattedName] || 0) + 1;
  baseNameFreq[r.baseName] = (baseNameFreq[r.baseName] || 0) + 1;
}

const popularPartCodes = new Set([
  '2225701', '2225702', // Elbow 90 ½, ¾
  '2226001', '2226002', // Tee ½, ¾
  '2224701', '2224702', // Coupler ½, ¾
  '2225201', '2225202', // MABT ½, ¾
  '2225101', '2225102', // FABT ½, ¾
  '2226101', '2226102', // Brass Elbow ½, ¾x½
  '2224771', '2224772', // Ball Valve ½, ¾
  '2223601', '2223602', // Tank Nipple ½, ¾
  '4081101', '4081102', // Solvent Cement 2 oz, 4 oz
  '2125101', '2125102', // CPVC Pipe SDR 11 ½, ¾ (3m)
  '2125111', '2125112'  // CPVC Pipe SDR 11 ½, ¾ (5m)
]);

const usedSkus = new Set();
const plumbingProducts = parsedRows.map((row, idx) => {
  const { baseName, hsnCode, partNo, rawMrp, rawSizeLabel, formattedName } = row;
  const validPart = partNo && partNo !== '-' && partNo !== 'x' ? partNo : undefined;

  let displayName = formattedName;
  if (nameFreq[formattedName] > 1 && validPart) {
    displayName = `${formattedName} (${validPart})`;
  }

  let sizeLabel = rawSizeLabel;
  if (nameFreq[formattedName] > 1 && validPart) {
    sizeLabel = rawSizeLabel ? `${rawSizeLabel} • #${validPart}` : `Part #${validPart}`;
  } else if (!sizeLabel && baseNameFreq[baseName] > 1 && validPart) {
    sizeLabel = `Part #${validPart}`;
  }

  const isPerMeter = /\/\s*mtr/i.test(rawMrp);
  const cleanedNum = String(rawMrp).replace(/\/\s*mtr/gi, '').replace(/[^0-9.]/g, '');
  let price = cleanedNum ? parseFloat(cleanedNum) : 0;
  if (isNaN(price)) price = 0;

  let sku = validPart ? `PLM-${validPart}` : `PLM-ITEM-${(idx + 1).toString().padStart(3, '0')}`;
  if (usedSkus.has(sku)) {
    sku = `${sku}-${idx + 1}`;
  }
  usedSkus.add(sku);

  // Ashirvad FlowGuard Plus description
  const description = `Genuine Ashirvad FlowGuard Plus CPVC ${baseName}${sizeLabel ? ` - ${sizeLabel}` : ''}. Manufactured from Lubrizol high-grade raw material, tested to SDR 11 / SDR 13.5 standards. Corrosion-proof, leak-free, suitable for both hot & cold water lines up to 93°C. Part Code: ${validPart || 'N/A'}, HSN: ${hsnCode || '3917'}.`;

  const originalPrice = Math.round(price * 1.15 * 10) / 10;

  return {
    id: `p-${(idx + 1).toString().padStart(3, '0')}`,
    name: displayName,
    baseName: baseName,
    sizeLabel: sizeLabel || undefined,
    category: 'plumbing',
    subcategory: getSubcategory(baseName),
    brand: 'Ashirvad',
    price: price,
    originalPrice: originalPrice > price ? originalPrice : undefined,
    unit: isPerMeter ? 'meter' : 'unit',
    stockStatus: 'in_stock',
    stockCount: 150,
    fastDelivery: true,
    sku: sku,
    hsnCode: hsnCode || '3917',
    partCode: validPart,
    description: description,
    image: getPlumbingImage(baseName),
    popular: Boolean(validPart && popularPartCodes.has(validPart)),
    rating: 4.8,
    reviewCount: 95
  };
});

// Non-plumbing items: Fans, Lights, Tools, Electrical from previous requests
const otherProducts = [
  // FANS
  {
    id: 'fan-01',
    name: 'Longway Starlite-1 P1 Ceiling Fan, 1200mm/48 inch, Anti-Dust Decorative Star Rated - Grey',
    baseName: 'Longway Starlite-1 P1 Ceiling Fan',
    sizeLabel: '1200mm / 48 inch (Grey)',
    category: 'fans',
    subcategory: 'Ceiling Fans',
    brand: 'Longway',
    price: 1249,
    originalPrice: 2881,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 42,
    fastDelivery: true,
    sku: 'FAN-LONG-STAR1-GRY',
    hsnCode: '84145120',
    partCode: 'STARLITE-1-GRY',
    description: 'Longway Starlite-1 P1 Ceiling Fan | 120 cm | 50W | Anti-Dust Decorative | Star Rated | Silver Blue / Grey. High speed 400 RPM with 100% CNC copper wound motor for heavy air delivery.',
    image: '',
    popular: true,
    rating: 4.1,
    reviewCount: 716,
    warranty: '2 year Brand Warranty',
    warrantyDetails: '2 Years Manufacturer On-Site Warranty. Covers motor and manufacturing defects.',
    whatsInTheBox: '1 x Ceiling Fan Motor, 3 x Anti-Dust Aerodynamic Blades, 1 x Down Rod, 1 x Canopy Set, 1 x Shackle Assembly, Instruction Manual & Warranty Card',
    vendorDetails: 'Longway Home Appliances India Pvt. Ltd. Customer Care: 1800-833-2869',
    keyHighlights: {
      'No of Blades': '3',
      'Design Type': 'Solid Anti-Dust Metallic Finish',
      'Power Source': 'Electric Powered',
      'Colour Name': 'Grey / Silver Blue',
      'Warranty': '2 Year',
      'Sweep Size': '1200 mm (48 inch)',
      'Wattage': '50 W',
      'Speed Settings': '5 Speed Control'
    },
    specifications: {
      'Brand': 'Longway',
      'Model Name': 'Starlite-1 P1',
      'Blade Material': 'Sheet Metal Anti-Dust',
      'Air Delivery': '210 CMM',
      'RPM': '400 RPM',
      'Voltage': '230 V AC, 50 Hz',
      'Weight': '4.0 kg',
      'Dimensions': '28 x 54 x 16 cm'
    }
  },
  {
    id: 'fan-02',
    name: 'Longway Kiger P1 Ceiling Fan, 600mm/24 inch, Ultra High Speed, 4 Blade Anti-Dust Decorative Star Rated - Smoked Brown',
    baseName: 'Longway Kiger P1 Ceiling Fan',
    sizeLabel: '600mm / 24 inch (Smoked Brown)',
    category: 'fans',
    subcategory: 'Ceiling Fans',
    brand: 'Longway',
    price: 1099,
    originalPrice: 2341,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 28,
    fastDelivery: true,
    sku: 'FAN-LONG-KIGER-BRN',
    hsnCode: '84145120',
    partCode: 'KIGER-P1-BRN',
    description: 'Longway Kiger P1 Ceiling Fan | 600 mm | 50W | 24 Inch | Ultra High Speed 850 RPM | 4 Blade | Anti-Dust Decorative | Star Rated | Smoked Brown.',
    image: '',
    popular: true,
    rating: 4.1,
    reviewCount: 921,
    warranty: '2 year Brand Warranty'
  },
  {
    id: 'fan-03',
    name: 'Portronics Aero Breeze BLDC Rechargeable 178mm USB Portable Fan | 3 Speed mode | 4Hr Battery | White',
    baseName: 'Portronics Aero Breeze USB Portable Fan',
    sizeLabel: '178mm (White)',
    category: 'fans',
    subcategory: 'Portable Fans',
    brand: 'Portronics',
    price: 999,
    originalPrice: 3999,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 35,
    fastDelivery: true,
    sku: 'FAN-PORT-AERO-WHT',
    hsnCode: '84145190',
    partCode: 'POR-AERO-178',
    description: 'Portronics Aero Breeze USB Portable Fan | 178 mm | BLDC | Rechargeable 2000 mAh | 3W | 3 Speed | 4 hours Battery | Ultra Quiet Desk / Site Fan.',
    image: '',
    popular: true,
    rating: 4.0,
    reviewCount: 982,
    warranty: '1 year Manufacturer Warranty'
  },
  {
    id: 'fan-04',
    name: 'Dubstep 5Watt Flo-F1 Mini Handheld USB Rechargeable Desk Cooling Fan with 3x Speed Mode, Foldable Hook & Stand - Blue',
    baseName: 'Dubstep Flo-F1 Mini Portable Fan',
    sizeLabel: 'Mini Handheld (Blue)',
    category: 'fans',
    subcategory: 'Portable Fans',
    brand: 'Dubstep',
    price: 499,
    originalPrice: 1249,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 60,
    fastDelivery: true,
    sku: 'FAN-DUB-FLOF1-BLU',
    hsnCode: '84145190',
    partCode: 'DUB-FLO-F1',
    description: 'Dubstep Flo-F1 Mini Handheld USB Rechargeable Desk Cooling Fan | 5W | 8000 RPM | 3 Speed Mode | Foldable Hook & Stand | Lightweight & Quiet.',
    image: '',
    popular: false,
    rating: 4.0,
    reviewCount: 312,
    warranty: '6 months Replacement Warranty'
  },
  {
    id: 'fan-05',
    name: 'Polycab Nippy Ceiling Fan, 1200mm, Star Rated, 100% Copper, Corrosion Resistant G-Tech Blades - Matt Blue',
    baseName: 'Polycab Nippy Ceiling Fan',
    sizeLabel: '1200mm (Matt Blue)',
    category: 'fans',
    subcategory: 'Ceiling Fans',
    brand: 'Polycab',
    price: 1599,
    originalPrice: 2899,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 20,
    fastDelivery: true,
    sku: 'FAN-POLY-NIPPY-BLU',
    hsnCode: '84145120',
    partCode: 'POLY-NIP-1200',
    description: 'Polycab Nippy Ceiling Fan | 120 cm | 52W | Star Rated | 100% Copper | Corrosion Resistant G-Tech Blades | Matt Blue finish.',
    image: '',
    popular: true,
    rating: 4.4,
    reviewCount: 43,
    warranty: '2 year Brand Warranty'
  },
  {
    id: 'fan-06',
    name: 'Ivas Zyva Pro Ceiling Fan, 1200mm, 400 RPM, Star Rated - White',
    baseName: 'Ivas Zyva Pro Ceiling Fan',
    sizeLabel: '1200mm (White)',
    category: 'fans',
    subcategory: 'Ceiling Fans',
    brand: 'Ivas',
    price: 1399,
    originalPrice: 3999,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 22,
    fastDelivery: true,
    sku: 'FAN-IVAS-ZYVA-WHT',
    hsnCode: '84145120',
    partCode: 'IVAS-ZYVA-1200',
    description: 'Ivas Zyva Pro Ceiling Fan | 1200 mm | 52W | 3 Speed Settings | 400 RPM | Star Rated Energy Saver | White gloss.',
    image: '',
    popular: false,
    rating: 4.0,
    reviewCount: 23,
    warranty: '2 year Brand Warranty'
  },
  {
    id: 'fan-07',
    name: 'Usha Crisp Air Vx Exhaust Fan, 200mm, 1380 RPM, White',
    baseName: 'Usha Crisp Air Vx Exhaust Fan',
    sizeLabel: '200mm (White)',
    category: 'fans',
    subcategory: 'Exhaust Fans',
    brand: 'Usha',
    price: 1449,
    originalPrice: 2290,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 30,
    fastDelivery: true,
    sku: 'FAN-USHA-CRISP-200',
    hsnCode: '84145130',
    partCode: 'USHA-CRISP-VX-200',
    description: 'Usha Crisp Air Vx 200mm Exhaust Fan. High suction, rust-free ABS body with automatic back shutters to prevent bird / insect entry. Ideal for kitchens & bathrooms.',
    image: '',
    popular: true,
    rating: 4.3,
    reviewCount: 184,
    warranty: '2 year Brand Warranty'
  },

  // LIGHTS
  {
    id: 'lit-01',
    name: 'Havells Adore 9W B22 LED Bulb (Cool Day White 6500K)',
    baseName: 'Havells Adore LED Bulb',
    sizeLabel: '9 Watt (Cool Day White)',
    category: 'lights',
    subcategory: 'Bulbs',
    brand: 'Havells',
    price: 110,
    originalPrice: 180,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 150,
    fastDelivery: true,
    sku: 'LIT-HAV-9W-B22',
    hsnCode: '85395000',
    partCode: 'HAV-BLB-9W-CDW',
    description: 'Havells Adore 9 Watt B22 base LED bulb. Glare-free 900 lumens illumination with 2.5kV surge protection and up to 25,000 burning hours.',
    image: '',
    popular: true,
    rating: 4.6,
    reviewCount: 420,
    warranty: '1 year Replacement Guarantee'
  },
  {
    id: 'lit-02',
    name: 'Philips 20W LED Batten Tube Light (4 Feet / 120cm Cool White)',
    baseName: 'Philips LED Batten Tube Light',
    sizeLabel: '20 Watt / 4 Feet',
    category: 'lights',
    subcategory: 'Tube Lights',
    brand: 'Philips',
    price: 280,
    originalPrice: 420,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 80,
    fastDelivery: true,
    sku: 'LIT-PHI-20W-BAT',
    hsnCode: '94054090',
    partCode: 'PHI-BAT-20W-120',
    description: 'Philips 20 Watt LED Batten. Slim, glare-free, uniform light spread for living rooms, kitchens, and office corridors. High power factor > 0.9.',
    image: '',
    popular: true,
    rating: 4.7,
    reviewCount: 310,
    warranty: '2 year Brand Warranty'
  },
  {
    id: 'lit-03',
    name: 'Wipro Garnet 12W Color Changing Smart LED Bulb (B22 WiFi & Bluetooth)',
    baseName: 'Wipro Garnet Smart LED Bulb',
    sizeLabel: '12 Watt (RGB + White)',
    category: 'lights',
    subcategory: 'Bulbs',
    brand: 'Wipro',
    price: 380,
    originalPrice: 699,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 45,
    fastDelivery: true,
    sku: 'LIT-WIP-12W-SMR',
    hsnCode: '85395000',
    partCode: 'WIP-GAR-12W-RGB',
    description: 'Wipro Garnet 12W Smart LED bulb. 16 million colors, dimmable white shades (2700K to 6500K), app control & voice assistant compatible.',
    image: '',
    popular: false,
    rating: 4.3,
    reviewCount: 245,
    warranty: '1 year Brand Warranty'
  },
  {
    id: 'lit-04',
    name: 'Syska 7W Warm White LED Bed & Night Light (Golden Glow 3000K)',
    baseName: 'Syska Warm LED Bed Light',
    sizeLabel: '7 Watt (Warm White 3000K)',
    category: 'lights',
    subcategory: 'Bed Lights',
    brand: 'Syska',
    price: 199,
    originalPrice: 350,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 65,
    fastDelivery: true,
    sku: 'LIT-SYS-7W-BED',
    hsnCode: '85395000',
    partCode: 'SYS-BED-7W-WW',
    description: 'Syska 7 Watt Warm White cosy bedroom and bedside night lighting. Soft eye-comfort illumination without flicker.',
    image: '',
    popular: false,
    rating: 4.5,
    reviewCount: 160,
    warranty: '1 year Brand Warranty'
  },
  {
    id: 'lit-05',
    name: 'Havells Glitz 15W Architectural Decorative COB Spotlight (Warm White 3000K)',
    baseName: 'Havells Glitz Decorative Spotlight',
    sizeLabel: '15 Watt (Warm White)',
    category: 'lights',
    subcategory: 'Decorative Lights',
    brand: 'Havells',
    price: 650,
    originalPrice: 999,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 38,
    fastDelivery: true,
    sku: 'LIT-HAV-15W-GLZ',
    hsnCode: '94054090',
    partCode: 'HAV-GLZ-15W-COB',
    description: 'Havells Glitz 15 Watt recessed architectural COB spotlight with tiltable swivel gimbal. Accents false ceilings, artwork, and premium wall features.',
    image: '',
    popular: false,
    rating: 4.6,
    reviewCount: 88,
    warranty: '2 year Brand Warranty'
  },

  // TOOLS
  {
    id: 'tol-01',
    name: 'Taparia 12-inch Heavy Duty Pipe Wrench (Drop Forged Steel)',
    baseName: 'Taparia Heavy Duty Pipe Wrench',
    sizeLabel: '12 inch / 300mm',
    category: 'tools',
    subcategory: 'Plumbing Wrenches & Cutters',
    brand: 'Taparia',
    price: 420,
    originalPrice: 550,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 40,
    fastDelivery: true,
    sku: 'TOL-TAP-12PW',
    hsnCode: '82041200',
    partCode: 'TAP-PW-12',
    description: 'Taparia 12 inch (300mm) Heavy Duty Stillson pipe wrench. Differential hardened teeth for positive non-slip grip on galvanized & PVC pipes.',
    image: '',
    popular: true,
    rating: 4.8,
    reviewCount: 310,
    warranty: 'Lifetime Warranty against manufacturing defects'
  },
  {
    id: 'tol-02',
    name: 'Stanley Ratchet PVC Pipe Cutter 42mm (Quick Blade Release)',
    baseName: 'Stanley Ratchet PVC Pipe Cutter',
    sizeLabel: 'Up to 42mm OD',
    category: 'tools',
    subcategory: 'Plumbing Wrenches & Cutters',
    brand: 'Stanley',
    price: 680,
    originalPrice: 950,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 25,
    fastDelivery: true,
    sku: 'TOL-STA-42CUT',
    hsnCode: '82034000',
    partCode: 'STA-CUT-42PVC',
    description: 'Stanley 42mm ratchet action pipe cutter for CPVC, UPVC, PEX, and conduit pipes. High-carbon hardened steel blade gives clean burr-free cuts.',
    image: '',
    popular: true,
    rating: 4.7,
    reviewCount: 195,
    warranty: '1 year Brand Warranty'
  },
  {
    id: 'tol-03',
    name: 'Taparia 8-inch Combination Insulated Plier (1000V Certified)',
    baseName: 'Taparia Insulated Plier',
    sizeLabel: '8 inch / 200mm',
    category: 'tools',
    subcategory: 'Electrical Testers & Pliers',
    brand: 'Taparia',
    price: 260,
    originalPrice: 340,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 65,
    fastDelivery: true,
    sku: 'TOL-TAP-8PLR',
    hsnCode: '82032000',
    partCode: 'TAP-PLR-8INS',
    description: 'Taparia 8 inch insulated combination plier. Tested to 1000V for electrician safety. High-grade chrome vanadium steel with wire cutter notch.',
    image: '',
    popular: true,
    rating: 4.9,
    reviewCount: 540,
    warranty: 'Lifetime Warranty against manufacturing defects'
  },
  {
    id: 'tol-04',
    name: 'Bosch GSB 500W Impact Drill Kit with 10mm Chuck & Accessories',
    baseName: 'Bosch Impact Drill Kit',
    sizeLabel: '500 Watt / 10mm',
    category: 'tools',
    subcategory: 'Power Drills & Blades',
    brand: 'Bosch',
    price: 3299,
    originalPrice: 4890,
    unit: 'set',
    stockStatus: 'in_stock',
    stockCount: 15,
    fastDelivery: true,
    sku: 'TOL-BOS-GSB500',
    hsnCode: '84672100',
    partCode: 'BOS-GSB-500W',
    description: 'Bosch GSB 500W professional impact drill with forward/reverse, variable speed trigger, masonry bits, wall plugs, and sturdy carry case.',
    image: '',
    popular: false,
    rating: 4.6,
    reviewCount: 280,
    warranty: '1 year Manufacturer Warranty'
  },
  {
    id: 'tol-05',
    name: 'Stanley 5M Steel Measuring Tape with Auto-Lock (Class II Metric & Inch)',
    baseName: 'Stanley Steel Measuring Tape',
    sizeLabel: '5 Meter / 16 Feet',
    category: 'tools',
    subcategory: 'Measuring & Safety Gear',
    brand: 'Stanley',
    price: 190,
    originalPrice: 270,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 90,
    fastDelivery: true,
    sku: 'TOL-STA-5MTAPE',
    hsnCode: '90178010',
    partCode: 'STA-TP-5M-AL',
    description: 'Stanley 5M auto-lock steel tape measure. Polymer-coated blade for durability with true-zero hook for internal and external jobsite measurements.',
    image: '',
    popular: true,
    rating: 4.8,
    reviewCount: 410,
    warranty: '6 months Warranty'
  },

  // ELECTRICAL
  {
    id: 'ele-01',
    name: '1.5 sq mm FR PVC Copper Wire (90M Roll Red)',
    baseName: 'Finolex FR PVC Copper Wire',
    sizeLabel: '1.5 sq mm (90M Red)',
    category: 'electrical',
    subcategory: 'House Wires & Cables',
    brand: 'Finolex',
    price: 1500,
    originalPrice: 1800,
    unit: 'roll',
    stockStatus: 'in_stock',
    stockCount: 50,
    fastDelivery: true,
    sku: 'ELE-WIR-15SQ-RED',
    hsnCode: '85444999',
    partCode: 'WIR-CU-15FR-90M-R',
    description: '1.5 sq mm flame-retardant (FR) multi-strand copper house wiring cable (90m coil). Electrolytic copper with 99.97% purity.',
    image: '',
    popular: true,
    rating: 4.7,
    reviewCount: 320
  },
  {
    id: 'ele-02',
    name: '2.5 sq mm FR PVC Copper Wire (90M Roll Blue)',
    baseName: 'Finolex FR PVC Copper Wire',
    sizeLabel: '2.5 sq mm (90M Blue)',
    category: 'electrical',
    subcategory: 'House Wires & Cables',
    brand: 'Finolex',
    price: 2450,
    originalPrice: 2950,
    unit: 'roll',
    stockStatus: 'in_stock',
    stockCount: 40,
    fastDelivery: true,
    sku: 'ELE-WIR-25SQ-BLU',
    hsnCode: '85444999',
    partCode: 'WIR-CU-25FR-90M-B',
    description: '2.5 sq mm flame-retardant (FR) copper wire for 16A power outlets, geysers, and AC circuits.',
    image: '',
    popular: true,
    rating: 4.8,
    reviewCount: 280
  },
  {
    id: 'ele-03',
    name: '20 Amp Single-Pole MCB Circuit Breaker (C-Curve 10kA)',
    baseName: 'Schneider Acti9 MCB Breaker',
    sizeLabel: '20A SP (C-Curve)',
    category: 'electrical',
    subcategory: 'MCB, RCCB & Distribution Boards',
    brand: 'Schneider',
    price: 222,
    originalPrice: 266.4,
    unit: 'unit',
    stockStatus: 'in_stock',
    stockCount: 180,
    fastDelivery: true,
    sku: 'ELE-MCB-1P-20A',
    hsnCode: '85362090',
    partCode: 'BRK-MCB-1P20A-C',
    description: '20A C-curve single pole miniature circuit breaker. 10kA short circuit breaking capacity, bi-connect terminals.',
    image: '',
    popular: false,
    rating: 4.8,
    reviewCount: 95
  },
  {
    id: 'ele-04',
    name: '16A Modular Switch & 3-Pin Socket Combo with Indicator Box',
    baseName: 'Legrand Arteor Modular Combo',
    sizeLabel: '16A Switch + Socket Set',
    category: 'electrical',
    subcategory: 'Modular Switches & Sockets',
    brand: 'Legrand',
    price: 288,
    originalPrice: 345.6,
    unit: 'set',
    stockStatus: 'in_stock',
    stockCount: 95,
    fastDelivery: true,
    sku: 'ELE-MOD-16A-CMB',
    hsnCode: '85366990',
    partCode: 'SWI-SOC-16A-MOD',
    description: '16A heavy power modular switch with 3-pin shuttered socket combo, neon power indicator, and polycarbonate faceplate.',
    image: '',
    popular: true,
    rating: 4.6,
    reviewCount: 150
  }
];

const allProducts = [...plumbingProducts, ...otherProducts];

// Validate zero prices
const zeroPrices = allProducts.filter(p => p.price <= 0);
console.log(`Validation: Total ${allProducts.length} items (${plumbingProducts.length} plumbing, ${otherProducts.length} other categories).`);
console.log(`Zero price items count: ${zeroPrices.length}`);

if (zeroPrices.length > 0) {
  console.error('ERROR: Zero price items found:', zeroPrices);
  process.exit(1);
}

const CATALOG_VERSION = '2026-11-ashirvad-plumbing-v1';

const tsOutput = `import { Product, StoreSettings } from '../types';

export const CATALOG_VERSION = '${CATALOG_VERSION}';

export const INITIAL_PRODUCTS: Product[] = ${JSON.stringify(allProducts, null, 2)};

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
  activeDeliveryNotice: '⚠️ Minute Materials - Express Jobsite Delivery | Book via WhatsApp or Phone: 8332869926',
  adminPin: '9059236500',
  depotLat: 17.343629,
  depotLng: 78.554161,
  depotAddress: 'Minute Materials Express Hub, LB Nagar - Vanasthalipuram'
};
`;

const targetTsPath = path.join(process.cwd(), 'src/data/initialProducts.ts');
fs.writeFileSync(targetTsPath, tsOutput, 'utf-8');

const dataJsonPath = path.join(process.cwd(), 'data/products.json');
fs.mkdirSync(path.dirname(dataJsonPath), { recursive: true });
fs.writeFileSync(dataJsonPath, JSON.stringify(allProducts, null, 2), 'utf-8');

// Also remove .codeSyncState.json if present so server restarts with clean state
const syncStatePath = path.join(process.cwd(), 'data/.codeSyncState.json');
if (fs.existsSync(syncStatePath)) {
  fs.unlinkSync(syncStatePath);
  console.log('Removed data/.codeSyncState.json for clean reload.');
}

console.log('Successfully wrote INITIAL_PRODUCTS and data/products.json!');
