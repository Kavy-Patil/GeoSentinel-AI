/**
 * TypeScript definitions for Stage 2 Satellite Dataset Ingestion and GeoTIFF Processing.
 */

export interface DatasetSummary {
  id: string;
  name: string;
  available: boolean;
  sample_count: number;
  supports_georeferencing: boolean;
  sensor?: string | null;
  license?: string | null;
  description?: string | null;
  attribution?: string | null;
}

export interface DatasetListResponse {
  datasets: DatasetSummary[];
}

export interface DatasetSampleSummary {
  sample_id: string;
  name: string;
  category: string;
  georeferenced: boolean;
  dimensions: string;
}

export interface DatasetSamplesResponse {
  dataset_id: string;
  samples: DatasetSampleSummary[];
}

export interface GeoBoundsSchema {
  min_lon: number;
  min_lat: number;
  max_lon: number;
  max_lat: number;
}

export interface RasterMetadataResponse {
  filename: string;
  width: number;
  height: number;
  count: number;
  dtypes: string[];
  crs_epsg: string | null;
  crs_wkt: string | null;
  is_georeferenced: boolean;
  transform: number[];
  resolution: number[];
  bounds_native: number[] | null;
  bounds_wgs84: GeoBoundsSchema | null;
  nodata: number | null;
  driver: string;
}

export interface ImageryValidationResponse {
  valid: boolean;
  georeferenced: boolean;
  aligned: boolean;
  source_crs: string | null;
  width: number;
  height: number;
  bands: number;
  before_image_id: string;
  after_image_id: string;
  overlap_bounds_wgs84: GeoBoundsSchema | null;
  valid_pixel_pct: number;
  warnings: string[];
  errors: string[];
}
