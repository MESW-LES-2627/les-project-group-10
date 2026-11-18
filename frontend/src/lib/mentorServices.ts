import type { MentorServiceInput } from '@/api/mentorServices';

/** A service form's editable state: price/duration stay as the text of number inputs. */
export interface MentorServiceDraft {
  title: string;
  description: string;
  /** euros, e.g. "35" or "12.50" */
  price: string;
  /** minutes, e.g. "60" */
  duration: string;
}

export const EMPTY_SERVICE_DRAFT: MentorServiceDraft = {
  title: '',
  description: '',
  price: '',
  duration: '',
};

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
const DURATION_PATTERN = /^\d+$/;

/**
 * Catches empty fields, a negative or sub-cent fee, and a non-positive duration before a
 * request is sent. The server still enforces the rest (min/max fee and duration).
 */
export function validateMentorServiceDraft(draft: MentorServiceDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.title.trim()) errors.title = 'Service name is required';
  if (!draft.description.trim()) errors.description = 'Description is required';

  if (!draft.price.trim()) {
    errors.priceCents = 'Fee is required';
  } else if (!PRICE_PATTERN.test(draft.price.trim())) {
    errors.priceCents = draft.price.trim().startsWith('-')
      ? 'Fee cannot be negative'
      : 'Fee can have at most two decimal places';
  }

  if (!draft.duration.trim()) {
    errors.durationMinutes = 'Duration is required';
  } else if (!DURATION_PATTERN.test(draft.duration.trim()) || Number(draft.duration) <= 0) {
    errors.durationMinutes = 'Duration must be a positive whole number of minutes';
  }

  return errors;
}

/** Converts a validated draft into the API body (euros -> cents, text -> number). */
export function toMentorServiceInput(draft: MentorServiceDraft): MentorServiceInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    priceCents: Math.round(Number(draft.price) * 100),
    durationMinutes: Number(draft.duration),
  };
}
