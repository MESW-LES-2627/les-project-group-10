import { describe, expect, it } from 'vitest';
import { mentorPostSchema } from '../../src/modules/mentors/mentors.posts.schemas.js';

const valid = {
  title: 'Understanding Big-O Notation',
  body: 'Big-O describes how runtime grows with input size.',
};

describe('mentorPostSchema', () => {
  it('accepts and trims valid post input', () => {
    expect(
      mentorPostSchema.parse({
        title: `  ${valid.title}  `,
        body: `  ${valid.body}\n\nExample loop.  `,
      }),
    ).toEqual({
      title: valid.title,
      body: `${valid.body}\n\nExample loop.`,
    });
  });

  it.each([
    ['empty title', { ...valid, title: '' }, 'title'],
    ['whitespace-only title', { ...valid, title: '   \t\n  ' }, 'title'],
    ['title over 150 chars', { ...valid, title: 'a'.repeat(151) }, 'title'],
    ['empty body', { ...valid, body: '' }, 'body'],
    ['whitespace-only body', { ...valid, body: '   \n  ' }, 'body'],
    ['body over 10000 chars', { ...valid, body: 'a'.repeat(10_001) }, 'body'],
  ])('rejects %s', (_label, input, field) => {
    const result = mentorPostSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });

  it('rejects unknown fields such as mentorId', () => {
    const result = mentorPostSchema.safeParse({ ...valid, mentorId: 'other-mentor' });
    expect(result.success).toBe(false);
  });
});
