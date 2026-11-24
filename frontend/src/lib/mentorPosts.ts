import type { MentorPostInput } from '@/api/mentorPosts';

export interface MentorPostDraft {
  title: string;
  body: string;
}

export const EMPTY_POST_DRAFT: MentorPostDraft = {
  title: '',
  body: '',
};

export const POST_TITLE_MAX_LENGTH = 150;
export const POST_BODY_MAX_LENGTH = 10_000;

/**
 * Validates required title and post body before sending a request.
 */
export function validateMentorPostDraft(draft: MentorPostDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = draft.title.trim();
  const body = draft.body.trim();

  if (!title) {
    errors.title = 'Post title is required';
  } else if (title.length > POST_TITLE_MAX_LENGTH) {
    errors.title = 'Post title is too long';
  }

  if (!body) {
    errors.body = 'Post content is required';
  } else if (body.length > POST_BODY_MAX_LENGTH) {
    errors.body = 'Post content is too long';
  }

  return errors;
}

/** Converts a validated draft into the trimmed API payload. */
export function toMentorPostInput(draft: MentorPostDraft): MentorPostInput {
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
  };
}

/** Builds a single-line excerpt for profile cards and management summaries. */
export function postExcerpt(body: string, max = 160): string {
  const text = body.trim().replace(/\s+/g, ' ');
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Estimates reading time in minutes from the post body. */
export function estimateReadTime(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/** Formats an ISO timestamp in Europe/Lisbon date style for display. */
export function formatPostDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Lisbon',
  }).format(parsed);
}
