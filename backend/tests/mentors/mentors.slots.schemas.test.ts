import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { mentorSlotSchema } from '../../src/modules/mentors/mentors.slots.schemas.js';

const validInput = {
  serviceId: randomUUID(),
  date: '2030-01-15',
  startTime: '09:00',
  endTime: '10:00',
};

describe('mentorSlotSchema', () => {
  it('accepts valid input', () => {
    expect(mentorSlotSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects a non-uuid serviceId', () => {
    expect(mentorSlotSchema.safeParse({ ...validInput, serviceId: 'not-a-uuid' }).success).toBe(
      false,
    );
  });

  it.each(['2030-01-32', '15/01/2030', ''])('rejects an invalid date: %s', (date) => {
    expect(mentorSlotSchema.safeParse({ ...validInput, date }).success).toBe(false);
  });

  it.each(['9:00', '25:00', '09:60', 'noon', ''])(
    'rejects an invalid startTime: %s',
    (startTime) => {
      expect(mentorSlotSchema.safeParse({ ...validInput, startTime }).success).toBe(false);
    },
  );

  it('rejects missing fields', () => {
    const { date: _date, ...rest } = validInput;
    void _date;
    expect(mentorSlotSchema.safeParse(rest).success).toBe(false);
  });
});
