import { describe, expect, it } from 'vitest';
import { mentorProfileSchema } from '../../src/modules/mentors/mentors.schemas.js';

const valid = {
  headline: 'Engineer',
  bio: 'I help students.',
  professionalBackground: 'Software engineer\nMSc in computing',
  subjects: ['Software Engineering'],
  skills: ['TypeScript'],
};

describe('mentorProfileSchema', () => {
  it('trims text and collapses duplicate skills preserving the first spelling', () => {
    expect(
      mentorProfileSchema.parse({ ...valid, bio: ' Olá! ', skills: [' React ', 'react', 'SQL'] }),
    ).toEqual({ ...valid, bio: 'Olá!', skills: ['React', 'SQL'] });
  });
  it('allows maximum lengths and optional skills', () => {
    expect(
      mentorProfileSchema.safeParse({
        ...valid,
        headline: 'a'.repeat(120),
        bio: 'a'.repeat(1000),
        professionalBackground: 'a'.repeat(2000),
        skills: [],
      }).success,
    ).toBe(true);
  });
  it.each([
    { headline: undefined },
    { headline: ' ' },
    { headline: 1 },
    { headline: 'a'.repeat(121) },
    { bio: undefined },
    { bio: '\n ' },
    { bio: 'a'.repeat(1001) },
    { professionalBackground: undefined },
    { professionalBackground: ' ' },
    { professionalBackground: 'a'.repeat(2001) },
    { subjects: [] },
    { subjects: ['A', 'B', 'C', 'D', 'E'] },
    { subjects: ['A', ' A '] },
    { subjects: [1] },
    { skills: [''] },
    { skills: ['a'.repeat(41)] },
    { skills: Array(16).fill('SQL') },
    { skills: 'SQL' },
    { userId: 'another-user' },
    { services: [] },
    { onboardingFinished: false },
  ])('rejects invalid fields: %j', (change) => {
    expect(mentorProfileSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});
