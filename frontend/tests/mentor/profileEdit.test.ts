import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { getMentorById, getMentorProfileEditor, saveMentorProfile } from '@/api/mentors';
import { validateMentorProfile } from '@/lib/mentorProfileEdit';
import { matchesMentorSearch } from '@/lib/mentorSearch';

const profile = {
  headline: 'Engineer',
  bio: 'Biography',
  subjects: ['Physics'],
  skills: ['React'],
};
afterEach(() => vi.unstubAllGlobals());

describe('profile editor API', () => {
  it('loads editor data and only sends allowed replacement fields', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ profile, subjectOptions: ['Physics'] })),
      );
    vi.stubGlobal('fetch', fetch);
    expect(await getMentorProfileEditor()).toEqual({ profile, subjectOptions: ['Physics'] });
    await saveMentorProfile({ ...profile, userId: 'untrusted' } as typeof profile);
    expect(fetch).toHaveBeenLastCalledWith('/api/mentors/me/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
  });
  it('propagates structured server field errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'validation_error',
              message: 'Invalid input',
              fields: { bio: 'Required' },
            },
          }),
          { status: 400 },
        ),
      ),
    );
    await expect(saveMentorProfile(profile)).rejects.toMatchObject({
      status: 400,
      fields: { bio: 'Required' },
    });
    await expect(saveMentorProfile(profile)).rejects.toBeInstanceOf(ApiError);
  });
  it('derives cards from the biography and maps updated searchable expertise', async () => {
    const raw = {
      id: 'mentor',
      username: 'Jane',
      headline: 'Engineer',
      tagline: 'Old summary that must not override the biography',
      bio: 'Bio',
      location: '',
      languages: [],
      linkedinUrl: '',
      skills: ['Álgebra'],
      subjects: ['Mathematics'],
      availability: [],
      services: [],
    };
    const fetch = vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify({ mentor: raw })));
    vi.stubGlobal('fetch', fetch);
    const legacy = await getMentorById('mentor');
    expect(legacy?.bio).toBe('Bio');
    expect(legacy?.about).toBe('Bio');
    expect(matchesMentorSearch(legacy!, 'algebra mathematics')).toBe(true);
  });
});

describe('profile draft validation', () => {
  it('accepts optional skills and maximum text lengths', () => {
    expect(
      validateMentorProfile({
        ...profile,
        headline: 'x'.repeat(120),
        bio: 'x'.repeat(1000),
        skills: [],
      }),
    ).toEqual({});
  });
  it.each([
    { headline: ' ' },
    { bio: 'x'.repeat(1001) },
    { subjects: [] },
    { subjects: ['A', 'B', 'C', 'D', 'E'] },
    { skills: [' '] },
    { skills: Array(16).fill('SQL') },
    { skills: ['a'.repeat(41)] },
  ])('rejects invalid drafts: %j', (change) => {
    expect(Object.keys(validateMentorProfile({ ...profile, ...change })).length).toBeGreaterThan(0);
  });
});
