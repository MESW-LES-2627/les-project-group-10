import { apiGet, apiPatch, apiPost, apiPut } from './client';

/** One of the signed-in mentor's own services, active or not. */
export interface MentorServiceRecord {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
}

export interface MentorServiceInput {
  title: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
}

export function getMentorServices(): Promise<{ services: MentorServiceRecord[] }> {
  return apiGet('/api/mentors/me/services');
}

export function createMentorService(
  input: MentorServiceInput,
): Promise<{ service: MentorServiceRecord }> {
  return apiPost('/api/mentors/me/services', input);
}

export function updateMentorService(
  id: string,
  input: MentorServiceInput,
): Promise<{ service: MentorServiceRecord }> {
  return apiPut(`/api/mentors/me/services/${encodeURIComponent(id)}`, input);
}

export function setMentorServiceActive(
  id: string,
  isActive: boolean,
): Promise<{ service: MentorServiceRecord }> {
  return apiPatch(`/api/mentors/me/services/${encodeURIComponent(id)}/active`, { isActive });
}
