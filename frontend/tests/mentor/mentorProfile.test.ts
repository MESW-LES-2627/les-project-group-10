import { describe, expect, it } from 'vitest';
import type { Service } from '@/components/mentor-onboarding/ServiceList';
import type { MentorOnboardingData } from '@/pages/mentor-onboarding/mentorOnboardingContext';
import {
  getInitials,
  lowestServicePrice,
  pluralize,
  tagsFromSkills,
  toOnboardingPayload,
} from '@/lib/mentorProfile';

describe('getInitials', () => {
  it('returns the first and last initials for a full name', () => {
    expect(getInitials('Mariana Silva')).toBe('MS');
  });

  it('returns the first two letters for a single-word name', () => {
    expect(getInitials('Mariana')).toBe('MA');
  });

  it('returns an empty string for an empty name', () => {
    expect(getInitials('   ')).toBe('');
  });
});

describe('tagsFromSkills', () => {
  it('caps the number of tags at the given max', () => {
    const tags = tagsFromSkills(['A', 'B', 'C', 'D'], 2);
    expect(tags).toHaveLength(2);
    expect(tags.map((tag) => tag.label)).toEqual(['A', 'B']);
  });

  it('defaults to a max of 3 and cycles through tones', () => {
    const tags = tagsFromSkills(['A', 'B', 'C']);
    expect(tags).toHaveLength(3);
  });
});

describe('lowestServicePrice', () => {
  const service = (price: string): Service => ({
    id: '1',
    title: 'Service',
    description: 'Description',
    duration: '60',
    price,
  });

  it('returns the minimum price formatted in euros', () => {
    expect(lowestServicePrice([service('30'), service('15'), service('50')])).toBe('€15');
  });

  it('returns null for an empty list', () => {
    expect(lowestServicePrice([])).toBeNull();
  });

  it('ignores services without a parseable positive price', () => {
    expect(lowestServicePrice([service(''), service('0')])).toBeNull();
  });
});

describe('pluralize', () => {
  it('uses the singular form for a count of 1', () => {
    expect(pluralize(1, 'slot')).toBe('1 slot');
  });

  it('uses the default plural form otherwise', () => {
    expect(pluralize(0, 'slot')).toBe('0 slots');
    expect(pluralize(3, 'slot')).toBe('3 slots');
  });

  it('uses a custom plural form when given', () => {
    expect(pluralize(2, 'child', 'children')).toBe('2 children');
  });
});

describe('toOnboardingPayload', () => {
  it('converts onboarding form data into the API payload', () => {
    const data: MentorOnboardingData = {
      fullName: 'Jane Doe',
      location: 'Porto',
      languages: ['English'],
      linkedIn: 'https://linkedin.com/in/jane',
      tagline: 'Tagline',
      headline: 'Headline',
      subjects: ['Engineering'],
      skills: ['TypeScript'],
      services: [
        { id: '1', title: 'Mock Interview', description: 'Practice', duration: '60', price: '35' },
      ],
      bio: 'Bio',
      availableSlotKeys: [],
    };

    expect(toOnboardingPayload(data)).toEqual({
      username: 'Jane Doe',
      location: 'Porto',
      languages: ['English'],
      linkedinUrl: 'https://linkedin.com/in/jane',
      tagline: 'Tagline',
      headline: 'Headline',
      subjects: ['Engineering'],
      skills: ['TypeScript'],
      services: [
        { title: 'Mock Interview', description: 'Practice', priceCents: 3500, durationMinutes: 60 },
      ],
      bio: 'Bio',
    });
  });
});
