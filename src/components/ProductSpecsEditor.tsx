import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  PackageCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { CategoryConfig, Product } from '../types';
import {
  getCategoryDisplayName,
  getCategorySpecPresets,
  isDetailPageCategory,
} from '../data/categories';
import { MultiImageUploader } from './MultiImageUploader';

export interface SpecEntryRow {
  id: string;
  key: string;
  value: string;
}

export interface ProductRichDetailsValue {
  brand: string;
  warranty: string;
  warrantyDetails: string;
  whatsInTheBox: string;
  vendorDetails: string;
  rating: string;
  reviewCount: string;
  specRows: SpecEntryRow[];
  brandImages: string[];
}

function makeRowId(): string {
  return `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRichDetailsStateFromProduct(
  product?: Partial<Product> | null
): ProductRichDetailsValue {
  const mergedSpecs: Record<string, string> = {};
  if (product?.keyHighlights && typeof product.keyHighlights === 'object') {
    Object.entries(product.keyHighlights).forEach(([k, v]) => {
      if (k && String(v ?? '').trim()) {
        mergedSpecs[k.trim()] = String(v).trim();
      }
    });
  }
  if (product?.specifications && typeof product.specifications === 'object') {
    Object.entries(product.specifications).forEach(([k, v]) => {
      if (k && String(v ?? '').trim()) {
        mergedSpecs[k.trim()] = String(v).trim();
      }
    });
  }

  const specRows: SpecEntryRow[] = Object.entries(mergedSpecs).map(([key, value]) => ({
    id: makeRowId(),
    key,
    value,
  }));

  return {
    brand: product?.brand || '',
    warranty: product?.warranty || '',
    warrantyDetails: product?.warrantyDetails || '',
    whatsInTheBox: product?.whatsInTheBox || '',
    vendorDetails: product?.vendorDetails || '',
    rating:
      product?.rating !== undefined && product?.rating !== null && product.rating > 0
        ? String(product.rating)
        : '',
    reviewCount:
      product?.reviewCount !== undefined && product?.reviewCount !== null && product.reviewCount > 0
        ? String(product.reviewCount)
        : '',
    specRows,
    brandImages: Array.isArray(product?.brandImages)
      ? product!.brandImages.map((u) => (u || '').trim()).filter(Boolean)
      : [],
  };
}

export function serializeRichDetailsToProductFields(
  value: ProductRichDetailsValue
): Partial<Product> {
  const specifications: Record<string, string> = {};
  value.specRows.forEach((row) => {
    const cleanKey = (row.key || '').trim();
    const cleanVal = (row.value || '').trim();
    if (cleanKey && cleanVal) {
      specifications[cleanKey] = cleanVal;
    }
  });

  // Top 6 populated specifications also populate keyHighlights for fast PDP highlight cards
  const keyHighlights: Record<string, string> = {};
  Object.entries(specifications)
    .slice(0, 6)
    .forEach(([k, v]) => {
      keyHighlights[k] = v;
    });
  if (value.warranty.trim() && !keyHighlights['Warranty']) {
    keyHighlights['Warranty'] = value.warranty.trim();
  }

  const parsedRating = Number(value.rating);
  const parsedReviews = Number(value.reviewCount);
  const cleanBrandImages = value.brandImages.map((u) => (u || '').trim()).filter(Boolean);

  return {
    brand: value.brand.trim() || undefined,
    warranty: value.warranty.trim() || undefined,
    warrantyDetails: value.warrantyDetails.trim() || undefined,
    whatsInTheBox: value.whatsInTheBox.trim() || undefined,
    vendorDetails: value.vendorDetails.trim() || undefined,
    rating:
      !Number.isNaN(parsedRating) && parsedRating > 0
        ? Math.min(5, Math.max(1, Number(parsedRating.toFixed(1))))
        : undefined,
    reviewCount:
      !Number.isNaN(parsedReviews) && parsedReviews >= 0 ? Math.round(parsedReviews) : undefined,
    specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
    keyHighlights: Object.keys(keyHighlights).length > 0 ? keyHighlights : undefined,
    brandImages: cleanBrandImages.length > 0 ? cleanBrandImages : undefined,
  };
}

interface ProductSpecsEditorProps {
  categoryId: string;
  categories?: CategoryConfig[];
  value: ProductRichDetailsValue;
  onChange: (next: ProductRichDetailsValue) => void;
}

export const ProductSpecsEditor: React.FC<ProductSpecsEditorProps> = ({
  categoryId,
  categories,
  value,
  onChange,
}) => {
  const isDetailCat = isDetailPageCategory(categoryId, categories);
  const hasFilledData =
    Boolean(value.brand.trim()) ||
    Boolean(value.warranty.trim()) ||
    value.specRows.some((r) => r.value.trim()) ||
    value.brandImages.length > 0;

  const [isExpanded, setIsExpanded] = useState<boolean>(isDetailCat || hasFilledData);

  useEffect(() => {
    if (isDetailCat) {
      setIsExpanded(true);
    }
  }, [isDetailCat]);

  const catLabel = getCategoryDisplayName(categoryId, categories);
  const presets = getCategorySpecPresets(categoryId);

  const handleFieldChange = <K extends keyof ProductRichDetailsValue>(
    field: K,
    nextVal: ProductRichDetailsValue[K]
  ) => {
    onChange({
      ...value,
      [field]: nextVal,
    });
  };

  const handleLoadPresets = () => {
    const existingKeys = new Set(value.specRows.map((r) => r.key.trim().toLowerCase()));
    const addedRows: SpecEntryRow[] = presets
      .filter((preset) => !existingKeys.has(preset.toLowerCase()))
      .map((preset) => ({
        id: makeRowId(),
        key: preset,
        value: '',
      }));

    if (addedRows.length > 0) {
      handleFieldChange('specRows', [...value.specRows, ...addedRows]);
    }
  };

  const handleAddSpecRow = () => {
    handleFieldChange('specRows', [
      ...value.specRows,
      { id: makeRowId(), key: '', value: '' },
    ]);
  };

  const handleUpdateSpecRow = (id: string, field: 'key' | 'value', text: string) => {
    handleFieldChange(
      'specRows',
      value.specRows.map((r) => (r.id === id ? { ...r, [field]: text } : r))
    );
  };

  const handleRemoveSpecRow = (id: string) => {
    handleFieldChange(
      'specRows',
      value.specRows.filter((r) => r.id !== id)
    );
  };

  const filledSpecCount = value.specRows.filter((r) => r.key.trim() && r.value.trim()).length;

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left bg-white hover:bg-slate-50 transition border-b border-slate-200/80"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-extrabold text-slate-900">
            Product Details Page Specs & Highlights
          </span>
          {isDetailCat && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
              Opens Dedicated Product Page ({catLabel})
            </span>
          )}
          {filledSpecCount > 0 && (
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              {filledSpecCount} Specs Ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
          <span>{isExpanded ? 'Hide' : 'Configure'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3.5 space-y-3.5 text-xs">
          {/* Row 1: Brand, Warranty, Rating, Reviews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Brand Name
              </label>
              <input
                type="text"
                placeholder="e.g., Longway, Polycab, Usha, Havells"
                value={value.brand}
                onChange={(e) => handleFieldChange('brand', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Warranty Badge
              </label>
              <input
                type="text"
                placeholder="e.g., 2 year, 1 Year Warranty"
                value={value.warranty}
                onChange={(e) => handleFieldChange('warranty', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Rating (1.0 – 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                placeholder="e.g., 4.2"
                value={value.rating}
                onChange={(e) => handleFieldChange('rating', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Review Count
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g., 716"
                value={value.reviewCount}
                onChange={(e) => handleFieldChange('reviewCount', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Row 2: Specifications Table Builder */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-slate-900">
                  Key Highlights & Technical Specifications
                </div>
                <p className="text-[11px] text-slate-500">
                  First 4 specs appear in the top quick-info strip &amp; Key Highlights table on the
                  product page.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLoadPresets}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-lg transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load {catLabel} Spec Fields
                </button>
                <button
                  type="button"
                  onClick={handleAddSpecRow}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
            </div>

            {value.specRows.length === 0 ? (
              <div className="text-[11px] text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 text-center">
                Click <strong>Load {catLabel} Spec Fields</strong> to fill attributes like blades,
                wattage, speed, colour, material, voltage, and dimensions.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {value.specRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1.5"
                  >
                    <span className="text-[10px] font-mono font-bold text-slate-400 w-4 text-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="Spec name (e.g., Wattage)"
                      value={row.key}
                      onChange={(e) => handleUpdateSpecRow(row.id, 'key', e.target.value)}
                      className="w-2/5 bg-white border border-slate-300 text-slate-800 px-2 py-1 rounded text-[11px] font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g., 50 W)"
                      value={row.value}
                      onChange={(e) => handleUpdateSpecRow(row.id, 'value', e.target.value)}
                      className="flex-1 bg-white border border-slate-300 text-slate-900 px-2 py-1 rounded text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecRow(row.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition shrink-0"
                      title="Remove specification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row 3: Box Contents, Warranty Details, Vendor Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase mb-1">
                <PackageCheck className="w-3 h-3 text-emerald-600" /> What&apos;s In The Box
              </label>
              <input
                type="text"
                placeholder="e.g., 1 Motor, 3 Blades, 2 Canopies, Downrod, Warranty Card"
                value={value.whatsInTheBox}
                onChange={(e) => handleFieldChange('whatsInTheBox', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase mb-1">
                <ShieldCheck className="w-3 h-3 text-amber-600" /> Warranty Details
              </label>
              <input
                type="text"
                placeholder="e.g., 2 Year Manufacturer Brand Warranty against motor defects"
                value={value.warrantyDetails}
                onChange={(e) => handleFieldChange('warrantyDetails', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Vendor / Manufacturer Details
              </label>
              <input
                type="text"
                placeholder="e.g., Authorized Supply — Minute Materials Depot, LB Nagar"
                value={value.vendorDetails}
                onChange={(e) => handleFieldChange('vendorDetails', e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Row 4: Optional Brand / Feature Banner Images */}
          <MultiImageUploader
            images={value.brandImages}
            onChange={(imgs) => handleFieldChange('brandImages', imgs)}
            label="Brand & Feature Banner Images (Optional — shown under Brand Images)"
            helperText="Upload manufacturer feature banners or specification graphics if available."
          />
        </div>
      )}
    </div>
  );
};
