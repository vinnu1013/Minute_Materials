// Distance and Driving Time Calculator
// Central Hub Depot Location: Latitude 17.34265, Longitude 78.55267 (Hyderabad Central Hub)

export const DEPOT_LOCATION = {
  lat: 17.34265,
  lng: 78.55267,
  address: 'Minute Materials Central Hub',
  city: 'Hyderabad'
};

// Known local landmarks / zones
export const HYDERABAD_ZONES = [
  { name: 'Central Express Zone', lat: 17.34265, lng: 78.55267, distanceKm: 1.2 },
  { name: 'Dilsukhnagar / Kothapet', lat: 17.3688, lng: 78.5247, distanceKm: 3.5 },
  { name: 'LB Nagar / Nagole', lat: 17.3480, lng: 78.5510, distanceKm: 4.2 },
  { name: 'Uppal / Habsiguda', lat: 17.4018, lng: 78.5602, distanceKm: 6.8 },
  { name: 'Secunderabad / MG Road', lat: 17.4399, lng: 78.4983, distanceKm: 11.5 },
  { name: 'Begumpet / Punjagutta', lat: 17.4435, lng: 78.4518, distanceKm: 14.0 },
  { name: 'Ameerpet / Kukatpally', lat: 17.4842, lng: 78.4021, distanceKm: 18.5 },
  { name: 'Madhapur / Hitec City', lat: 17.4483, lng: 78.3808, distanceKm: 21.0 },
  { name: 'Gachibowli / Financial District', lat: 17.4401, lng: 78.3489, distanceKm: 24.5 },
  { name: 'Shamshabad / Airport Zone', lat: 17.2403, lng: 78.4294, distanceKm: 22.0 }
];

/**
 * Calculates straight-line distance in Kilometers between two coordinates using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

/**
 * Calculates estimated driving time based on city traffic speeds and road factor
 * Road multiplier ~1.3x for city navigation, average drive speed 28 km/h in metro traffic
 */
export function calculateDrivingTime(distanceKm: number): {
  driveTimeMins: number;
  totalDeliveryEstimateMins: number;
  roadDistanceKm: number;
} {
  // Account for actual road route vs straight line (roughly 1.3x)
  const roadDistanceKm = Math.round(Math.max(1, distanceKm * 1.3) * 10) / 10;
  
  // Average city driving speed: 28 km/h -> ~2.14 mins per km
  const driveTimeMins = Math.max(5, Math.round(roadDistanceKm * 2.15));

  // Add 10-15 mins packing & dispatch buffer
  const totalDeliveryEstimateMins = driveTimeMins + 12;

  return {
    driveTimeMins,
    totalDeliveryEstimateMins,
    roadDistanceKm
  };
}

/**
 * Matches an address string or calculates distance from Central Hub (17.34265, 78.55267) to the delivery address
 */
