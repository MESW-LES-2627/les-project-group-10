import { describe, expect, it } from 'vitest';
import { mentorOnboardingSchema } from './mentors.schemas.js';

const validService = {
  title: 'Mock Interview',
  description: 'Practice interview with feedback.',
  priceCents: 3000,
  durationMinutes: 60,
};

const validInput = {
  username: 'Jane Doe',
  location: 'Porto, Portugal',
  languages: ['English'],
  linkedinUrl: '',
  tagline: 'I help you land your first job.',
  headline: 'Senior Software Engineer',
  subjects: ['Software Engineering'],
  skills: ['TypeScript'],
  services: [validService],
  bio: 'Over a decade of experience.',
};

describe('mentorOnboardingSchema', () => {
  it('accepts valid input', () => {
    expect(mentorOnboardingSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects a service fee under 50 cents', () => {
    const result = mentorOnboardingSchema.safeParse({
      ...validInput,
      services: [{ ...validService, priceCents: 49 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const { username: _username, ...rest } = validInput;
    void _username;
    expect(mentorOnboardingSchema.safeParse(rest).success).toBe(false);
  });
});
