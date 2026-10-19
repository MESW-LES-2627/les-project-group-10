import { apiGet, apiPost, ApiError } from './client';
import { getInitials, tagsFromSkills } from '@/lib/mentorProfile';
import type { AvatarTone, TagTone } from '@/components/ui';

export interface MentorService {
  id: string;
  title: string;
  description: string;
  duration: string;
  price: number;
}

export interface MentorExperience {
  title: string;
  period: string;
  kind: 'work' | 'study';
}

export interface MentorPost {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  published: string;
}

export interface MentorAvailability {
  date: string;
  times: string[];
}

export interface MentorReview {
  id: string;
  authorInitials: string;
  authorName: string;
  date: string;
  rating: number;
  comment: string;
}

export interface MentorTag {
  label: string;
  tone: TagTone;
}

export interface Mentor {
  id: string;
  initials: string;
  avatarTone: AvatarTone;
  name: string;
  verified: boolean;
  headline: string;
  role: string;
  rating: number;
  reviewCount: number;
  sessionCount: number;
  location: string;
  languages: string;
  replyTime: string;
  nextAvailable: string;
  subjects: string[];
  tags: MentorTag[];
  bio: string;
  about: string;
  experience: MentorExperience[];
  services: MentorService[];
  posts: MentorPost[];
  availability: MentorAvailability[];
  reviews: MentorReview[];
}

/** Load the public database catalog so checkout uses the same prices and slots as the server. */
export async function getMentors(): Promise<Mentor[]> {
  const { mentors } = await apiGet<{ mentors: MentorProfileResponse[] }>('/api/mentors');
  return mentors.map(toMentor);
}

/** What `GET /api/mentors/:id` returns. */
interface MentorProfileResponse {
  id: string;
  username: string;
  headline: string;
  tagline: string;
  bio: string;
  location: string;
  languages: string[];
  linkedinUrl: string;
  skills: string[];
  subjects: string[];
  availability: MentorAvailability[];
  services: {
    id: string;
    title: string;
    description: string;
    priceCents: number;
    durationMinutes: number;
  }[];
}

/**
 * Fills the page's display model; editorial profile content is not persisted yet.
 */
function toMentor(profile: MentorProfileResponse): Mentor {
  return {
    id: profile.id,
    initials: getInitials(profile.username),
    avatarTone: 'primary',
    name: profile.username,
    verified: false,
    headline: profile.headline,
    role: profile.headline,
    rating: 0,
    reviewCount: 0,
    sessionCount: 0,
    location: profile.location,
    languages: profile.languages.join(', '),
    replyTime: '',
    nextAvailable: '',
    subjects: profile.subjects,
    tags: tagsFromSkills(profile.skills, 8),
    bio: profile.tagline || profile.bio,
    about: profile.bio,
    experience: [],
    services: profile.services.map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      duration: `${service.durationMinutes} min`,
      price: service.priceCents / 100,
    })),
    posts: [],
    availability: profile.availability,
    reviews: [],
  };
}

/** Returns one database-backed mentor by id, or null when it is not public. */
export async function getMentorById(id: string): Promise<Mentor | null> {
  try {
    const { mentor } = await apiGet<{ mentor: MentorProfileResponse }>(
      `/api/mentors/${encodeURIComponent(id)}`,
    );
    return toMentor(mentor);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      console.error('Could not load the mentor:', error);
    }
    return null;
  }
}

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
