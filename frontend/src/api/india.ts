import { API_BASE_URL } from './client';
import {
  IndiaPlace,
  STACSearchResponse,
  STACAcquisitionResponse,
  JobResultsData,
} from '../types/india';

export async function fetchIndiaBoundaries(level: 'adm0' | 'adm1' = 'adm1'): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/india/boundaries?level=${level}`);
  if (!response.ok) {
    throw new Error(`Failed to load India boundaries (${level})`);
  }
  return response.json();
}

export async function fetchIndiaPlaces(): Promise<{ total: number; places: IndiaPlace[] }> {
  const response = await fetch(`${API_BASE_URL}/api/india/places`);
  if (!response.ok) {
    throw new Error('Failed to load India urban corridor places');
  }
  return response.json();
}

export async function searchSatelliteImagery(params: {
  bbox: [number, number, number, number];
  date_range_start?: string;
  date_range_end?: string;
  max_cloud_cover?: number;
  limit?: number;
}): Promise<STACSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/imagery/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to query Sentinel-2 STAC API');
  }
  return response.json();
}

export async function acquireSatelliteImagery(params: {
  before_scene_id: string;
  after_scene_id: string;
  bbox: [number, number, number, number];
  location_name?: string;
}): Promise<STACAcquisitionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/imagery/acquire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to acquire and window Sentinel-2 scenes');
  }
  return response.json();
}

export async function fetchJobResults(jobId: string): Promise<JobResultsData> {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/results`);
  if (!response.ok) {
    throw new Error(`Failed to retrieve job results for '${jobId}'`);
  }
  return response.json();
}

export async function updateRegionReviewStatus(
  jobId: string,
  regionId: string,
  reviewStatus: string,
  notes?: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/regions/${regionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_status: reviewStatus, notes }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update region review status`);
  }
  return response.json();
}

export function getJobExportUrl(jobId: string): string {
  return `${API_BASE_URL}/api/jobs/${jobId}/export`;
}

export async function fetchHistoricalTimeline(cityId: string = 'pune'): Promise<import('../types/india').HistoricalTimelineResponse> {
  const response = await fetch(`${API_BASE_URL}/api/imagery/historical/timeline?city_id=${cityId}`);
  if (!response.ok) {
    throw new Error(`Failed to load historical timeline for '${cityId}'`);
  }
  return response.json();
}

export async function searchHistoricalImagery(params: {
  city_id: string;
  year_before: number;
  year_after: number;
  bbox: [number, number, number, number];
  max_cloud_cover?: number;
}): Promise<import('../types/india').HistoricalSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/imagery/historical/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to query historical Landsat STAC catalog');
  }
  return response.json();
}

export async function acquireHistoricalImagery(params: {
  city_id: string;
  year_before: number;
  year_after: number;
  bbox: [number, number, number, number];
  location_name?: string;
}): Promise<import('../types/india').HistoricalAcquisitionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/imagery/historical/acquire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error('Failed to acquire and stage historical Landsat pair');
  }
  return response.json();
}

