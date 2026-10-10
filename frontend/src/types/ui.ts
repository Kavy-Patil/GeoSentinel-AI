/**
 * UI State and Component Prop Types for GeoSentinel AI.
 */

import { ChangeRegion, DetectionMethod } from './api';

export type ViewMode = 'side-by-side' | 'swipe' | 'overlay';

export type WorkspaceTab = 'comparison' | 'map';

export type DatasetSource = 'sample' | 'custom';

export interface ImageInputState {
  file: File | null;
  previewUrl: string | null;
  filename: string | null;
  fileSize: number | null;
  dimensions: { width: number; height: number } | null;
  acquisitionDate: string | null;
  isGeoTiff: boolean;
}

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  category: string;
  beforeDate: string;
  afterDate: string;
  beforeImage: string;
  afterImage: string;
  demoRegions?: ChangeRegion[];
}

export interface DetectionConfig {
  source: DatasetSource;
  selectedSampleId: string;
  method: DetectionMethod;
  threshold: number;
}

export interface ZoomTransform {
  zoom: number;
  x: number;
  y: number;
}
