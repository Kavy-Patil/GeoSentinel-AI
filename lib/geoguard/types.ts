export type Place = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
  feature_code?: string;
};

export type Bounds = [number, number, number, number];
export type LonLat = [number, number];

export type AnalysisCategory = "urban" | "flood" | "landslide";
export type MapMode = "2d" | "3d" | "compare";
export type ImageryProductId = "hls" | "viirs" | "modis";

export type Scene = {
  id: string;
  datetime: string;
  platform: string;
  instrument?: string;
  cloudCover?: number;
  gsdMeters?: number;
  collection: string;
  thumbnail?: string;
  preview?: string;
  assets: string[];
  bbox?: number[];
  source: string;
};

export type Detection = {
  id: string;
  category: AnalysisCategory;
  source: "user_mark" | "model" | "official_boundary";
  status: "potential" | "observed" | "susceptibility" | "uncertain";
  confidence: number | null;
  areaM2: number | null;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  notes: string;
};

export type MathResult = {
  deltaAreaM2: number | null;
  percentChange: number | null;
  annualizedGrowthPct: number | null;
  years: number | null;
  ndvi: number | null;
  ndwi: number | null;
  slopeDeg: number | null;
  floodedAreaKm2: number | null;
  inundationPct: number | null;
  precipMm: number | null;
  assumptions: string[];
};

export type ElevationSample = { longitude: number; latitude: number; elevationM: number };

export type Recipient = {
  id: string;
  email: string;
  verified: boolean;
  consent: boolean;
  createdAt: string;
};

export type AnalysisJob = {
  id: string;
  status: "queued" | "running" | "complete" | "unavailable";
  category: AnalysisCategory;
  detections: Detection[];
  limitations: string[];
  modelVersion: string | null;
};
