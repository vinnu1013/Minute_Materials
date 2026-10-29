# Code Admin Guide (`/src/admin/`)

All changes you make inside `/src/admin/` automatically sync to the live store as soon as you save — while keeping your web **Admin Panel** working side-by-side too.

---

## Which File to Edit for Each Admin Task

| Admin Task | File / Folder Path |
| --- | --- |
| **Store Name, Phone, WhatsApp, ₹499 Free Delivery, Fees, UPI ID, Banner, Admin PIN** | `src/admin/storeSettings.ts` |
| **Add / Rename / Reorder / Remove Main Categories & Subcategories** | `src/admin/categories.ts` |
| **Add New Products, Multi-Size Products, Fans/Lights/Tools, Bulk % Discounts, Quick Price Edits, Remove Items** | `src/admin/myProducts.ts` |
| **Upload Product Photos (Single or Multiple Auto-Sliding Images)** | `public/products/` *(use `'/products/your-photo.jpg'`)* |
| **Edit Existing Base Plumbing & Electrical Catalog Directly** | `src/data/initialProducts.ts` *(or `data/products.json`)* |
| **Edit Delivery Areas & Live Delivery Minutes (LB Nagar, Vanasthalipuram, etc.)** | `src/admin/deliveryAreas.ts` |

---

## Quick Copy-Paste Examples (`src/admin/myProducts.ts`)

### 1. Add a Fan, Light, or Tool (Opens Product Details Page + Auto-Slides Images)
```ts
singleProduct({
  name: 'Polycab Nippy Ceiling Fan 1200mm Star Rated - Matt Blue',
  category: 'fans',
  subcategory: 'Ceiling Fans',
  price: 1599,
  originalPrice: 2899,
  brand: 'Polycab',
  warranty: '2 year',
  rating: 4.4,
  reviewCount: 43,
  images: [
    '/products/polycab-1.jpg',
    '/products/polycab-2.jpg', // 2+ images = automatic sliding!
  ],
  specifications: {
    'No of blades': '3',
    'No of speed': '3',
    'Wattage': '52 W',
    'Colour name': 'Matt Blue',
  },
  whatsInTheBox: '1 Motor, 3 Blades, 2 Canopies, Downrod, Warranty Card',
}),
```

### 2. Add a Multi-Size Material (Asks Customer to Pick Size on "Add to Cart")
```ts
...multiSizeProduct({
  baseName: 'CPVC Ball Valve',
  category: 'plumbing',
  subcategory: 'Valves, Taps & Mixers',
  image: '/products/ball-valve.jpg',
  sizes: [
    { size: '1/2"', price: 95,  originalPrice: 120 },
    { size: '3/4"', price: 145, originalPrice: 180 },
    { size: '1"',   price: 230, originalPrice: 280 },
  ],
}),
```

### 3. Update an Existing Product's Price or Stock Quickly
Inside `PRODUCT_UPDATES` in `src/admin/myProducts.ts`:
```ts
{ match: 'p-001', updates: { price: 18, originalPrice: 22 } },
```

### 4. Apply a Storewide or Category Price Drop (%)
Inside `CATEGORY_BULK_PRICE_PERCENT` in `src/admin/myProducts.ts`:
```ts
fans: -10, // Reduces all Fans prices by 10% and shows Save 10% badge!
```
