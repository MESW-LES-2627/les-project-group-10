import { describe, expect, it } from 'vitest';
import type { Mentor } from '@/api/mentors';
import { matchesMentorSearch } from './mentorSearch';

function buildMentor(overrides: Partial<Mentor> = {}): Mentor {
  return {
    id: 'mentor-1',
    initials: 'JD',
    avatarTone: 'primary',
    name: 'Jane Doe',
    verified: true,
    headline: 'Engineer',
    role: 'Mentor',
    rating: 5,
    reviewCount: 1,
    sessionCount: 1,
    location: 'Porto',
    languages: 'English',
    replyTime: '1 hour',
    nextAvailable: 'Today',
    subjects: ['Software Engineering'],
    skills: ['TypeScript', 'React'],
    tags: [],
    bio: 'Bio',
    about: 'About',
    experience: [],
    services: [
      {
        id: 's1',
        title: 'Mock Interview',
        description: 'Practice interview sessions',
        duration: '60',
        price: 30,
      },
    ],
    posts: [],
    availability: [],
    reviews: [],
    ...overrides,
  };
}

describe('matchesMentorSearch', () => {
  it('matches everything on an empty query', () => {
    expect(matchesMentorSearch(buildMentor(), '')).toBe(true);
    expect(matchesMentorSearch(buildMentor(), '   ')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(matchesMentorSearch(buildMentor(), 'JANE')).toBe(true);
    expect(matchesMentorSearch(buildMentor(), 'typescript')).toBe(true);
  });

  it('returns false when a query word matches nothing', () => {
    expect(matchesMentorSearch(buildMentor(), 'python')).toBe(false);
  });

  it('requires every query word to match', () => {
    expect(matchesMentorSearch(buildMentor(), 'jane python')).toBe(false);
    expect(matchesMentorSearch(buildMentor(), 'jane react')).toBe(true);
  });
});
