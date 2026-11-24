import { describe, expect, it } from 'vitest';
import {
  estimateReadTime,
  formatPostDate,
  postExcerpt,
  toMentorPostInput,
  validateMentorPostDraft,
} from '@/lib/mentorPosts';

const valid = {
  title: '5 patterns for coding interviews',
  body: 'Sliding window and two pointers solve many array problems.',
};

describe('mentor post draft validation', () => {
  it('accepts a valid draft', () => {
    expect(validateMentorPostDraft(valid)).toEqual({});
  });

  it('rejects blank title and blank body', () => {
    expect(validateMentorPostDraft({ title: '  ', body: '' })).toEqual({
      title: 'Post title is required',
      body: 'Post content is required',
    });
  });

  it('rejects title and body exceeding maximum lengths', () => {
    const errors = validateMentorPostDraft({
      title: 'a'.repeat(151),
      body: 'b'.repeat(10_001),
    });
    expect(errors).toHaveProperty('title');
    expect(errors).toHaveProperty('body');
  });
});

describe('toMentorPostInput', () => {
  it('trims title and body before sending to the API', () => {
    expect(toMentorPostInput({ title: '  Title  ', body: '  Body\nLine 2  ' })).toEqual({
      title: 'Title',
      body: 'Body\nLine 2',
    });
  });
});

describe('post formatting helpers', () => {
  it('normalizes whitespace and truncates long excerpts', () => {
    expect(postExcerpt('  First line.\n\nSecond line.  ')).toBe('First line. Second line.');
    expect(postExcerpt('x'.repeat(161))).toBe(`${'x'.repeat(159)}…`);
  });

  it('estimates read time with a 1 minute minimum', () => {
    expect(estimateReadTime('Short note')).toBe('1 min read');
    expect(estimateReadTime(Array(450).fill('word').join(' '))).toBe('3 min read');
  });

  it('formats valid ISO dates and returns empty string for invalid ones', () => {
    expect(formatPostDate('2026-11-24T12:00:00Z')).toContain('2026');
    expect(formatPostDate('not-a-date')).toBe('');
  });
});
