import { StoreSettings } from '../types';

/**
 * ============================================================================
 * 1. STORE SETTINGS, FEES, UPI, NUMBERS & ADMIN PIN
 * ============================================================================
 * Edit any value below and save this file — the live store automatically
 * detects your code changes and updates immediately.
 */
export const ADMIN_STORE_SETTINGS: StoreSettings = {
  // Store Identity & Contact Numbers
  storeName: 'Minute Materials',
  helplineNumber: '8332869926',
  whatsappNumber: '8332869926',

  // Delivery & Checkout Charges (in ₹)
  minOrderFreeDelivery: 499, // Orders >= ₹499 get FREE delivery
  deliveryFeeExpress: 15,    // Express 15–30 min delivery fee
  deliveryFeeStandard: 5,    // Standard delivery fee
  platformFee: 7,            // Platform fee per order
  handlingFee: 10,           // Handling & packing fee
  gstPercentage: 0,          // GST % added at checkout (0 = prices inclusive)

  // UPI Payment Details
  upiId: 'mr.vinnu10@okicici',
  accountHolderName: 'THappetla Vinay Kumar',

  // Top Announcement Banner Text
  activeDeliveryNotice:
    '🚚 FREE Express Delivery on Orders ₹499+ | Minute Materials LB Nagar & Vanasthalipuram | Call/WhatsApp: 8332869926',

  // Admin Panel Login PIN
  adminPin: '9059236500',

  // Main Hub Location & GPS Coordinates (for live distance calculation)
  depotLat: 17.343629,
  depotLng: 78.554161,
  depotAddress: 'Minute Materials Express Hub',
};
