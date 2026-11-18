import { describe, expect, it } from 'vitest';
import {
  mentorServiceActiveSchema,
  mentorServiceSchema,
} from '../../src/modules/mentors/mentors.services.schemas.js';

const valid = {
  title: 'Mock interview',
  description: 'Practice interview with feedback.',
  priceCents: 3000,
  durationMinutes: 60,
};

describe('mentorServiceSchema', () => {
  it('accepts a valid service', () => {
    expect(mentorServiceSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['title', 'description'] as const)('rejects a blank %s', (field) => {
    const result = mentorServiceSchema.safeParse({ ...valid, [field]: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative price', () => {
    const result = mentorServiceSchema.safeParse({ ...valid, priceCents: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects a price with more than two decimal places (a fractional cent)', () => {
    const result = mentorServiceSchema.safeParse({ ...valid, priceCents: 3000.5 });
    expect(result.success).toBe(false);
  });

  it.each([0, -5])('rejects a non-positive duration (%d)', (durationMinutes) => {
    const result = mentorServiceSchema.safeParse({ ...valid, durationMinutes });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const { title: _title, ...rest } = valid;
    void _title;
    expect(mentorServiceSchema.safeParse(rest).success).toBe(false);
  });
});

describe('mentorServiceActiveSchema', () => {
  it('accepts a boolean isActive', () => {
    expect(mentorServiceActiveSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(mentorServiceActiveSchema.safeParse({ isActive: true }).success).toBe(true);
  });

  it('rejects a non-boolean isActive', () => {
    expect(mentorServiceActiveSchema.safeParse({ isActive: 'false' }).success).toBe(false);
    expect(mentorServiceActiveSchema.safeParse({}).success).toBe(false);
  });
});
