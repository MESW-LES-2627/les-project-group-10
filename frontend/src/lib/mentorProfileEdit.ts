import type { EditableMentorProfile } from '@/api/mentors';

export function validateMentorProfile(profile: EditableMentorProfile): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, label, max] of [
    ['headline', 'Professional headline', 120],
    ['bio', 'About you', 1000],
  ] as const) {
    if (!profile[field].trim()) errors[field] = `${label} is required`;
    else if (profile[field].trim().length > max) errors[field] = `${label} is too long`;
  }
  if (profile.subjects.length < 1 || profile.subjects.length > 4) {
    errors.subjects = 'Choose between 1 and 4 subjects';
  }
  if (
    profile.skills.length > 15 ||
    profile.skills.some((skill) => !skill.trim() || skill.trim().length > 40)
  ) {
    errors.skills = 'Add at most 15 skills, each between 1 and 40 characters';
  }
  return errors;
}
