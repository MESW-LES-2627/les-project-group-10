import { z } from 'zod';
import { serviceSchema } from './mentors.schemas.js';

// Adding and updating a service reuse the exact rules enforced during onboarding.
export const mentorServiceSchema = serviceSchema;
export type MentorServiceInput = z.infer<typeof mentorServiceSchema>;

export const mentorServiceActiveSchema = z.object({
  isActive: z.boolean(),
});
export type MentorServiceActiveInput = z.infer<typeof mentorServiceActiveSchema>;
