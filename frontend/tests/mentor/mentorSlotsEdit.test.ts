import { describe, expect, it } from 'vitest';
import { validateMentorSlotDraft } from '@/lib/mentorSlots';

const valid = { serviceId: 'service-1', date: '2030-01-01', startTime: '09:00', endTime: '10:00' };

describe('mentor slot draft validation', () => {
  it('accepts a valid draft', () => {
    expect(validateMentorSlotDraft(valid)).toEqual({});
  });

  it('requires a service', () => {
    expect(validateMentorSlotDraft({ ...valid, serviceId: '' })).toHaveProperty('serviceId');
  });

  it('requires a date', () => {
    expect(validateMentorSlotDraft({ ...valid, date: '' })).toHaveProperty('date');
  });

  it.each(['', '9:00', '25:00', '09:60'])('rejects an invalid startTime %s', (startTime) => {
    expect(validateMentorSlotDraft({ ...valid, startTime })).toHaveProperty('startTime');
  });

  it('rejects an end time at or before the start time', () => {
    expect(
      validateMentorSlotDraft({ ...valid, startTime: '10:00', endTime: '10:00' }),
    ).toHaveProperty('endTime');
    expect(
      validateMentorSlotDraft({ ...valid, startTime: '10:00', endTime: '09:00' }),
    ).toHaveProperty('endTime');
  });
});
