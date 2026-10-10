import type { LonLat, MathResult } from "./types";

const EARTH_RADIUS_M = 6371000;

export function closedRing(points: LonLat[]): LonLat[] {
  if (points.length === 0) return [];
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

/** Spherical polygon area in square metres. Requires ≥3 vertices. */
export function polygonAreaM2(points: LonLat[]): number | null {
  const ring = closedRing(points);
  if (ring.length < 4) return null;
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    total += (lon2 - lon1) * (Math.PI / 180) * (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function m2ToHectares(m2: number): number {
  return m2 / 10000;
}

export function m2ToKm2(m2: number): number {
  return m2 / 1_000_000;
}

export function yearsBetween(before: string, after: string): number | null {
  const a = Date.parse(before);
  const b = Date.parse(after);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return (b - a) / (365.2425 * 24 * 3600 * 1000);
}

export function deltaArea(afterM2: number | null, beforeM2: number | null): number | null {
  if (afterM2 === null || beforeM2 === null) return null;
  return afterM2 - beforeM2;
}

export function percentChange(delta: number | null, beforeM2: number | null): number | null {
  if (delta === null || beforeM2 === null || beforeM2 === 0) return null;
  return (delta / beforeM2) * 100;
}

export function annualizedGrowthPct(afterM2: number | null, beforeM2: number | null, years: number | null): number | null {
  if (afterM2 === null || beforeM2 === null || years === null) return null;
  if (beforeM2 <= 0 || afterM2 <= 0 || years <= 0) return null;
  return (Math.pow(afterM2 / beforeM2, 1 / years) - 1) * 100;
}

export function ndvi(nir: number | null, red: number | null): number | null {
  if (nir === null || red === null) return null;
  const den = nir + red;
  if (den === 0) return null;
  return (nir - red) / den;
}

export function ndwi(green: number | null, nir: number | null): number | null {
  if (green === null || nir === null) return null;
  const den = green + nir;
  if (den === 0) return null;
  return (green - nir) / den;
}

/** Slope in degrees from finite-difference dz/dx, dz/dy (metres / metres). */
export function slopeDeg(dzdx: number, dzdy: number): number {
  return (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
}

export function finiteDifferenceSlope(
  grid: number[][],
  cellEastM: number,
  cellNorthM: number
): number | null {
  if (grid.length < 2 || grid[0].length < 2) return null;
  const slopes: number[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const dzdx =
        c + 1 < grid[r].length && Number.isFinite(grid[r][c]) && Number.isFinite(grid[r][c + 1])
          ? (grid[r][c + 1] - grid[r][c]) / cellEastM
          : null;
      const dzdy =
        r + 1 < grid.length && Number.isFinite(grid[r][c]) && Number.isFinite(grid[r + 1][c])
          ? (grid[r + 1][c] - grid[r][c]) / cellNorthM
          : null;
      if (dzdx === null || dzdy === null) continue;
      slopes.push(slopeDeg(dzdx, dzdy));
    }
  }
  if (!slopes.length) return null;
  return slopes.reduce((s, v) => s + v, 0) / slopes.length;
}

export function summarizeMath(input: {
  beforeAreaM2: number | null;
  afterAreaM2: number | null;
  beforeDate: string;
  afterDate: string;
  nir: number | null;
  red: number | null;
  green: number | null;
  meanSlopeDeg: number | null;
  precipMm: number | null;
  floodedAreaM2: number | null;
  aoiAreaM2: number | null;
}): MathResult {
  const years = yearsBetween(input.beforeDate, input.afterDate);
  const delta = deltaArea(input.afterAreaM2, input.beforeAreaM2);
  const assumptions: string[] = [];
  if (input.beforeAreaM2 === null && input.afterAreaM2 === null) {
    assumptions.push("Area change is omitted because no measured polygons exist for both dates.");
  }
  if (input.nir === null || input.red === null) {
    assumptions.push("NDVI is omitted because calibrated NIR and Red reflectance were not ingested.");
  }
  if (input.green === null || input.nir === null) {
    assumptions.push("NDWI is omitted because calibrated Green and NIR reflectance were not ingested.");
  }
  if (input.floodedAreaM2 === null) {
    assumptions.push("Flooded area is omitted because SAR/optical water classification has not been produced for this AOI.");
  }
  if (input.meanSlopeDeg === null) {
    assumptions.push("Slope is omitted until a DEM grid is sampled for the AOI.");
  }
  const inundationPct =
    input.floodedAreaM2 !== null && input.aoiAreaM2 && input.aoiAreaM2 > 0
      ? (input.floodedAreaM2 / input.aoiAreaM2) * 100
      : null;
  return {
    deltaAreaM2: delta,
    percentChange: percentChange(delta, input.beforeAreaM2),
    annualizedGrowthPct: annualizedGrowthPct(input.afterAreaM2, input.beforeAreaM2, years),
    years,
    ndvi: ndvi(input.nir, input.red),
    ndwi: ndwi(input.green, input.nir),
    slopeDeg: input.meanSlopeDeg,
    floodedAreaKm2: input.floodedAreaM2 === null ? null : m2ToKm2(input.floodedAreaM2),
    inundationPct,
    precipMm: input.precipMm,
    assumptions
  };
}
