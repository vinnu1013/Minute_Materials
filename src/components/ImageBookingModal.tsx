import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Loader2,
  Wrench,
  User,
  Navigation,
  ShieldCheck,
  Send,
  Eye,
  ShoppingCart,
  Check
} from 'lucide-react';
import { Product, GeminiDetectedItem, StoreSettings, UserRole } from '../types';
import { fetchCurrentLocationAddress } from '../utils/distance';
import { findBestCatalogMatch } from '../utils/searchUtils';

interface ImageBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  onBookingCreated: () => void;
  storeSettings?: StoreSettings;
}

interface ImageFileItem {
  id: string;
  name: string;
  base64: string;
}

export const ImageBookingModal: React.FC<ImageBookingModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddToCart,
  onBookingCreated,
  storeSettings
}) => {
  const [userRole, setUserRole] = useState<UserRole>('plumber_electrician');
  const [plumberPhone, setPlumberPhone] = useState('');
  const [plumberName, setPlumberName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const [uploadedImages, setUploadedImages] = useState<ImageFileItem[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{
    detectedItems: GeminiDetectedItem[];
    totalEstimatedCost: number;
    rawNotes?: string;
  } | null>(null);

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submittedBookingId, setSubmittedBookingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [addedItemIndices, setAddedItemIndices] = useState<Record<number, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolveCartProduct = (item: GeminiDetectedItem, idx: number): Product => {
    const itemName = item.item || item.name || `Material Item ${idx + 1}`;
    const sizeStr = item.size || 'Standard';
    const matched = findBestCatalogMatch(itemName, sizeStr, products);
    if (matched) return matched;

    return {
      id: `scanned-${idx}-${itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: sizeStr && sizeStr !== 'Standard' ? `${itemName} (${sizeStr})` : itemName,
      baseName: itemName,
      sizeLabel: sizeStr,
      sku: `SCAN-${idx + 1}`,
      brand: 'Minute Materials',
      category: 'Plumbing',
      subcategory: 'Scanned List Item',
      price: Number(item.estimatedUnitPrice) || 0,
      unit: 'Piece',
      stockStatus: 'in_stock',
      stockCount: 50,
      image: uploadedImages[0]?.base64 || '/logo-square.png',
      description: '',
    };
  };

  const handleAddSingleScannedItem = (item: GeminiDetectedItem, idx: number) => {
    const qty = Math.max(1, Number(item.quantity || item.estimatedQty || 1));
    const cartProduct = resolveCartProduct(item, idx);
    onAddToCart(cartProduct, qty);
    setAddedItemIndices((prev) => ({ ...prev, [idx]: true }));
  };

  const handleAddAllScannedItems = () => {
    if (!geminiResult?.detectedItems?.length) return;
    const nextAdded: Record<number, boolean> = { ...addedItemIndices };
    geminiResult.detectedItems.forEach((item, idx) => {
      const qty = Math.max(1, Number(item.quantity || item.estimatedQty || 1));
      const cartProduct = resolveCartProduct(item, idx);
      onAddToCart(cartProduct, qty);
      nextAdded[idx] = true;
    });
    setAddedItemIndices(nextAdded);
  };

  // Auto fetch current location on modal open
  React.useEffect(() => {
    if (isOpen) {
      setIsLocating(true);
      fetchCurrentLocationAddress()
        .then(loc => {
          if (loc && loc.address) {
            setDeliveryAddress(loc.address);
          }
        })
        .catch(err => {
          console.warn('Auto location fetch failed:', err);
        })
        .finally(() => {
          setIsLocating(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Geolocation for Current Location
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setErrorMessage('');
    try {
      const loc = await fetchCurrentLocationAddress();
      setDeliveryAddress(loc.address);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to fetch location. Please enter address manually.');
    } finally {
      setIsLocating(false);
    }
  };

  // Compress & resize large mobile camera photos (e.g. 8-12MB -> ~250KB) for fast, reliable OCR
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onerror = () => resolve(dataUrl); // fallback to original if browser can't decode
        img.onload = () => {
          const MAX_DIM = 1200;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width >= height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(dataUrl);
              return;
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.75);
            resolve(compressed);
          } catch {
            resolve(dataUrl);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Automatically trigger scan whenever new images are added
  const triggerAutoScan = async (imagesList: ImageFileItem[]) => {
    if (imagesList.length === 0) return;

    setIsScanning(true);
    setErrorMessage('');
    setAddedItemIndices({});

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64List: imagesList.map(img => img.base64),
          plumberPhone: plumberPhone.trim(),
          userRole
        })
      });

      const rawText = await response.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(
          response.status === 413
            ? 'Photo file was too large. Please try uploading again or fewer photos at once.'
            : 'Server returned an unexpected response while scanning. Please tap Re-scan Images.'
        );
      }

      if (!response.ok || !data?.analysis) {
        throw new Error(data?.error || 'Failed to scan material list image.');
      }

      setGeminiResult(data.analysis);
    } catch (err: any) {
      console.error('Image OCR scan failed:', err);
      setGeminiResult(null);
      setErrorMessage(
        err?.message || 'Could not read the uploaded image. Please upload a clearer photo or click Re-scan Images.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Multi-file Selection (with automatic mobile photo compression)
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setErrorMessage('Please select valid image files (JPG, PNG, WebP).');
      return;
    }

    setErrorMessage('');
    try {
      const newItems: ImageFileItem[] = await Promise.all(
        fileArray.map(async (file) => {
          const compressedBase64 = await compressImageFile(file);
          return {
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            base64: compressedBase64,
          };
        })
      );

      const updatedList = [...uploadedImages, ...newItems];
      setUploadedImages(updatedList);
      // AUTO SCAN AUTOMATICALLY
      triggerAutoScan(updatedList);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process selected image.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Drag and Drop support
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (id: string) => {
    const updated = uploadedImages.filter(img => img.id !== id);
    setUploadedImages(updated);
    if (updated.length === 0) {
      setGeminiResult(null);
    } else {
      triggerAutoScan(updated);
    }
  };

  // Construct WhatsApp URL
  const getWhatsAppUrl = (bookingIdOverride?: string) => {
    const rawNumber = storeSettings?.whatsappNumber || storeSettings?.helplineNumber || '8332869926';
    const cleanPhone = rawNumber.replace(/[^0-9]/g, '');
    const targetNumber = cleanPhone.startsWith('91') ? cleanPhone : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

    let itemsSummary = '';
    if (geminiResult && geminiResult.detectedItems && geminiResult.detectedItems.length > 0) {
      itemsSummary = '\n\n📋 *AUTO-DETECTED MATERIAL LIST:* \n' +
        geminiResult.detectedItems.map((i, idx) => {
          const slNo = idx + 1;
          const itemName = i.item || i.name;
          const size = i.size || 'Standard';
          const qty = i.quantity || i.estimatedQty || 1;
          return `Sl No: ${slNo} | Item: ${itemName} | Size: ${size} | Quantity: ${qty}`;
        }).join('\n');
    }

    const roleName = userRole === 'plumber_electrician' ? 'Plumber / Electrician' : 'Customer';
    const contactInfo = userRole === 'customer' 
      ? `\n👷 *Plumber Name:* ${plumberName || 'Not specified'}\n📞 *Plumber Phone:* ${plumberPhone.trim()}`
      : `\n👤 *Plumber/Contractor:* ${customerName || 'Trade Customer'}\n📞 *Phone:* ${plumberPhone || 'Not specified'}`;

    const activeBookingId = bookingIdOverride || submittedBookingId;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const imageLink = activeBookingId ? `${origin}/api/bookings/${activeBookingId}/image` : '';

    const waText = `📷 *EXPRESS MATERIAL ORDER (PHOTO & LIST ATTACHED)*
----------------------------------------
🏷️ *User Type:* ${roleName}${contactInfo}
📍 *Job Site Address:* ${deliveryAddress || 'Call for location'}
📁 *Uploaded Photos:* ${uploadedImages.length} photo(s)
${imageLink ? `🖼️ *View Scanned Photo:* ${imageLink}\n` : ''}${notes ? `\n📝 *Notes:* ${notes}` : ''}${itemsSummary}
----------------------------------------
⚡ Please view the photo link above and material list for express dispatch!
Sent via Express Supplier Portal (${targetNumber})`;

    return {
      url: `https://wa.me/${targetNumber}?text=${encodeURIComponent(waText)}`,
      targetNumber,
      imageLink
    };
  };

  // SUBMIT ORDER NOW
  const handleSubmitImageBooking = async () => {
    // Validation based on user type:
    if (userRole === 'plumber_electrician') {
      if (!customerName.trim()) {
        setErrorMessage('⚠️ Plumber / Electrician Name is MANDATORY.');
        return;
      }
      if (!plumberPhone.trim()) {
        setErrorMessage('⚠️ Plumber / Electrician Phone Number is MANDATORY.');
        return;
      }
    } else if (userRole === 'customer') {
      if (!plumberName.trim()) {
        setErrorMessage('⚠️ Plumber / Electrician Name is MANDATORY for Customer orders.');
        return;
      }
      if (!plumberPhone.trim()) {
        setErrorMessage('⚠️ Plumber / Electrician Phone Number is MANDATORY for Customer orders so our team can verify material specs if needed.');
        return;
      }
    }

    if (uploadedImages.length === 0) {
      setErrorMessage('⚠️ Please upload at least one photo of your material list or part.');
      return;
    }

    setIsSubmittingOrder(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingType: 'image_upload',
          customerName: customerName || (userRole === 'customer' ? 'Customer' : 'Plumber'),
          userRole,
          plumberPhone: plumberPhone.trim(),
          plumberName: plumberName.trim(),
          deliveryAddress,
          imageBase64: uploadedImages[0]?.base64 || '',
          geminiAnalysis: geminiResult || undefined,
          notes,
          totalPrice: geminiResult ? geminiResult.totalEstimatedCost : 0,
          status: 'new'
        })
      });

      const data = await res.json();
      const bookingId = data?.booking?.id;
      if (bookingId) {
        setSubmittedBookingId(bookingId);
      }

      const { url: whatsappUrl } = getWhatsAppUrl(bookingId);

      // Open WhatsApp directly
      window.open(whatsappUrl, '_blank');

      setOrderSuccess(true);
      onBookingCreated();
    } catch (err: any) {
      const { url: whatsappUrl } = getWhatsAppUrl();
      window.open(whatsappUrl, '_blank');
      setOrderSuccess(true);
      onBookingCreated();
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 flex items-start sm:items-center justify-center min-h-screen">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-4 sm:p-6 text-slate-900 shadow-2xl relative my-auto sm:my-8 max-h-[92vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {orderSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Order Submitted Successfully!</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Your material order with uploaded list photos has been submitted and opened in WhatsApp. Our trade material dispatcher (<strong className="text-amber-600 font-mono">{getWhatsAppUrl().targetNumber}</strong>) is reviewing your list and attached photos for express dispatch.
            </p>

            {/* Order Success Message */}

            <div className="pt-2 space-y-2 max-w-sm mx-auto">
              <a
                href={getWhatsAppUrl().url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2"
              >
                📱 Open WhatsApp Chat ({getWhatsAppUrl().targetNumber})
              </a>

              <button
                onClick={() => {
                  setOrderSuccess(false);
                  onClose();
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition"
              >
                Done & Return to Store
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Modal Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-100 text-cyan-700 rounded-xl flex items-center justify-center border border-cyan-200">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest block">Instant Auto-Scan</span>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  Image Upload Material Scanner
                </h2>
              </div>
            </div>

            {/* USER TYPE SELECTOR */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  User Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserRole('plumber_electrician');
                      setErrorMessage('');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 ${
                      userRole === 'plumber_electrician'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Wrench className="w-4 h-4" /> Plumber / Electrician
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserRole('customer');
                      setErrorMessage('');
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 ${
                      userRole === 'customer'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4" /> Customer
                  </button>
                </div>
              </div>

              {/* DYNAMIC ROLE FIELDS */}
              {userRole === 'customer' ? (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  {/* Explanation Banner */}
                  <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-cyan-900">
                    <ShieldCheck className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="text-cyan-800 font-bold block mb-0.5">Plumber Contact Required for Verification</strong>
                      If our technical team has any doubt or needs clarification on fitting sizes, pipe types, or specifications on your uploaded list, we will contact your plumber directly to verify before delivering to your job site.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Plumber / Electrician Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Plumber"
                        value={plumberName}
                        onChange={(e) => setPlumberName(e.target.value)}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Plumber / Electrician Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +91 8332869926"
                        value={plumberPhone}
                        onChange={(e) => {
                          setPlumberPhone(e.target.value);
                          if (errorMessage.includes('Plumber')) setErrorMessage('');
                        }}
                        className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Name (Customer)</label>
                    <input
                      type="text"
                      placeholder="e.g. Srikant Verma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              ) : (
                /* Plumber / Electrician Role Fields - MANDATORY name and phone */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Plumber / Electrician Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Srinivas Trade Services"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Plumber / Electrician Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 8332869926"
                      value={plumberPhone}
                      onChange={(e) => {
                        setPlumberPhone(e.target.value);
                        if (errorMessage.includes('Plumber')) setErrorMessage('');
                      }}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* MULTI-IMAGE UPLOAD AREA WITH AUTO-SCAN & LASER ANIMATION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Upload Photo(s) of Handwritten List, Part, Tag, or Blueprint (Multiple Allowed)
                </label>
                {uploadedImages.length > 0 && (
                  <span className="text-[11px] text-cyan-700 font-mono font-bold">
                    {uploadedImages.length} Image(s) Attached
                  </span>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <div 
                className="relative border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-2xl p-4 bg-slate-50 hover:bg-white transition cursor-pointer overflow-hidden min-h-[140px] flex flex-col justify-center"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {/* SCANNING LASER ANIMATION OVERLAY */}
                {isScanning && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4">
                    {/* Animated Laser Scanning Line */}
                    <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_20px_#06b6d4] animate-scan-line" />
                    
                    <div className="bg-white border border-cyan-400 px-5 py-3 rounded-2xl flex items-center gap-3 text-cyan-800 font-bold text-xs shadow-xl animate-pulse">
                      <Sparkles className="w-5 h-5 text-cyan-600 animate-spin" />
                      <div>
                        <p className="text-slate-900 font-black text-sm">Automatically Scanning Image List...</p>
                        <p className="text-[11px] text-slate-600 font-normal">Extracting materials & matching prices with Gemini AI</p>
                      </div>
                    </div>
                  </div>
                )}

                {uploadedImages.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {uploadedImages.map((img) => (
                        <div key={img.id} className="relative group bg-white rounded-xl p-1.5 border border-slate-200 flex flex-col items-center shadow-sm">
                          {img.base64 && img.base64.trim() !== '' && (
                            <img
                              src={img.base64}
                              alt={img.name}
                              className="w-full h-24 object-cover rounded-lg border border-slate-200 bg-slate-50"
                            />
                          )}
                          <p className="text-[10px] text-slate-600 font-mono mt-1 truncate w-full text-center px-1">
                            {img.name}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(img.id);
                            }}
                            className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-400 text-white rounded-full p-1 shadow transition"
                            title="Remove image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Add More Button Tile */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="h-24 border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-cyan-700 bg-white hover:bg-slate-50 transition"
                      >
                        <Plus className="w-6 h-6 text-cyan-600" />
                        <span className="text-[10px] font-bold">Add More</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span>Click box or drag files to add more images</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerAutoScan(uploadedImages);
                        }}
                        className="text-cyan-700 hover:text-cyan-800 font-bold flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Re-scan Images
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Upload className="w-9 h-9 text-cyan-600 mx-auto mb-2" />
                    <p className="text-xs font-black text-slate-900">Click or Drag & Drop Material Photos Here</p>
                    <p className="text-[11px] text-slate-500 mt-1">Supports uploading multiple images at once (Handwritten notes, tags, blueprints)</p>
                    <div className="inline-flex items-center gap-1.5 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full text-[11px] font-bold text-cyan-800 mt-3">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" /> Automatically scans on upload
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Notes (JUST BELOW IMAGE UPLOADING) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Additional Instructions or Part Requirements</label>
              <input
                type="text"
                placeholder="e.g. Need Astral CPVC brand, urgent express delivery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 placeholder:text-slate-400"
              />
            </div>

            {/* AUTOMATICALLY DISPLAYED MATERIAL LIST FROM SCANNED IMAGES */}
            {geminiResult && (() => {
              const items = geminiResult.detectedItems || [];
              const enrichedItems = items.map((item: any, idx: number) => {
                const matchedById = item.matchedProductId
                  ? products.find((p) => p.id === item.matchedProductId) || null
                  : null;
                const matchedProduct =
                  matchedById ||
                  findBestCatalogMatch(item.item || item.name || '', item.size, products);
                return { item, idx, matchedProduct };
              });
              const foundList = enrichedItems.filter((e) => Boolean(e.matchedProduct));
              const notFoundList = enrichedItems.filter((e) => !e.matchedProduct);

              const handleAddAllFound = () => {
                const nextAdded: Record<number, boolean> = { ...addedItemIndices };
                foundList.forEach(({ item, idx, matchedProduct }) => {
                  if (!matchedProduct) return;
                  const qty = Math.max(1, Number(item.quantity || item.estimatedQty || 1));
                  onAddToCart(matchedProduct, qty);
                  nextAdded[idx] = true;
                });
                setAddedItemIndices(nextAdded);
              };

              return (
                <div className="space-y-3">
                  {/* SECTION 1: FOUND IN WEBSITE CATALOG (READY TO ADD TO CART) */}
                  <div className="bg-white border border-emerald-300 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                          Found in Website Catalog ({foundList.length} of {items.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                          Est. Total: ₹{geminiResult.totalEstimatedCost.toFixed(2)}
                        </span>
                        {foundList.length > 0 && (
                          <button
                            type="button"
                            onClick={handleAddAllFound}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Add All Found to Cart
                          </button>
                        )}
                      </div>
                    </div>

                    {geminiResult.rawNotes && <p className="text-xs text-slate-600 italic">{geminiResult.rawNotes}</p>}

                    {foundList.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-60 overflow-y-auto bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-emerald-50/70 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="py-2.5 px-2.5">Sl</th>
                              <th className="py-2.5 px-2.5">Material &amp; Matched Product</th>
                              <th className="py-2.5 px-2.5">Size</th>
                              <th className="py-2.5 px-2 text-center">Qty</th>
                              <th className="py-2.5 px-2.5 text-right">Price</th>
                              <th className="py-2.5 px-2.5 text-right">Cart</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {foundList.map(({ item, idx, matchedProduct }, listPos) => {
                              const itemName = item.item || item.name;
                              const origText = (item as any).originalText;
                              const sizeStr = item.size || 'Standard';
                              const qty = item.quantity || item.estimatedQty || 1;
                              const unitPrice = matchedProduct && matchedProduct.price > 0
                                ? matchedProduct.price
                                : item.estimatedUnitPrice;
                              const isAdded = Boolean(addedItemIndices[idx]);
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition">
                                  <td className="py-2.5 px-2.5 font-mono text-emerald-700 font-bold">{listPos + 1}</td>
                                  <td className="py-2.5 px-2.5">
                                    <div className="font-semibold text-slate-900">{itemName}</div>
                                    {origText && origText.toLowerCase().trim() !== itemName.toLowerCase().trim() && (
                                      <div className="text-[10px] text-slate-500">
                                        Auto-corrected from: <span className="italic">"{origText}"</span>
                                      </div>
                                    )}
                                    {matchedProduct && (
                                      <div className="text-[10px] text-emerald-700 font-semibold">
                                        Store Item: {matchedProduct.name}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-amber-700 font-mono text-[11px]">{sizeStr}</td>
                                  <td className="py-2.5 px-2 text-center font-bold text-emerald-600">{qty}</td>
                                  <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-700">
                                    {unitPrice > 0 ? `₹${(qty * unitPrice).toFixed(2)}` : 'Quote'}
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleAddSingleScannedItem(item, idx)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                        isAdded
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                      }`}
                                    >
                                      {isAdded ? (
                                        <>
                                          <Check className="w-3 h-3" /> Added
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3" /> Add
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No exact matches found in the live catalog for this photo.</p>
                    )}
                  </div>

                  {/* SECTION 2: SEPARATE LIST OF MATERIALS NOT FOUND IN WEBSITE CATALOG */}
                  {notFoundList.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2 border-b border-rose-200/80 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 uppercase tracking-wider">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Not Found in Website Catalog ({notFoundList.length} Items)</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-rose-700">
                        These materials from your uploaded photo are not currently listed in the website catalog. Tap <strong>Order Now</strong> below to send them to our dispatch desk for manual sourcing:
                      </p>
                      <div className="overflow-x-auto border border-rose-200 rounded-xl max-h-48 overflow-y-auto bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-rose-50 text-rose-800 font-bold border-b border-rose-200 text-[11px]">
                            <tr>
                              <th className="py-2 px-2.5">Sl</th>
                              <th className="py-2 px-2.5">Material from Photo</th>
                              <th className="py-2 px-2.5">Size</th>
                              <th className="py-2 px-2 text-center">Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-rose-100">
                            {notFoundList.map(({ item, idx }, nfPos) => {
                              const itemName = item.item || item.name;
                              const origText = (item as any).originalText;
                              const sizeStr = item.size || 'Standard';
                              const qty = item.quantity || item.estimatedQty || 1;
                              return (
                                <tr key={idx} className="hover:bg-rose-50/40">
                                  <td className="py-2 px-2.5 font-mono text-rose-700 font-bold">{nfPos + 1}</td>
                                  <td className="py-2 px-2.5">
                                    <div className="font-semibold text-slate-900">{itemName}</div>
                                    {origText && origText.toLowerCase().trim() !== itemName.toLowerCase().trim() && (
                                      <div className="text-[10px] text-slate-500">
                                        Auto-corrected from: <span className="italic">"{origText}"</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 text-amber-700 font-mono text-[11px]">{sizeStr}</td>
                                  <td className="py-2 px-2 text-center font-bold text-rose-700">{qty}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Delivery Address (LAST FIELD BEFORE ACTIONS) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Delivery Address / Jobsite Location</label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="text-[11px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1 font-bold transition"
                >
                  <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  {isLocating ? 'Locating...' : '📍 Use Current Location'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Enter jobsite address or click Use Current Location"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 placeholder:text-slate-400"
              />
            </div>

            {/* ACTION BUTTONS WITH "ORDER NOW" */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitImageBooking}
                disabled={isSubmittingOrder || uploadedImages.length === 0}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing Order...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Order Now
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
