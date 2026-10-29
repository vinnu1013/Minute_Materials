import React, { useState } from 'react';
import { Upload, Plus, Trash2, ArrowLeft, ArrowRight, Star, Images, Loader2 } from 'lucide-react';

interface MultiImageUploaderProps {
  images: string[];
  onChange: (nextImages: string[]) => void;
  label?: string;
  helperText?: string;
}

async function compressImageFile(file: File, maxDimension = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          // Preserve white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  images,
  onChange,
  label = 'Product Photos (Multiple Images Supported)',
  helperText = 'Add 2 or more photos to enable automatic image sliding on the product details page.',
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const normalized = (images || []).map((u) => (u || '').trim()).filter(Boolean);

  const handleAddUrl = () => {
    const clean = urlInput.trim();
    if (!clean) return;
    if (!normalized.includes(clean)) {
      onChange([...normalized, clean]);
    }
    setUrlInput('');
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const files: File[] = Array.from(fileList);
      const encoded = await Promise.all(files.map((f) => compressImageFile(f)));
      const merged = [...normalized];
      encoded.forEach((src) => {
        if (src && !merged.includes(src)) {
          merged.push(src);
        }
      });
      onChange(merged);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAt = (index: number) => {
    onChange(normalized.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= normalized.length) return;
    const copy = [...normalized];
    const [picked] = copy.splice(index, 1);
    copy.splice(target, 0, picked);
    onChange(copy);
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const copy = [...normalized];
    const [picked] = copy.splice(index, 1);
    copy.unshift(picked);
    onChange(copy);
  };

  return (
    <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Images className="w-3.5 h-3.5 text-amber-600" />
            <span>{label}</span>
          </label>
          <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
        </div>

        {normalized.length >= 2 && (
          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            ✓ {normalized.length} Photos · Auto-Slide Active
          </span>
        )}
      </div>

      {/* Upload & URL Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg border border-amber-300 transition shrink-0">
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Adding Photos...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photos (Select 1 or Multiple)</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </label>

        <div className="flex-1 flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Paste image URL (https://... or /photo.jpg) & click + Add"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            className="flex-1 bg-white border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add URL
          </button>
        </div>
      </div>

      {/* Thumbnails Strip */}
      {normalized.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
          {normalized.map((src, idx) => (
            <div
              key={`${src.slice(0, 40)}-${idx}`}
              className={`relative rounded-lg overflow-hidden bg-white border ${
                idx === 0 ? 'border-amber-500 ring-1 ring-amber-400' : 'border-slate-200'
              } p-1 flex flex-col justify-between group`}
            >
              <div className="relative aspect-square rounded overflow-hidden bg-slate-50">
                <img
                  src={src}
                  alt={`Slide ${idx + 1}`}
                  className="w-full h-full object-contain"
                />
                {idx === 0 ? (
                  <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(idx)}
                    title="Set as main cover image"
                    className="absolute top-1 left-1 bg-white/90 hover:bg-amber-500 text-slate-700 hover:text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 shadow-xs transition cursor-pointer flex items-center gap-0.5"
                  >
                    <Star className="w-2.5 h-2.5" /> Cover
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAt(idx)}
                  title="Remove photo"
                  className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 px-0.5 text-[10px] text-slate-500 font-mono">
                <span>#{idx + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    className="p-0.5 hover:text-slate-900 disabled:opacity-25 cursor-pointer"
                    title="Move left"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === normalized.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    className="p-0.5 hover:text-slate-900 disabled:opacity-25 cursor-pointer"
                    title="Move right"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