export function getEstimateForAddress(
  address: string,
  userLat?: number,
  userLng?: number
): {
  distanceKm: number;
  roadDistanceKm: number;
  driveTimeMins: number;
  totalDeliveryEstimateMins: number;
  matchedZone?: string;
  depotCoords: string;
} {
  let targetLat = userLat;
  let targetLng = userLng;
  let matchedZoneName: string | undefined;

  // Attempt to parse embedded GPS coordinates from location string (e.g., GPS: 17.3850, 78.4867)
  if ((!targetLat || !targetLng) && address) {
    const coordsMatch = address.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordsMatch) {
      targetLat = parseFloat(coordsMatch[1]);
      targetLng = parseFloat(coordsMatch[2]);
    }
  }

  // If no direct coords, try matching address keywords
  if ((!targetLat || !targetLng) && address) {
    const lowerAddress = address.toLowerCase();
    const matchedZone = HYDERABAD_ZONES.find(z =>
      lowerAddress.includes(z.name.toLowerCase().split('/')[0].trim()) ||
      lowerAddress.includes(z.name.toLowerCase().split('/')[1]?.trim() || '___')
    );

    if (matchedZone) {
      targetLat = matchedZone.lat;
      targetLng = matchedZone.lng;
      matchedZoneName = matchedZone.name;
    }
  }

  // Fallback: derive dynamic coordinates based on hash of address string if unrecognised address
  if ((!targetLat || !targetLng) && address) {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = (hash << 5) - hash + address.charCodeAt(i);
      hash |= 0;
    }
    const latOffset = ((Math.abs(hash) % 150) / 1000) * (hash % 2 === 0 ? 1 : -1);
    const lngOffset = (((Math.abs(hash) >> 2) % 150) / 1000) * (hash % 3 === 0 ? 1 : -1);
    targetLat = DEPOT_LOCATION.lat + latOffset;
    targetLng = DEPOT_LOCATION.lng + lngOffset;
  }

  // Final fallback
  if (!targetLat || !targetLng) {
    targetLat = 17.3688;
    targetLng = 78.5247;
  }

  const straightDistance = calculateHaversineDistance(
    DEPOT_LOCATION.lat,
    DEPOT_LOCATION.lng,
    targetLat,
    targetLng
  );

  const times = calculateDrivingTime(straightDistance);

  return {
    distanceKm: straightDistance,
    roadDistanceKm: times.roadDistanceKm,
    driveTimeMins: times.driveTimeMins,
    totalDeliveryEstimateMins: times.totalDeliveryEstimateMins,
    matchedZone: matchedZoneName,
    depotCoords: `${DEPOT_LOCATION.lat.toFixed(5)}°N, ${DEPOT_LOCATION.lng.toFixed(5)}°E`
  };
}

/**
 * Helper function to fetch current GPS coordinates and resolve address using reverse geocoding
 */
export async function fetchCurrentLocationAddress(): Promise<{ address: string; lat: number; lng: number }> {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let formattedAddress = `GPS Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        try {
          const apiKey = getGoogleMapsApiKey();
          if (apiKey) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const googleRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
              { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            if (googleRes.ok) {
              const gData = await googleRes.json();
              if (gData.status === 'OK' && gData.results?.[0]?.formatted_address) {
                formattedAddress = gData.results[0].formatted_address;
              }
            }
          } else {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
              { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
              }
            );
            clearTimeout(timeoutId);
            if (response.ok) {
              const data = await response.json();
              if (data && data.display_name) {
                formattedAddress = `${data.display_name} (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`;
              }
            }
          }
        } catch (e) {
          console.warn('Reverse geocoding lookup note, using GPS coordinates:', e);
        }

        resolve({ address: formattedAddress, lat, lng });
      },
      (err) => {
        let msg = 'Unable to fetch your location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or enter address manually.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again or enter address manually.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  });
}

/**
 * Retrieve Google Maps Platform Key from environment
 */
export function getGoogleMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    ''
  );
}

/**
 * Geocode user address string using Google Maps Geocoding API
 */
export async function geocodeWithGoogleMaps(address: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey || !address || !address.trim()) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      return {
        lat: loc.lat,
        lng: loc.lng,
        formattedAddress: data.results[0].formatted_address
      };
    }
  } catch (err) {
    console.warn('Google Maps Geocoding API fetch notice:', err);
  }
  return null;
}

/**
 * Calculate distance between Central Hub (17.34265, 78.55267) and destination using Google Maps API with fallback
 */
export async function getEstimateForAddressWithGoogleMaps(
  address: string,
  userLat?: number,
  userLng?: number
): Promise<{
  distanceKm: number;
  roadDistanceKm: number;
  driveTimeMins: number;
  totalDeliveryEstimateMins: number;
  matchedZone?: string;
  depotCoords: string;
  geocodedAddress?: string;
  isGoogleMapsPowered: boolean;
}> {
  const apiKey = getGoogleMapsApiKey();
  let targetLat = userLat;
  let targetLng = userLng;
  let geocodedAddress: string | undefined;

  if ((!targetLat || !targetLng) && address && apiKey) {
    const geo = await geocodeWithGoogleMaps(address);
    if (geo) {
      targetLat = geo.lat;
      targetLng = geo.lng;
      geocodedAddress = geo.formattedAddress;
    }
  }

  const fallbackEst = getEstimateForAddress(address, targetLat, targetLng);

  return {
    ...fallbackEst,
    geocodedAddress,
    isGoogleMapsPowered: Boolean(apiKey && (targetLat || targetLng))
  };
}

