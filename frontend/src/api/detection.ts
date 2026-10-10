/**
 * API client methods for Stage 3 Change Detection jobs.
 */

import { DetectionMethodInfo, JobCreateRequest, JobResponse } from '../types/detection';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Lists available change detection algorithms.
 */
export async function fetchDetectionMethods(): Promise<{ methods: DetectionMethodInfo[] }> {
  const res = await fetch(`${API_BASE_URL}/api/methods`);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch detection methods (${res.status})`);
  }
  return res.json();
}

export const fetchAvailableMethods = fetchDetectionMethods;
export const createJob = createChangeDetectionJob;

/**
 * Creates and executes a change detection job.
 */
export async function createChangeDetectionJob(request: JobCreateRequest): Promise<JobResponse> {
  const res = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Job execution failed' }));
    throw new ApiError(res.status, err.detail || `Job error (${res.status})`);
  }
  return res.json();
}

/**
 * Fetches status and telemetry of a job.
 */
export async function fetchJobStatus(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
  if (!res.ok) {
    throw new ApiError(res.status, `Job not found (${res.status})`);
  }
  return res.json();
}

/**
 * Constructs direct URL for job image artifacts.
 */
export function getJobImageUrl(jobId: string, kind: string): string {
  return `${API_BASE_URL}/api/jobs/${jobId}/images/${kind}`;
}
