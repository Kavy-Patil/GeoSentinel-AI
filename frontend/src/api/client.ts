/**
 * API Client for GeoSentinel AI Backend.
 * Uses native Fetch API with clean error handling and typed responses.
 */

import { HealthStatus } from '../types/api';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Checks backend health and stage configuration.
 */
export async function fetchHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, `Health check returned HTTP ${response.status}`);
    }

    const data: HealthStatus = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Backend unreachable';
    throw new ApiError(0, message);
  }
}
