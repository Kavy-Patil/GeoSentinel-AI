/**
 * API Contract Data Models for GeoSentinel AI.
 * Mirrors backend/app/schemas.py and contracts/openapi.yaml.
 */

export type DetectionMethod = 'classical' | 'deep_learning';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type RegionSeverity = 'low' | 'medium' | 'high' | 'critical' | 'unknown';

export type RegionPriority = 'low' | 'medium' | 'high' | 'urgent' | 'not_evaluated';

export type ReviewStatus = 'unreviewed' | 'confirmed' | 'false_positive' | 'needs_inspection';

export interface HealthStatus {
  status: string;
  project: string;
  stage: number;
  available_methods: string[];
}

export interface Job {
  job_id: string;
  status: JobStatus;
  method: DetectionMethod;
  created_at: string;
  error?: string | null;
}

export interface ChangeRegion {
  region_id: string;
  geometry: Record<string, unknown> | null;
  area_m2: number | null;
  magnitude: number | null;
  severity: RegionSeverity;
  priority: RegionPriority;
  review_status: ReviewStatus;
  centroid_lon: number | null;
  centroid_lat: number | null;
}

export interface AnalysisStats {
  total_regions: number;
  total_affected_area_m2: number | null;
  average_magnitude: number | null;
  severity_distribution: Record<string, number>;
}

export interface AnalysisImages {
  before_preview_url?: string | null;
  after_preview_url?: string | null;
  change_mask_url?: string | null;
  change_overlay_url?: string | null;
}

export interface AnalysisResult {
  job_id: string;
  georeferenced: boolean;
  source_crs: string | null;
  stats: AnalysisStats;
  images: AnalysisImages;
  changes: ChangeRegion[];
}

export interface ErrorResponse {
  detail: string;
}
