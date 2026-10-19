import type { Mentor } from '@/api/mentors';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Every query word must partially match one of the mentor's searchable fields. */
export function matchesMentorSearch(mentor: Mentor, query: string): boolean {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const fields = [
    mentor.name,
    ...mentor.skills,
    ...mentor.subjects,
    ...mentor.services.flatMap((service) => [service.title, service.description]),
  ].map(normalize);

  return words.every((word) => fields.some((field) => field.includes(word)));
}
