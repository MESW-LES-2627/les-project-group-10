import { z } from 'zod';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(50, 'Username is too long'),
  email: z.string().trim().toLowerCase().regex(EMAIL_REGEX, 'Enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must have at least 6 characters')
    .max(72, 'Password musy have at most 72 characters'),
});

export const registerMentorSchema = registerSchema.extend({
  bio: z
    .string()
    .trim()
    .min(1, 'Bio is required')
    .max(1000, 'Bio must have at most 1000 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});
