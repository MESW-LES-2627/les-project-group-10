import { z } from 'zod';

const serviceSchema = z.object({
  title: z.string().trim().min(1, 'Service name is required').max(100, 'Service name is too long'),
  description: z
    .string()
    .trim()
    .min(1, 'Service description is required')
    .max(500, 'Service description is too long'),
  priceCents: z
    .number()
    .int('Fee must be a whole number of cents')
    .min(50, 'Fee must be at least €0.50')
    .max(100_000, 'Fee must be at most €1000'),
  durationMinutes: z
    .number()
    .int('Duration must be a whole number of minutes')
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration must be at most 8 hours'),
});

// everything the mentor onboarding collects, except availability (not modeled yet)
export const mentorOnboardingSchema = z.object({
  username: z.string().trim().min(1, 'Full name is required').max(50, 'Full name is too long'),
  location: z.string().trim().min(1, 'Location is required').max(100, 'Location is too long'),
  languages: z
    .array(z.string().trim().min(1).max(50))
    .min(1, 'Pick at least one language')
    .max(10, 'Pick at most 10 languages'),
  linkedinUrl: z.string().trim().max(200, 'Link is too long').default(''),
  tagline: z.string().trim().min(1, 'Intro is required').max(120, 'Intro is too long'),
  headline: z.string().trim().min(1, 'Headline is required').max(120, 'Headline is too long'),
  subjects: z
    .array(z.string().trim().min(1))
    .min(1, 'Choose at least one subject')
    .max(4, 'Choose at most 4 subjects'),
  skills: z
    .array(z.string().trim().min(1).max(40, 'A skill is too long'))
    .max(15, 'Add at most 15 skills'),
  services: z
    .array(serviceSchema)
    .min(1, 'Add at least one service')
    .max(10, 'Add at most 10 services'),
  bio: z
    .string()
    .trim()
    .min(1, 'Bio is required')
    .max(1000, 'Bio must have at most 1000 characters'),
});

export type MentorOnboardingInput = z.infer<typeof mentorOnboardingSchema>;
