export interface IndiaPlace {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng?: number;
  lon: number;
  category?: string;
  default_radius_km?: number;
  subregions?: string[];
  recommended_bbox?: [number, number, number, number];
  labeled_pairs?: number;
  unlabeled_pairs?: number;
  total_pairs?: number;
  change_instances?: number;
  dataset_source?: string;
  paper_doi?: string;
  github_repo?: string;
  local_samples_available?: number;
  description?: string;
}

export interface STACScene {
  scene_id: string;
  datetime: string;
  cloud_cover: number;
  platform: string;
  source: string;
  thumbnail_url?: string | null;
  assets?: {
    visual?: string | null;
    red?: string | null;
    green?: string | null;
    blue?: string | null;
    nir?: string | null;
  };
}

export interface STACSearchResponse {
  success: boolean;
  count: number;
  scenes: STACScene[];
  source: string;
  collection: string;
  error?: string;
}

export interface STACAcquisitionResponse {
  success: boolean;
  location_name: string;
  before_image_id: string;
  after_image_id: string;
  before_preview_url: string;
  after_preview_url: string;
  acquisition_dates: {
    before: string;
    after: string;
  };
  bounds_wgs84: {
    min_lon: number;
    min_lat: number;
    max_lon: number;
    max_lat: number;
  };
  validation: any;
  message: string;
}

export interface ChangeRegionProperties {
  region_id: string;
  area_m2: number;
  area_ha: number;
  area_km2?: number;
  magnitude: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  development_label?: string;
  confidence?: number;
  review_status: 'unreviewed' | 'confirmed' | 'false_positive' | 'needs_inspection';
  centroid_lon: number;
  centroid_lat: number;
  notes?: string;
}

export interface ChangeFeature {
  type: 'Feature';
  id: string;
  geometry: any;
  properties: ChangeRegionProperties;
}

export interface ChangeFeatureCollection {
  type: 'FeatureCollection';
  features: ChangeFeature[];
  summary: {
    total_regions: number;
    total_area_m2: number;
    total_area_ha: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    confirmed_count: number;
    rejected_count: number;
    unreviewed_count: number;
  };
}

export interface JobResultsData {
  job_id: string;
  status: string;
  method: string;
  is_georeferenced: boolean;
  geojson: ChangeFeatureCollection;
  summary: ChangeFeatureCollection['summary'];
  bounds_wgs84?: {
    min_lon: number;
    min_lat: number;
    max_lon: number;
    max_lat: number;
  };
  created_at: string;
  processing_time_ms: number;
}

export interface HistoricalSceneMetadata {
  year: number;
  available: boolean;
  scene_id: string;
  datetime: string;
  platform: string;
  sensor?: string;
  cloud_cover: number;
  valid_pixel_pct: number;
  resolution_m: number;
  source: string;
}

export interface HistoricalTimelineResponse {
  city_id: string;
  collection: string;
  available_years: number[];
  timeline: HistoricalSceneMetadata[];
}

export interface HistoricalSearchResponse {
  success: boolean;
  city_id: string;
  year_before: number;
  year_after: number;
  before_scene: {
    scene_id: string;
    datetime: string;
    platform: string;
    cloud_cover: number;
    valid_pixel_pct: number;
    resolution_m: number;
    source: string;
  };
  after_scene: {
    scene_id: string;
    datetime: string;
    platform: string;
    cloud_cover: number;
    valid_pixel_pct: number;
    resolution_m: number;
    source: string;
  };
  analysis_grid: {
    spatial_resolution: string;
    resampling: string;
    calibration: string;
  };
  error?: string;
}

export interface HistoricalAcquisitionResponse {
  success: boolean;
  location_name: string;
  city_id: string;
  year_before: number;
  year_after: number;
  before_image_id: string;
  after_image_id: string;
  before_preview_url: string;
  after_preview_url: string;
  acquisition_dates: {
    before: string;
    after: string;
  };
  scene_ids: {
    before: string;
    after: string;
  };
  spatial_resolution: string;
  bounds_wgs84: {
    min_lon: number;
    min_lat: number;
    max_lon: number;
    max_lat: number;
  };
  validation: any;
  message: string;
}
