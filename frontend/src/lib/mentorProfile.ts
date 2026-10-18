import type { TagTone } from '@/components/ui';
import type { Service } from '@/components/mentor-onboarding/ServiceList';
import type { MentorOnboardingPayload } from '@/api/mentors';
import type { MentorOnboardingData } from '@/pages/mentor-onboarding/mentorOnboardingContext';

const TAG_TONES: TagTone[] = ['green', 'blue', 'orange', 'yellow'];

/**
 * Initials for an avatar from a full name, e.g. "Mariana Silva" -> "MS".
 */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

/**
 * Turns a mentor's skill list into colored preview tags, cycling
 * through the available tag tones.
 */
export function tagsFromSkills(skills: string[], max = 3): { label: string; tone: TagTone }[] {
  return skills
    .slice(0, max)
    .map((skill, index) => ({ label: skill, tone: TAG_TONES[index % TAG_TONES.length]! }));
}

/**
 * The lowest fee across a mentor's services, for the "From €X" price
 * shown in profile previews. Returns null if no service has a
 * parseable price yet.
 */
export function lowestServicePrice(services: Service[]): string | null {
  const amounts = services
    .map((service) => Number(service.price.replace(/[^0-9.]/g, '')))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (amounts.length === 0) return null;
  return `€${Math.min(...amounts)}`;
}

/**
 * Pluralizes a count + noun pair, e.g. pluralize(1, 'slot') -> "1 slot".
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Converts the onboarding answers into the API body. The form keeps the
 * fee in euros and the duration in minutes as text; the API wants cents
 * and whole minutes. Availability is not sent (it isn't saved yet).
 */
export function toOnboardingPayload(data: MentorOnboardingData): MentorOnboardingPayload {
  return {
    username: data.fullName,
    location: data.location,
    languages: data.languages,
    linkedinUrl: data.linkedIn,
    tagline: data.tagline,
    headline: data.headline,
    subjects: data.subjects,
    skills: data.skills,
    services: data.services.map((service) => ({
      title: service.title,
      description: service.description,
      priceCents: Math.round(Number(service.price) * 100),
      durationMinutes: Number(service.duration),
    })),
    bio: data.bio,
  };
}
