import type { MentorSlotInput } from '@/api/mentorSlots';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Catches empty/malformed fields and an inverted range before a request is sent.
 * The server still enforces the rest (future date, minimum service duration, overlap).
 */
export function validateMentorSlotDraft(draft: MentorSlotInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.serviceId) errors.serviceId = 'Choose a service';
  if (!draft.date) errors.date = 'Choose a date';
  if (!TIME_PATTERN.test(draft.startTime)) errors.startTime = 'Choose a start time';
  if (!TIME_PATTERN.test(draft.endTime)) errors.endTime = 'Choose an end time';
  if (!errors.startTime && !errors.endTime && draft.endTime <= draft.startTime) {
    errors.endTime = 'End time must be after the start time';
  }
  return errors;
}
