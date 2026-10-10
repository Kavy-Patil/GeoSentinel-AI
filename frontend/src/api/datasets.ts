/**
 * API client methods for Stage 2 Datasets & Imagery endpoints.
 */

import {
  DatasetListResponse,
  DatasetSamplesResponse,
  ImageryValidationResponse,
  RasterMetadataResponse,
} from '../types/imagery';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetches registered datasets from backend.
 */
export async function fetchDatasets(): Promise<DatasetListResponse> {
  const res = await fetch(`${API_BASE_URL}/api/datasets`);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch datasets (${res.status})`);
  }
  return res.json();
}

/**
 * Fetches available sample pairs for a dataset.
 */
export async function fetchDatasetSamples(datasetId: string): Promise<DatasetSamplesResponse> {
  const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/samples`);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch samples for '${datasetId}' (${res.status})`);
  }
  return res.json();
}

/**
 * Stages and loads a sample pair.
 */
export async function loadDatasetSample(
  datasetId: string,
  sampleId: string
): Promise<ImageryValidationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/samples/${sampleId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load sample' }));
    throw new ApiError(res.status, err.detail || `Failed to load sample '${sampleId}'`);
  }
  return res.json();
}

/**
 * Uploads and validates two custom GeoTIFF rasters.
 */
export async function validateCustomImagery(
  beforeFile: File,
  afterFile: File
): Promise<ImageryValidationResponse> {
  const formData = new FormData();
  formData.append('before_image', beforeFile);
  formData.append('after_image', afterFile);

  const res = await fetch(`${API_BASE_URL}/api/imagery/validate`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Imagery validation failed' }));
    throw new ApiError(res.status, err.detail || `Validation error (${res.status})`);
  }
  return res.json();
}

/**
 * Constructs direct URL for 8-bit image preview stream.
 */
export function getImageryPreviewUrl(imageId: string): string {
  return `${API_BASE_URL}/api/imagery/${imageId}/preview`;
}

/**
 * Fetches verified raster metadata.
 */
export async function fetchImageryMetadata(imageId: string): Promise<RasterMetadataResponse> {
  const res = await fetch(`${API_BASE_URL}/api/imagery/${imageId}/metadata`);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch metadata for '${imageId}' (${res.status})`);
  }
  return res.json();
}
