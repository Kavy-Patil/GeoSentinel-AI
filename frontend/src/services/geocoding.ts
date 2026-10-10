/**
 * Location geocoding service for GeoSentinel AI.
 * Uses OpenStreetMap Nominatim with rate-limiting and offline preset fallback.
 */

import { GeocodingResult } from '../types/geography';
import { parseCoordinateString, formatCoordinates } from '../utils/geodesic';

// Common global presets for instant offline search & quick selection
export const PRESET_LOCATIONS: GeocodingResult[] = [
  {
    placeId: 'preset-beirut',
    name: 'Beirut',
    displayName: 'Beirut, Mount Lebanon Governorate, Lebanon',
    lat: 33.8856,
    lon: 35.5410,
    type: 'city',
    category: 'OSCD Sentinel-2 Benchmark Zone',
  },
  {
    placeId: 'preset-delhi',
    name: 'Delhi NCR',
    displayName: 'Delhi National Capital Region, India',
    lat: 28.4026,
    lon: 77.1844,
    type: 'city',
    category: 'High-Res GeoTIFF Urban Zone',
  },
  {
    placeId: 'preset-valencia',
    name: 'Valencia',
    displayName: 'Valencia, Valencian Community, Spain',
    lat: 39.4699,
    lon: -0.3763,
    type: 'city',
    category: 'OSCD Sentinel-2 Benchmark Zone',
  },
  {
    placeId: 'preset-las-vegas',
    name: 'Las Vegas',
    displayName: 'Las Vegas, Clark County, Nevada, United States',
    lat: 36.1699,
    lon: -115.1398,
    type: 'city',
    category: 'OSCD Sentinel-2 Benchmark Zone',
  },
  {
    placeId: 'preset-tokyo',
    name: 'Tokyo',
    displayName: 'Tokyo, Kantō Region, Japan',
    lat: 35.6762,
    lon: 139.6503,
    type: 'city',
    category: 'Metropolitan Earth Observation',
  },
  {
    placeId: 'preset-cairo',
    name: 'Cairo',
    displayName: 'Cairo, Cairo Governorate, Egypt',
    lat: 30.0444,
    lon: 31.2357,
    type: 'city',
    category: 'Urban Encroachment & Desert Frontier',
  },
  {
    placeId: 'preset-sydney',
    name: 'Sydney',
    displayName: 'Sydney, New South Wales, Australia',
    lat: -33.8688,
    lon: 151.2093,
    type: 'city',
    category: 'Coastal Urban & Forest Margin',
  },
  {
    placeId: 'preset-paris',
    name: 'Paris',
    displayName: 'Paris, Île-de-France, France',
    lat: 48.8566,
    lon: 2.3522,
    type: 'city',
    category: 'European Urban Core',
  },
  {
    placeId: 'preset-nyc',
    name: 'New York',
    displayName: 'New York City, New York, United States',
    lat: 40.7128,
    lon: -74.0060,
    type: 'city',
    category: 'Coastal Infrastructure & Harbor Zone',
  },
  {
    placeId: 'preset-san-francisco',
    name: 'San Francisco',
    displayName: 'San Francisco, California, United States',
    lat: 37.7749,
    lon: -122.4194,
    type: 'city',
    category: 'Bay Area Earth Observation',
  },
];

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000; // Respect Nominatim 1-request-per-second policy

/**
 * Searches for a location by text query or coordinate input.
 */
export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // 1. Check if direct coordinates were entered (instant offline resolution)
  const coords = parseCoordinateString(trimmed);
  if (coords) {
    return [
      {
        placeId: `coords-${coords.lat.toFixed(4)}-${coords.lon.toFixed(4)}`,
        name: formatCoordinates(coords.lat, coords.lon),
        displayName: `Direct Coordinates: Lat ${coords.lat.toFixed(4)}°, Lon ${coords.lon.toFixed(4)}°`,
        lat: coords.lat,
        lon: coords.lon,
        type: 'coordinate_pin',
        category: 'Direct Coordinate Input',
      },
    ];
  }

  // 2. Check local preset matches first for instant search response
  const lower = trimmed.toLowerCase();
  const matchedPresets = PRESET_LOCATIONS.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.displayName.toLowerCase().includes(lower)
  );

  // 3. Throttle Nominatim API request
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLast));
  }
  lastRequestTime = Date.now();

  try {
    const encoded = encodeURIComponent(trimmed);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=5&addressdetails=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GeoSentinel-AI-Globe/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return matchedPresets;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return matchedPresets;
    }

    const apiResults: GeocodingResult[] = data.map((item: any) => ({
      placeId: item.place_id || item.osm_id,
      name: item.name || item.display_name?.split(',')[0] || trimmed,
      displayName: item.display_name || trimmed,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type || item.class || 'location',
      category: item.address?.country || 'Geographic Region',
      importance: item.importance || 0,
    }));

    // Merge API results with matching presets (deduped)
    const all = [...apiResults];
    for (const preset of matchedPresets) {
      if (!all.some((r) => Math.abs(r.lat - preset.lat) < 0.1 && Math.abs(r.lon - preset.lon) < 0.1)) {
        all.push(preset);
      }
    }

    return all.slice(0, 6);
  } catch (err) {
    // Offline or network error: return local matching presets
    return matchedPresets;
  }
}
