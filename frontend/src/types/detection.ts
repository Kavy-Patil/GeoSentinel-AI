/**
 * TypeScript data models for Stage 3 Change Detection Engine.
 */

export interface DetectionMethodInfo {
  id: string;
  name: string;
  available: boolean;
  type: string;
  hardware: string;
  description: string;
  status?: string;
}

export interface JobCreateRequest {
  before_image_id: string;
  after_image_id: string;
  method: string;
  threshold: number;
  kernel_size: number;
  min_component_size: number;
  dataset_id?: string | null;
  sample_id?: string | null;
}

export interface JobEvaluation {
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  iou: number;
}

export interface JobFilteringDetails {
  raw_change_pixels?: number;
  final_change_pixels?: number;
  raw_change_percentage?: number;
  final_change_percentage?: number;
  kernel_size?: number;
  min_component_size?: number;
  connectivity?: number;
  components_analyzed?: number;
  components_retained?: number;
  components_suppressed?: number;
  pixels_removed_by_invalid_mask?: number;
  pixels_removed_by_morphology?: number;
  pixels_added_by_morphology?: number;
  pixels_removed_by_min_area?: number;
}

export interface JobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  method: string;
  created_at: string;
  processing_time_ms: number;
  detector_time_ms?: number;
  error?: string | null;
  outputs: {
    change_score_url?: string;
    raw_mask_url?: string;
    filtered_mask_url?: string;
    change_overlay_url?: string;
    before_preview_url?: string;
    after_preview_url?: string;
  };
  stats: {
    total_pixels?: number;
    raw_changed_pixels?: number;
    filtered_changed_pixels?: number;
    raw_change_pct?: number;
    filtered_change_pct?: number;
    components_retained?: number;
    components_suppressed?: number;
  };
  filtering_details?: JobFilteringDetails;
  evaluation?: JobEvaluation | null;
}

export type MaskLayerMode = 'overlay' | 'filtered_mask' | 'raw_mask' | 'change_score';
