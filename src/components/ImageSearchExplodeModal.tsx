import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  UploadCloud,
  Layers,
  Loader2,
  ShoppingCart,
  Check,
  Sparkles,
  RotateCcw,
  Send,
  Navigation,
  Wrench,
  User,
  ZoomIn,
  Tag,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { Product, StoreSettings, CartItem, UserRole } from '../types';
import { fetchCurrentLocationAddress } from '../utils/distance';

export interface ExplodedPartItem {
  partNumber: number;
  partName: string;
  searchKeywords: string;
  category: string;
  sizeOrSpec: string;
  estimatedQty: number;
  shortNote: string;
  box2d: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    cx: number;
    cy: number;
  };
  explodeDirection: {
    dx: number;
    dy: number;
  };
  foundInCatalog: boolean;
  priceOnRequest: boolean;
  matchedProduct: Product | null;
  cutoutUrl?: string;
}

export interface VisualSearchAttachments {
  uploadedImage?: string;
  explodedImage?: string;
  assemblyTitle?: string;
}

interface ImageSearchExplodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings: StoreSettings;
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onAttachVisualSearchImages: (attachments: VisualSearchAttachments) => void;
  onBookingCreated: () => void;
}

interface PlacedExplodedPart extends ExplodedPartItem {
  // Position in % (0..100) on the interactive stage when 100% exploded
  targetX: number;
  targetY: number;
  // Position in % (0..100) on the interactive stage when 0% (assembled on center photo)
  originX: number;
  originY: number;
}

