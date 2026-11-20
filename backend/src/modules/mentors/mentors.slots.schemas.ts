import { z } from 'zod';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const mentorSlotSchema = z.object({
  serviceId: z.guid('Choose a valid service'),
  date: z.iso.date('Enter a valid date'),
  startTime: z.string().regex(timePattern, 'Enter a valid start time (HH:MM)'),
  endTime: z.string().regex(timePattern, 'Enter a valid end time (HH:MM)'),
});

export type MentorSlotInput = z.infer<typeof mentorSlotSchema>;
