import { Product } from '../../types';

const f = (
  idSuffix: string,
  name: string,
  baseName: string,
  sizeLabel: string,
  price: number,
  colour: string,
  dimensions: string,
  partCode?: string,
  image: string = '',
  images: string[] = []
): Product => {
  const gallery = images.length > 0 ? images : image ? [image] : [];
  return {
    id: `cera-${idSuffix}`,
    name,
    baseName,
    sizeLabel,
    category: 'plumbing',
    subcategory: 'Sanitaryware',
    price,
    unit: 'piece',
    brand: 'Cera',
    fastDelivery: true,
    stockStatus: 'in_stock',
    stockCount: 50,
    sku: `CERA-${idSuffix.toUpperCase().replace(/[^A-Z0-9-]/g, '')}`,
    partCode,
    hsnCode: '8481',
    description: '',
    image: image || gallery[0] || '',
    images: gallery,
    specifications: {
      ...(colour && colour !== '-' ? { 'Colour / Finish': colour } : {}),
      ...(dimensions && dimensions !== '-' ? { Dimensions: dimensions } : {}),
    },
  };
};

export const CERA_FAUCETS_PRODUCTS: Product[] = [
  // Cera F-Series Faucets & Allied Fittings from Cera Catalog
  f(
    'f8050351fg',
    'Waste Coupling with Pop-up Push Type - French Gold',
    'Waste Coupling with Pop-up Push Type',
    'French Gold',
    1680,
    'French Gold',
    '-',
    'F8050351FG',
    'https://cdn.shopify.com/s/files/1/0486/4137/6411/files/F8050351FG.png'
  ),
  f(
    'f8050351rg',
    'Waste Coupling with Pop-up Push Type - Rose Gold',
    'Waste Coupling with Pop-up Push Type',
    'Rose Gold',
    1680,
    'Rose Gold',
    '-',
    'F8050351RG',
    'https://cdn.shopify.com/s/files/1/0486/4137/6411/files/F8050351RG.png'
  ),
  f(
    'f9030453',
    'Single Lever Clinical Faucet',
    'Single Lever Clinical Faucet',
    'Standard',
    5900,
    '-',
    '-',
    'F9030453',
    'https://www.cera-india.com/sites/default/files/F9030453-1.jpg',
    [
      'https://www.cera-india.com/sites/default/files/F9030453-1.jpg',
      'https://www.cera-india.com/sites/default/files/F9030453-2.jpg',
      'https://www.cera-india.com/sites/default/files/F9030453-3.jpg',
      'https://cdn.shopify.com/s/files/1/0486/4137/6411/products/F9030453.jpg',
    ]
  ),
];
