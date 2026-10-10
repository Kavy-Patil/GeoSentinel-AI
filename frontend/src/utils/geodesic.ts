/**
 * Geodesic and coordinate transformation utilities for GeoSentinel AI.
 */

import { GeoBoundsSchema } from '../types/imagery';

const EARTH_RADIUS_KM = 6371.0088;

/**
 * Computes the great-circle distance between two points on a sphere (Haversine formula).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates a genuine geodesic bounding box around a center coordinate given a radius in kilometers.
 */
export function calculateGeographicBoundingBox(
  lat: number,
  lon: number,
  radiusKm: number
): GeoBoundsSchema {
  // Angular distance in radians
  const radDist = radiusKm / EARTH_RADIUS_KM;

  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  const minLatRad = latRad - radDist;
  const maxLatRad = latRad + radDist;

  const minLat = (minLatRad * 180) / Math.PI;
  const maxLat = (maxLatRad * 180) / Math.PI;

  // Compensate for latitude longitude convergence
  const deltaLonRad = Math.asin(Math.sin(radDist) / Math.cos(latRad));
  const minLonRad = lonRad - deltaLonRad;
  const maxLonRad = lonRad + deltaLonRad;

  const minLon = (minLonRad * 180) / Math.PI;
  const maxLon = (maxLonRad * 180) / Math.PI;

  return {
    min_lat: Math.max(-90, Math.min(90, minLat)),
    max_lat: Math.max(-90, Math.min(90, maxLat)),
    min_lon: Math.max(-180, Math.min(180, minLon)),
    max_lon: Math.max(-180, Math.min(180, maxLon)),
  };
}

/**
 * Converts geographic latitude and longitude to 3D Cartesian coordinates for Three.js sphere.
 * Uses standard Three.js UV mapping orientation.
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number
): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return [x, y, z];
}

/**
 * Converts 3D Cartesian coordinates on sphere back to latitude and longitude.
 */
export function vector3ToLatLon(x: number, y: number, z: number, radius: number): [number, number] {
  const phi = Math.acos(Math.max(-1, Math.min(1, y / radius)));
  const theta = Math.atan2(z, -x);

  const lat = 90 - (phi * 180) / Math.PI;
  let lon = (theta * 180) / Math.PI - 180;

  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;

  return [lat, lon];
}

/**
 * Parses coordinate strings in multiple common formats:
 * - "28.6139, 77.2090"
 * - "28.6139 N, 77.2090 E"
 * - "33.8856, 35.5410"
 * - "-33.8688, 151.2093"
 */
export function parseCoordinateString(query: string): { lat: number; lon: number } | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // 1. Standard decimal format: "28.6139, 77.2090" or "28.6139 77.2090"
  const decimalMatch = trimmed.match(
    /^([-+]?\d{1,2}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)$/
  );
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lon = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  // 2. Cardinal format: "28.6139 N, 77.2090 E" or "28.6139N 77.2090E"
  const cardinalMatch = trimmed.match(
    /^(\d{1,2}(?:\.\d+)?)\s*([NSns])[,\s]+(\d{1,3}(?:\.\d+)?)\s*([EWew])$/
  );
  if (cardinalMatch) {
    let lat = parseFloat(cardinalMatch[1]);
    if (cardinalMatch[2].toUpperCase() === 'S') lat = -lat;
    let lon = parseFloat(cardinalMatch[3]);
    if (cardinalMatch[4].toUpperCase() === 'W') lon = -lon;
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  return null;
}

/**
 * Formats coordinates into clean human-readable representation.
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latCard = lat >= 0 ? 'N' : 'S';
  const lonCard = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latCard}, ${Math.abs(lon).toFixed(4)}° ${lonCard}`;
}
