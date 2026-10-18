import { apiPost } from './client';

export interface OnboardingServicePayload {
  title: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
}

/**
 * Body of `POST /api/mentors/me/onboarding`: everything the onboarding
 * collects except availability.
 */
export interface MentorOnboardingPayload {
  username: string;
  location: string;
  languages: string[];
  linkedinUrl: string;
  tagline: string;
  headline: string;
  subjects: string[];
  skills: string[];
  services: OnboardingServicePayload[];
  bio: string;
}

export function completeMentorOnboarding(payload: MentorOnboardingPayload): Promise<void> {
  return apiPost('/api/mentors/me/onboarding', payload);
}
