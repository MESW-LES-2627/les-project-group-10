import { apiDelete, apiGet, apiPost, apiPut } from './client';

/**
 * One of the signed-in mentor's own bookable time slots. `date`/`startTime`/`endTime`
 * are plain Europe/Lisbon wall-clock strings, matching native date/time inputs.
 */
export interface MentorSlot {
  id: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  booked: boolean;
}

export interface MentorSlotInput {
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function getMentorSlots(): Promise<{ slots: MentorSlot[] }> {
  return apiGet('/api/mentors/me/slots');
}

export function createMentorSlot(input: MentorSlotInput): Promise<{ slot: MentorSlot }> {
  return apiPost('/api/mentors/me/slots', input);
}

export function updateMentorSlot(
  id: string,
  input: MentorSlotInput,
): Promise<{ slot: MentorSlot }> {
  return apiPut(`/api/mentors/me/slots/${encodeURIComponent(id)}`, input);
}

export function deleteMentorSlot(id: string): Promise<void> {
  return apiDelete(`/api/mentors/me/slots/${encodeURIComponent(id)}`);
}