export const ImageSearchExplodeModal: React.FC<ImageSearchExplodeModalProps> = ({
  isOpen,
  onClose,
  storeSettings,
  cartItems,
  onAddToCart,
  onAttachVisualSearchImages,
  onBookingCreated
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [explodedImage, setExplodedImage] = useState<string>('');
  const [assemblyTitle, setAssemblyTitle] = useState<string>('');
  const [assemblySummary, setAssemblySummary] = useState<string>('');
  const [parts, setParts] = useState<ExplodedPartItem[]>([]);
  const [partQtys, setPartQtys] = useState<Record<number, number>>({});

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [explosionFactor, setExplosionFactor] = useState<number>(0); // 0..1 animated smoothly
  const [activePartNum, setActivePartNum] = useState<number | null>(null);
  const [addedPartNums, setAddedPartNums] = useState<Record<number, boolean>>({});
  const [allAddedFeedback, setAllAddedFeedback] = useState(false);

  // WhatsApp direct order state
  const [showWhatsAppPanel, setShowWhatsAppPanel] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('plumber_electrician');
  const [customerName, setCustomerName] = useState('');
  const [plumberPhone, setPlumberPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('LB Nagar Junction, Hyderabad');
  const [notes, setNotes] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<{ bookingId: string; whatsappUrl: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!deliveryAddress || deliveryAddress.includes('LB Nagar')) {
      fetchCurrentLocationAddress()
        .then((loc) => {
          if (loc?.address) setDeliveryAddress(loc.address);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Compute deterministic non-overlapping radial coordinates around the center reference image
  const placedParts: PlacedExplodedPart[] = useMemo(() => {
    if (parts.length === 0) return [];

    // Sort by angle from image center so leader lines never cross awkwardly
    const withAngles = parts.map((p) => {
      const ang = Math.atan2(p.box2d.cy - 500, p.box2d.cx - 500);
      return { part: p, ang };
    });
    withAngles.sort((a, b) => a.ang - b.ang);

    const n = withAngles.length;
    const resultMap = new Map<number, PlacedExplodedPart>();

    withAngles.forEach(({ part }, slotIdx) => {
      // Distribute evenly around an ellipse spanning 13%..87% width and 15%..85% height
      const theta = (slotIdx / n) * Math.PI * 2 - Math.PI / 2;
      const rx = n <= 4 ? 33 : n <= 8 ? 37 : 39;
      const ry = n <= 4 ? 32 : n <= 8 ? 36 : 38;
      const targetX = Math.max(12, Math.min(88, 50 + Math.cos(theta) * rx));
      const targetY = Math.max(14, Math.min(86, 50 + Math.sin(theta) * ry));

      // Center preview image sits inside x: 34%..66%, y: 31%..69%
      const originX = 34 + (part.box2d.cx / 1000) * 32;
      const originY = 31 + (part.box2d.cy / 1000) * 38;

      resultMap.set(part.partNumber, {
        ...part,
        targetX,
        targetY,
        originX,
        originY
      });
    });

    return parts.map((p) => resultMap.get(p.partNumber)!);
  }, [parts]);

  // Compress uploaded photo cleanly
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = () => reject(new Error('Failed to decode image'));
        img.src = String(reader.result || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Crop each detected bounding box cleanly & generate the composite annotated Exploded View JPEG
  const buildCutoutsAndCompositeExplodedImage = (
    srcBase64: string,
    title: string,
    rawParts: ExplodedPartItem[]
  ): Promise<{ partsWithCutouts: ExplodedPartItem[]; compositeDataUrl: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const iw = img.width || 800;
        const ih = img.height || 600;

        // 1. Crop individual single-part cutouts
        const partsWithCutouts = rawParts.map((part) => {
          try {
            const pad = 22; // ~2.2% padding for clean framing
            const x1 = Math.max(0, ((part.box2d.xmin - pad) / 1000) * iw);
            const y1 = Math.max(0, ((part.box2d.ymin - pad) / 1000) * ih);
            const x2 = Math.min(iw, ((part.box2d.xmax + pad) / 1000) * iw);
            const y2 = Math.min(ih, ((part.box2d.ymax + pad) / 1000) * ih);
            const sw = Math.max(24, x2 - x1);
            const sh = Math.max(24, y2 - y1);

            const c = document.createElement('canvas');
            const targetSize = 240;
            const scale = Math.min(targetSize / sw, targetSize / sh);
            c.width = Math.max(80, Math.round(sw * scale));
            c.height = Math.max(80, Math.round(sh * scale));
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, c.width, c.height);
              ctx.drawImage(img, x1, y1, sw, sh, 0, 0, c.width, c.height);
              return { ...part, cutoutUrl: c.toDataURL('image/jpeg', 0.85) };
            }
          } catch {
            // fallback to original image if canvas crop fails
          }
          return { ...part, cutoutUrl: srcBase64 };
        });

        // 2. Render composite annotated Exploded View Image (1200x880)
        const W = 1200;
        const H = 880;
        const comp = document.createElement('canvas');
        comp.width = W;
        comp.height = H;
        const ctx = comp.getContext('2d');

        if (!ctx) {
          resolve({ partsWithCutouts, compositeDataUrl: srcBase64 });
          return;
        }

        // Studio slate grid background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < W; gx += 40) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, H);
          ctx.stroke();
        }
        for (let gy = 0; gy < H; gy += 40) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
        }

        // Top technical header bar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, 62);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('MINUTE MATERIALS  •  SEARCH PRODUCT WITH IMAGE  •  ANNOTATED EXPLODED VIEW', 28, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        const safeTitle = (title || 'Exploded Hardware Assembly').slice(0, 68);
        ctx.fillText(safeTitle, 28, 50);

        // Center Original Reference Box
        const refMaxW = 300;
        const refMaxH = 260;
        const refScale = Math.min(refMaxW / iw, refMaxH / ih);
        const rw = Math.round(iw * refScale);
        const rh = Math.round(ih * refScale);
        const rx = Math.round(W / 2 - rw / 2);
        const ry = Math.round((H + 62) / 2 - rh / 2);

        // Soft drop frame around center image
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.fillRect(rx - 10, ry - 10, rw + 20, rh + 34);
        ctx.strokeRect(rx - 10, ry - 10, rw + 20, rh + 34);
        ctx.drawImage(img, rx, ry, rw, rh);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('ORIGINAL UPLOADED PHOTO', rx, ry + rh + 16);

        // Compute radial positions around the center reference
        const sortedByAngle = [...partsWithCutouts]
          .map((p) => ({
            p,
            ang: Math.atan2(p.box2d.cy - 500, p.box2d.cx - 500)
          }))
          .sort((a, b) => a.ang - b.ang);

        const n = Math.max(1, sortedByAngle.length);
        const ringRx = 430;
        const ringRy = 310;
        const centerY = (H + 62) / 2;

        // Draw leader lines first
        sortedByAngle.forEach(({ p }, idx) => {
          const theta = (idx / n) * Math.PI * 2 - Math.PI / 2;
          const cardCx = W / 2 + Math.cos(theta) * ringRx;
          const cardCy = centerY + Math.sin(theta) * ringRy;
          const ox = rx + (p.box2d.cx / 1000) * rw;
          const oy = ry + (p.box2d.cy / 1000) * rh;

          ctx.save();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(cardCx, cardCy);
          ctx.stroke();
          ctx.restore();

          // Anchor dot on original photo
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(ox, oy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Draw exploded cutout cards + annotations
        const drawCardPromises = sortedByAngle.map(({ p }, idx) => {
          return new Promise<void>((done) => {
            const theta = (idx / n) * Math.PI * 2 - Math.PI / 2;
            const cardCx = Math.max(115, Math.min(W - 115, W / 2 + Math.cos(theta) * ringRx));
            const cardCy = Math.max(135, Math.min(H - 65, centerY + Math.sin(theta) * ringRy));
            const cardW = 196;
            const cardH = 104;
            const cx0 = cardCx - cardW / 2;
            const cy0 = cardCy - cardH / 2;

            const renderBox = (cutImg?: HTMLImageElement) => {
              // Card shadow & body
              ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
              ctx.fillRect(cx0 + 3, cy0 + 4, cardW, cardH);

              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = p.matchedProduct ? '#10b981' : '#f59e0b';
              ctx.lineWidth = 2;
              ctx.fillRect(cx0, cy0, cardW, cardH);
              ctx.strokeRect(cx0, cy0, cardW, cardH);

              // Cutout thumb on left
              if (cutImg) {
                ctx.drawImage(cutImg, cx0 + 8, cy0 + 18, 64, 64);
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1;
                ctx.strokeRect(cx0 + 8, cy0 + 18, 64, 64);
              }

              // Part Number badge
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(cx0 + 6, cy0 + 6, 26, 18);
              ctx.fillStyle = '#fbbf24';
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText(`#${p.partNumber}`, cx0 + 10, cy0 + 19);

              // Part Name text (wrapped up to 2 lines)
              ctx.fillStyle = '#0f172a';
              ctx.font = 'bold 11px sans-serif';
              const words = p.partName.split(' ');
              let line1 = '';
              let line2 = '';
              for (const w of words) {
                if ((line1 + ' ' + w).trim().length <= 17) {
                  line1 = (line1 + ' ' + w).trim();
                } else if ((line2 + ' ' + w).trim().length <= 17) {
                  line2 = (line2 + ' ' + w).trim();
                }
              }
              ctx.fillText(line1, cx0 + 80, cy0 + 26);
              if (line2) ctx.fillText(line2, cx0 + 80, cy0 + 40);

              // Size & qty
              ctx.fillStyle = '#64748b';
              ctx.font = '10px sans-serif';
              ctx.fillText(`${p.sizeOrSpec} • Qty ${p.estimatedQty}`.slice(0, 20), cx0 + 80, cy0 + 57);

              // Price or Request for Price pill
              const hasPrice = Boolean(p.matchedProduct && p.matchedProduct.price > 0);
              ctx.fillStyle = hasPrice ? '#ecfdf5' : '#fef3c7';
              ctx.fillRect(cx0 + 80, cy0 + 66, 108, 22);
              ctx.fillStyle = hasPrice ? '#047857' : '#92400e';
              ctx.font = 'bold 10px sans-serif';
              ctx.fillText(
                hasPrice ? `₹${p.matchedProduct!.price.toFixed(2)}` : 'Request for Price',
                cx0 + 86,
                cy0 + 81
              );

              done();
            };

            if (p.cutoutUrl) {
              const cutImg = new Image();
              cutImg.onload = () => renderBox(cutImg);
              cutImg.onerror = () => renderBox();
              cutImg.src = p.cutoutUrl;
            } else {
              renderBox();
            }
          });
        });

        Promise.all(drawCardPromises).then(() => {
          resolve({
            partsWithCutouts,
            compositeDataUrl: comp.toDataURL('image/jpeg', 0.84)
          });
        });
      };
      img.onerror = () => resolve({ partsWithCutouts: rawParts, compositeDataUrl: srcBase64 });
      img.src = srcBase64;
    });
  };

  const runVisualExplosion = async (imgBase64: string) => {
    setIsAnalyzing(true);
    setAnalysisError('');
    setParts([]);
    setExplodedImage('');
    setExplosionFactor(0);
    setActivePartNum(null);
    setAddedPartNums({});
    setAllAddedFeedback(false);
    setOrderSuccess(null);

    try {
      const response = await fetch('/api/search-with-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imgBase64 })
      });
      const data = await response.json();
      if (!response.ok || !data?.result) {
        throw new Error(data?.error || 'Could not detect parts in the uploaded image.');
      }

      const rawTitle = data.result.assemblyTitle || 'Exploded Hardware Assembly';
      const rawSummary = data.result.assemblySummary || '';
      const rawParts: ExplodedPartItem[] = Array.isArray(data.result.explodedParts)
        ? data.result.explodedParts
        : [];

      if (rawParts.length === 0) {
        throw new Error('No distinct parts detected. Please upload a clearer product or installation photo.');
      }

      const { partsWithCutouts, compositeDataUrl } = await buildCutoutsAndCompositeExplodedImage(
        imgBase64,
        rawTitle,
        rawParts
      );

      const initialQtys: Record<number, number> = {};
      partsWithCutouts.forEach((p) => {
        initialQtys[p.partNumber] = Math.max(1, p.estimatedQty || 1);
      });

      setAssemblyTitle(rawTitle);
      setAssemblySummary(rawSummary);
      setParts(partsWithCutouts);
      setPartQtys(initialQtys);
      setExplodedImage(compositeDataUrl);

      // Attach both images into App state so Cart / WhatsApp always carry them
      onAttachVisualSearchImages({
        uploadedImage: imgBase64,
        explodedImage: compositeDataUrl,
        assemblyTitle: rawTitle
      });

      // Smoothly animate explosion 0% -> 100% right after render mounts at origin
      setTimeout(() => {
        setExplosionFactor(1);
      }, 90);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Failed to generate exploded view.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelected = async (file: File | undefined | null) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setUploadedImage(compressed);
      await runVisualExplosion(compressed);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Unable to process image file.');
    }
  };

  const replayAnimation = () => {
    setExplosionFactor(0);
    setTimeout(() => {
      setExplosionFactor(1);
    }, 120);
  };

  const buildCartProductForPart = (part: ExplodedPartItem): Product => {
    if (part.matchedProduct && part.matchedProduct.price > 0) {
      return part.matchedProduct;
    }
    const slug = part.partName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28);
    return {
      id: `rfp-${slug || 'part'}-${part.partNumber}`,
      name: `${part.partName}${part.sizeOrSpec && part.sizeOrSpec !== 'Standard' ? ` (${part.sizeOrSpec})` : ''}`,
      category: part.category || 'hardware',
      subcategory: 'Request for Price',
      price: 0,
      priceOnRequest: true,
      unit: 'piece',
      brand: 'Custom / Unlisted',
      fastDelivery: true,
      stockStatus: 'in_stock',
      stockCount: 99,
      sku: `RFP-${String(part.partNumber).padStart(3, '0')}`,
      description: part.shortNote || `Exploded part from ${assemblyTitle || 'uploaded photo'} — Price on request.`,
      image: part.cutoutUrl || uploadedImage
    };
  };

  const handleAddSinglePartToCart = (part: ExplodedPartItem) => {
    const qty = Math.max(1, partQtys[part.partNumber] || 1);
    const prod = buildCartProductForPart(part);
    onAddToCart(prod, qty);
    onAttachVisualSearchImages({
      uploadedImage,
      explodedImage,
      assemblyTitle
    });
    setAddedPartNums((prev) => ({ ...prev, [part.partNumber]: true }));
  };

  const handleAddAllPartsToCart = () => {
    parts.forEach((part) => {
      const qty = Math.max(1, partQtys[part.partNumber] || 1);
      onAddToCart(buildCartProductForPart(part), qty);
    });
    onAttachVisualSearchImages({
      uploadedImage,
      explodedImage,
      assemblyTitle
    });
    const nextFlags: Record<number, boolean> = {};
    parts.forEach((p) => {
      nextFlags[p.partNumber] = true;
    });
    setAddedPartNums(nextFlags);
    setAllAddedFeedback(true);
    setTimeout(() => setAllAddedFeedback(false), 2600);
  };

  const handleFetchLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await fetchCurrentLocationAddress();
      if (loc?.address) setDeliveryAddress(loc.address);
    } catch {
      // keep existing
    } finally {
      setIsLocating(false);
    }
  };

  const handleSendWhatsAppOrder = async () => {
    setOrderError('');
    if (!customerName.trim()) {
      setOrderError('Please enter your name.');
      return;
    }
    const digits = plumberPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setOrderError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setOrderError('Please enter the delivery / jobsite address.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const bookingItems = parts.map((p) => {
        const qty = Math.max(1, partQtys[p.partNumber] || 1);
        const unitPrice = p.matchedProduct && p.matchedProduct.price > 0 ? p.matchedProduct.price : 0;
        return {
          id: p.matchedProduct?.id || `rfp-${p.partNumber}`,
          name: `${p.partName}${p.sizeOrSpec && p.sizeOrSpec !== 'Standard' ? ` (${p.sizeOrSpec})` : ''}`,
          price: unitPrice,
          quantity: qty,
          category: p.category || 'hardware',
          unit: p.matchedProduct?.unit || 'piece',
          priceOnRequest: unitPrice <= 0
        };
      });

      const knownSubtotal = bookingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Persist booking with BOTH Uploaded Image & Exploded Annotated Image first
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingType: 'image_search',
          customerName: customerName.trim(),
          userRole,
          plumberPhone: plumberPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          items: bookingItems,
          imageBase64: uploadedImage,
          explodedImageBase64: explodedImage,
          geminiAnalysis: {
            detectedItems: parts.map((p) => ({
              slNo: p.partNumber,
              item: p.partName,
              size: p.sizeOrSpec,
              quantity: Math.max(1, partQtys[p.partNumber] || 1),
              name: p.partName,
              estimatedQty: Math.max(1, partQtys[p.partNumber] || 1),
              estimatedUnitPrice: p.matchedProduct?.price || 0,
              matchedProductId: p.matchedProduct?.id,
              priceOnRequest: !p.matchedProduct || p.matchedProduct.price <= 0
            })),
            totalEstimatedCost: knownSubtotal,
            rawNotes: `Exploded Visual Search: ${assemblyTitle}`
          },
          notes: notes.trim() || `Search Product With Image: ${assemblyTitle}`,
          subtotal: knownSubtotal,
          totalPrice: knownSubtotal,
          paymentMethod: 'whatsapp_order',
          paymentStatus: 'pending'
        })
      });

      const data = await res.json();
      if (!res.ok || !data?.booking?.id) {
        throw new Error(data?.error || 'Failed to save visual search order.');
      }

      const bookingId = data.booking.id;
      const origin = window.location.origin;
      const uploadedPhotoUrl = `${origin}/api/bookings/${bookingId}/image`;
      const explodedPhotoUrl = `${origin}/api/bookings/${bookingId}/exploded-image`;

      const linesText = bookingItems
        .map((it, idx) => {
          const priceLabel = it.priceOnRequest
            ? 'Request for Price'
            : `₹${it.price.toFixed(2)}/${it.unit} (Subtotal ₹${(it.price * it.quantity).toFixed(2)})`;
          return `${idx + 1}. *${it.name}*\n   Qty: ${it.quantity} ${it.unit} | ${priceLabel}`;
        })
        .join('\n\n');

      const requestPriceCount = bookingItems.filter((i) => i.priceOnRequest).length;

      const whatsappMessage = `⚡ *MINUTE MATERIALS - SEARCH PRODUCT WITH IMAGE ORDER*
----------------------------------------
🆔 *Order Ref:* ${bookingId}
🧩 *Assembly:* ${assemblyTitle || 'Exploded Hardware Assembly'}
👤 *Name:* ${customerName.trim()} (${userRole === 'plumber_electrician' ? 'Plumber / Electrician' : 'Customer'})
📞 *Phone:* ${plumberPhone.trim()}
📍 *Delivery Address:* ${deliveryAddress.trim()}

📋 *ANNOTATED EXPLODED PARTS (${bookingItems.length} parts):*
${linesText}

💰 *Catalog Items Subtotal:* ₹${knownSubtotal.toFixed(2)}${
        requestPriceCount > 0
          ? `\n📝 *Quote Requested:* ${requestPriceCount} unlisted part(s) marked "Request for Price"`
          : ''
      }

🖼️ *ATTACHED IMAGES (BOTH UPLOADED & EXPLODED):*
1️⃣ *Uploaded Photo:* ${uploadedPhotoUrl}
2️⃣ *Exploded Annotated Diagram:* ${explodedPhotoUrl}
${notes.trim() ? `\n🗒️ *Notes:* ${notes.trim()}` : ''}
----------------------------------------
Please share price for quote items & confirm express dispatch!`;

      const cleanTarget = (storeSettings.whatsappNumber || '8332869926').replace(/\D/g, '');
      const phoneWithCc = cleanTarget.length === 10 ? `91${cleanTarget}` : cleanTarget;
      const whatsappUrl = `https://wa.me/${phoneWithCc}?text=${encodeURIComponent(whatsappMessage)}`;

      // Also save formatted WhatsApp text on booking notes/message
      fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: whatsappMessage })
      }).catch(() => {});

      onBookingCreated();
      setOrderSuccess({ bookingId, whatsappUrl });
      window.open(whatsappUrl, '_blank');
    } catch (err: any) {
      setOrderError(err?.message || 'Failed to place WhatsApp order.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (!isOpen) return null;

  const catalogMatchedCount = parts.filter((p) => p.matchedProduct && p.matchedProduct.price > 0).length;
  const rfpCount = parts.length - catalogMatchedCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 flex items-start sm:items-center justify-center min-h-screen">
      <div className="animate-modal-enter bg-white border border-slate-200 rounded-2xl max-w-6xl w-full text-slate-900 shadow-2xl relative my-auto max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest block">
                Visual Part Explorer &amp; Exploded Diagram
              </span>
              <h2 className="text-base sm:text-xl font-black text-slate-900 truncate">
                Search product with image
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {uploadedImage && !isAnalyzing && (
              <button
                type="button"
                onClick={() => {
                  setUploadedImage('');
                  setExplodedImage('');
                  setParts([]);
                  setAnalysisError('');
                  setShowWhatsAppPanel(false);
                  setOrderSuccess(null);
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> New Photo
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 bg-slate-200/70 hover:bg-slate-200 p-1.5 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* STEP 1: Upload Zone */}
          {!uploadedImage && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelected(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/80 rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
              />
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-amber-200 shadow-sm flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300 mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
                Upload any Plumbing, Sanitaryware or Electrical Photo
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mb-5 leading-relaxed">
                We automatically create an <strong className="text-slate-900">animated exploded view</strong>, annotate every single part, match prices directly from our catalog, and mark unlisted items as <strong className="text-amber-700">Request for Price</strong>.
              </p>
              <span className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow transition">
                <Sparkles className="w-4 h-4" /> Choose or Drop Product Image
              </span>
            </div>
          )}

          {/* STEP 2: Scanning / Loading */}
          {uploadedImage && isAnalyzing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center py-4">
              <div className="relative rounded-2xl overflow-hidden border border-amber-300 bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-lg">
                <img
                  src={uploadedImage}
                  alt="Scanning assembly"
                  className="max-h-full max-w-full object-contain opacity-85"
                />
                <div className="absolute left-0 right-0 h-1 bg-amber-400 shadow-[0_0_16px_4px_rgba(251,191,36,0.75)] animate-scan-line" />
              </div>
              <div className="space-y-4 p-2">
                <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-extrabold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Decomposing Assembly &amp; Matching Catalog...
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Building Annotated Exploded View
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Detecting individual components, isolating cutouts, checking live catalog SKUs &amp; prices, and preparing exploded leader-line annotations.
                </p>
                <div className="space-y-2 pt-2">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-11 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {analysisError && !isAnalyzing && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-rose-800">{analysisError}</p>
                <p className="text-xs text-rose-600 mt-0.5">Try uploading a clearer image with visible components.</p>
              </div>
              <button
                type="button"
                onClick={() => uploadedImage && runVisualExplosion(uploadedImage)}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-4 py-2 rounded-lg shrink-0 transition"
              >
                Retry Analysis
              </button>
            </div>
          )}

          {/* STEP 3: Interactive Exploded View + Annotated Parts Catalog */}
          {!isAnalyzing && parts.length > 0 && (
            <div className="space-y-5">
              {/* Top Assembly Info + Controls Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">{assemblyTitle}</h3>
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                      {parts.length} Exploded Parts
                    </span>
                    {catalogMatchedCount > 0 && (
                      <span className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        {catalogMatchedCount} Priced in Catalog
                      </span>
                    )}
                    {rfpCount > 0 && (
                      <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        {rfpCount} Request for Price
                      </span>
                    )}
                  </div>
                  {assemblySummary && (
                    <p className="text-xs text-slate-600 mt-1">{assemblySummary}</p>
                  )}
                </div>

                {/* Smooth Explosion Slider & Replay Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-bold text-slate-700">Explode</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(explosionFactor * 100)}
                      onChange={(e) => setExplosionFactor(Number(e.target.value) / 100)}
                      className="w-20 sm:w-24 accent-amber-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono font-black text-amber-700 w-9 text-right">
                      {Math.round(explosionFactor * 100)}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExplosionFactor(explosionFactor > 0.5 ? 0 : 1)}
                    className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl transition"
                  >
                    {explosionFactor > 0.5 ? 'Assemble' : 'Explode'}
                  </button>

                  <button
                    type="button"
                    onClick={replayAnimation}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 transition shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Replay
                  </button>
                </div>
              </div>

              {/* Dual-Column Workspace: Left = Animated Exploded Stage, Right = Annotated Parts & Cart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT: Interactive Animated Exploded Diagram Viewport */}
                <div className="lg:col-span-7 space-y-3">
                  <div
                    className="relative w-full h-[460px] sm:h-[540px] rounded-2xl border border-slate-200 overflow-hidden shadow-inner select-none"
                    style={{
                      backgroundColor: '#f8fafc',
                      backgroundImage:
                        'linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)',
                      backgroundSize: '28px 28px'
                    }}
                  >
                    {/* Center Reference Image (Smoothly ghosts back as parts explode outward) */}
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[34%] h-[38%] rounded-xl border-2 bg-white shadow-md overflow-hidden flex items-center justify-center pointer-events-none"
                      style={{
                        borderColor: explosionFactor > 0.4 ? 'rgba(245,158,11,0.45)' : 'rgba(15,23,42,0.2)',
                        opacity: 1 - explosionFactor * 0.62,
                        transform: `translate(-50%, -50%) scale(${1 - explosionFactor * 0.14})`,
                        transition: 'all 680ms cubic-bezier(0.22, 1, 0.36, 1)'
                      }}
                    >
                      <img
                        src={uploadedImage}
                        alt="Original uploaded reference"
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                        Original Reference
                      </span>
                    </div>

                    {/* SVG Leader Lines connecting original coordinates -> exploded nodes */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {placedParts.map((part) => {
                        const curX = part.originX + (part.targetX - part.originX) * explosionFactor;
                        const curY = part.originY + (part.targetY - part.originY) * explosionFactor;
                        const isActive = activePartNum === part.partNumber;
                        return (
                          <g key={`line-${part.partNumber}`}>
                            <line
                              x1={part.originX}
                              y1={part.originY}
                              x2={curX}
                              y2={curY}
                              stroke={isActive ? '#d97706' : part.matchedProduct ? '#10b981' : '#f59e0b'}
                              strokeWidth={isActive ? '0.6' : '0.35'}
                              strokeDasharray="1.4 1"
                              className="animate-dash-flow"
                              style={{
                                opacity: Math.min(1, explosionFactor * 1.35),
                                transition: 'all 720ms cubic-bezier(0.22, 1, 0.36, 1)'
                              }}
                            />
                            <circle
                              cx={part.originX}
                              cy={part.originY}
                              r={isActive ? '0.9' : '0.6'}
                              fill="#f59e0b"
                              style={{ opacity: Math.min(1, explosionFactor * 1.4) }}
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Animated Floating Cropped Part Cutouts + Full Name Annotations */}
                    {placedParts.map((part, idx) => {
                      const curX = part.originX + (part.targetX - part.originX) * explosionFactor;
                      const curY = part.originY + (part.targetY - part.originY) * explosionFactor;
                      const isActive = activePartNum === part.partNumber;
                      const hasPrice = Boolean(part.matchedProduct && part.matchedProduct.price > 0);

                      return (
                        <button
                          key={part.partNumber}
                          type="button"
                          onMouseEnter={() => setActivePartNum(part.partNumber)}
                          onMouseLeave={() => setActivePartNum(null)}
                          onClick={() => setActivePartNum(part.partNumber)}
                          style={{
                            left: `${curX}%`,
                            top: `${curY}%`,
                            transform: `translate3d(-50%, -50%, 0) scale(${
                              isActive ? 1.09 : explosionFactor > 0.2 ? 1 : 0.72
                            })`,
                            transitionProperty: 'left, top, transform, box-shadow, border-color',
                            transitionDuration: '740ms',
                            transitionDelay: `${idx * 45}ms`,
                            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                            zIndex: isActive ? 30 : 10 + idx
                          }}
                          className={`absolute bg-white/95 backdrop-blur-xs rounded-xl p-1.5 border-2 shadow-md text-left w-[112px] sm:w-[134px] cursor-pointer ${
                            isActive
                              ? 'border-amber-500 ring-4 ring-amber-400/25 shadow-xl'
                              : hasPrice
                              ? 'border-emerald-400/80 hover:border-emerald-500'
                              : 'border-amber-300 hover:border-amber-500'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-900 text-amber-400 text-[9px] font-black w-4 h-4 rounded-md flex items-center justify-center shrink-0">
                              {part.partNumber}
                            </span>
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                              <img
                                src={part.cutoutUrl || uploadedImage}
                                alt={part.partName}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span
                                className={`text-[9px] font-extrabold px-1 py-0.5 rounded block truncate ${
                                  hasPrice
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-800'
                                }`}
                              >
                                {hasPrice
                                  ? `₹${part.matchedProduct!.price.toFixed(0)}`
                                  : 'Req. Price'}
                              </span>
                            </div>
                          </div>
                          {/* Clear Part Name Annotation */}
                          <p className="mt-1 text-[10px] font-extrabold text-slate-900 leading-tight line-clamp-2">
                            {part.partName}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Both Images Verification Strip (Uploaded + Generated Exploded Diagram) */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg p-2">
                      <img
                        src={uploadedImage}
                        alt="Uploaded original"
                        className="w-14 h-14 object-cover rounded-md border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-slate-900 uppercase block">
                          1. Uploaded Image
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready for WhatsApp
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg p-2">
                      {explodedImage ? (
                        <img
                          src={explodedImage}
                          alt="Annotated exploded view"
                          className="w-14 h-14 object-cover rounded-md border border-amber-300 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-amber-50 rounded-md flex items-center justify-center shrink-0">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-amber-800 uppercase block">
                          2. Exploded Annotated
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Both Sent on WhatsApp
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Annotated Parts List + Add To Cart (Price vs Request for Price) */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-slate-900">
                      Annotated Parts ({parts.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddAllPartsToCart}
                      className={`text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-xs ${
                        allAddedFeedback
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      {allAddedFeedback ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added All to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" /> Add All to Cart
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
                    {parts.map((part) => {
                      const hasCatalogMatch = Boolean(part.matchedProduct && part.matchedProduct.price > 0);
                      const qty = Math.max(1, partQtys[part.partNumber] || 1);
                      const isAdded = Boolean(addedPartNums[part.partNumber]);
                      const isHighlighted = activePartNum === part.partNumber;
                      const prodId = hasCatalogMatch
                        ? part.matchedProduct!.id
                        : `rfp-${part.partName
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '')
                            .slice(0, 28) || 'part'}-${part.partNumber}`;
                      const inCartCount = cartItems
                        .filter((c) => c.product.id === prodId)
                        .reduce((s, c) => s + c.quantity, 0);

                      return (
                        <div
                          key={part.partNumber}
                          onMouseEnter={() => setActivePartNum(part.partNumber)}
                          onMouseLeave={() => setActivePartNum(null)}
                          className={`rounded-xl border p-3 transition-all duration-200 ${
                            isHighlighted
                              ? 'border-amber-500 bg-amber-50/40 shadow-md'
                              : hasCatalogMatch
                              ? 'border-slate-200 bg-white hover:border-emerald-300'
                              : 'border-amber-200 bg-amber-50/20 hover:border-amber-400'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="bg-slate-900 text-amber-400 text-[11px] font-black w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                              {part.partNumber}
                            </span>

                            <img
                              src={
                                hasCatalogMatch && part.matchedProduct?.image
                                  ? part.matchedProduct.image
                                  : part.cutoutUrl || uploadedImage
                              }
                              alt={part.partName}
                              className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 shrink-0 p-0.5"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="text-xs font-extrabold text-slate-900 leading-snug">
                                  {part.partName}
                                </h5>
                                {hasCatalogMatch ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
                                    <Tag className="w-2.5 h-2.5" /> In Catalog
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
                                    <HelpCircle className="w-2.5 h-2.5" /> Not Listed
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {part.sizeOrSpec}
                                {part.shortNote ? ` • ${part.shortNote}` : ''}
                              </p>

                              {hasCatalogMatch && part.matchedProduct ? (
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-mono font-black text-emerald-700">
                                    ₹{part.matchedProduct.price.toFixed(2)}
                                    <span className="text-[10px] font-normal text-slate-500">
                                      /{part.matchedProduct.unit || 'pc'}
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 truncate">
                                    SKU: {part.matchedProduct.sku}
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-1">
                                  <span className="text-[11px] font-bold text-amber-800">
                                    Price: Request for Price (Quote on Cart / WhatsApp)
                                  </span>
                                </div>
                              )}

                              {/* Qty & Add To Cart Row */}
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPartQtys((prev) => ({
                                        ...prev,
                                        [part.partNumber]: Math.max(1, (prev[part.partNumber] || 1) - 1)
                                      }))
                                    }
                                    className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-l-lg"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-xs font-mono font-bold text-slate-900">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPartQtys((prev) => ({
                                        ...prev,
                                        [part.partNumber]: (prev[part.partNumber] || 1) + 1
                                      }))
                                    }
                                    className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-r-lg"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddSinglePartToCart(part)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition active:scale-95 ${
                                    isAdded || inCartCount > 0
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                      : hasCatalogMatch
                                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                      : 'bg-slate-900 hover:bg-slate-800 text-amber-400'
                                  }`}
                                >
                                  {isAdded || inCartCount > 0 ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      {hasCatalogMatch
                                        ? `In Cart (${inCartCount || qty})`
                                        : `Added for Price (${inCartCount || qty})`}
                                    </>
                                  ) : hasCatalogMatch ? (
                                    <>
                                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart className="w-3.5 h-3.5" /> Request for Price
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Direct WhatsApp Order Trigger (Sends BOTH Uploaded & Exploded Images) */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-emerald-900 block">
                          Order All Exploded Parts on WhatsApp
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Sends BOTH Original Uploaded Photo + Exploded Annotated Diagram
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWhatsAppPanel((v) => !v)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {showWhatsAppPanel ? 'Hide Form' : 'WhatsApp Order'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 4: Expandable Direct WhatsApp Order Form (Sending BOTH Images) */}
              {showWhatsAppPanel && (
                <div className="bg-slate-50 border border-emerald-300 rounded-2xl p-4 sm:p-5 space-y-4 animate-modal-enter">
                  {orderSuccess ? (
                    <div className="bg-white border border-emerald-200 rounded-xl p-5 text-center space-y-3">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                      <h4 className="text-lg font-black text-slate-900">
                        Order {orderSuccess.bookingId} Saved with Both Images!
                      </h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto">
                        Your WhatsApp message includes links to both your <strong>Uploaded Photo</strong> and the <strong>Annotated Exploded Diagram</strong>, plus all priced &amp; Request-for-Price parts.
                      </p>
                      <div className="flex flex-wrap justify-center gap-3 pt-1">
                        <a
                          href={orderSuccess.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition"
                        >
                          <Send className="w-4 h-4" /> Open WhatsApp Message <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900">
                          Send Visual Search Order via WhatsApp (With Uploaded &amp; Exploded Images)
                        </h4>
                      </div>

                      {orderError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-lg">
                          {orderError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setUserRole('plumber_electrician')}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition ${
                                userRole === 'plumber_electrician'
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-white text-slate-700 border-slate-300'
                              }`}
                            >
                              <Wrench className="w-3 h-3" /> Trade
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserRole('customer')}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition ${
                                userRole === 'customer'
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-white text-slate-700 border-slate-300'
                              }`}
                            >
                              <User className="w-3 h-3" /> Customer
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="e.g. Vinnu Contractor"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Mobile Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={plumberPhone}
                            onChange={(e) => setPlumberPhone(e.target.value)}
                            placeholder="10-digit mobile"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-700">
                              Delivery Address <span className="text-rose-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleFetchLocation}
                              disabled={isLocating}
                              className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1"
                            >
                              <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                              {isLocating ? 'Locating...' : 'Use GPS'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Additional Notes (Optional)
                          </label>
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Preferred brand / urgency..."
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSendWhatsAppOrder}
                          disabled={isSubmittingOrder}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition"
                        >
                          {isSubmittingOrder ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Saving Both Images &amp; Opening WhatsApp...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" /> Confirm &amp; Send Both Images via WhatsApp
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
