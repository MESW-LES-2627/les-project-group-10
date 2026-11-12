import { describe, expect, it } from 'vitest';
import { toMentorServiceInput, validateMentorServiceDraft } from '@/lib/mentorServices';
import type { MentorServiceDraft } from '@/lib/mentorServices';

const valid: MentorServiceDraft = {
  title: '1:1 Mentoring call',
  description: 'Talk through your current project.',
  price: '35',
  duration: '60',
};

describe('mentor service draft validation', () => {
  it('accepts a valid draft', () => {
    expect(validateMentorServiceDraft(valid)).toEqual({});
  });

  it('requires a title', () => {
    expect(validateMentorServiceDraft({ ...valid, title: '  ' })).toHaveProperty('title');
  });

  it('requires a description', () => {
    expect(validateMentorServiceDraft({ ...valid, description: '' })).toHaveProperty('description');
  });

  it('requires a fee', () => {
    expect(validateMentorServiceDraft({ ...valid, price: '' })).toHaveProperty('priceCents');
  });

  it('rejects a negative fee', () => {
    expect(validateMentorServiceDraft({ ...valid, price: '-5' })).toHaveProperty('priceCents');
  });

  it('rejects a fee with more than two decimal places', () => {
    expect(validateMentorServiceDraft({ ...valid, price: '35.123' })).toHaveProperty('priceCents');
  });

  it('accepts a fee with up to two decimal places', () => {
    expect(validateMentorServiceDraft({ ...valid, price: '12.50' })).toEqual({});
  });

  it('requires a duration', () => {
    expect(validateMentorServiceDraft({ ...valid, duration: '' })).toHaveProperty(
      'durationMinutes',
    );
  });

  it.each(['0', '-10', 'abc'])('rejects a non-positive or malformed duration %s', (duration) => {
    expect(validateMentorServiceDraft({ ...valid, duration })).toHaveProperty('durationMinutes');
  });
});

describe('toMentorServiceInput', () => {
  it('converts euros to whole cents and trims text fields', () => {
    expect(
      toMentorServiceInput({ ...valid, title: '  Title  ', description: ' Desc ', price: '12.5' }),
    ).toEqual({
      title: 'Title',
      description: 'Desc',
      priceCents: 1250,
      durationMinutes: 60,
    });
  });
});
