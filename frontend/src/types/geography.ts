/**
 * Geographic data structures for GeoSentinel AI 3D Globe & Location Services.
 */

import { GeoBoundsSchema } from './imagery';

export interface SelectedLocation {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  category?: string;
  country?: string;
  radiusKm?: number;
  bounds?: GeoBoundsSchema;
  source: 'search' | 'coordinates' | 'preset' | 'click';
}

export interface GeocodingResult {
  placeId: string | number;
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  category?: string;
  importance?: number;
  boundingBox?: [number, number, number, number]; // [minLat, maxLat, minLon, maxLon]
}

export type AppPage = 'home' | 'explore' | 'monitor' | 'datasets' | 'history' | 'settings';
