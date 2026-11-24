import { z } from 'zod';

export const mentorPostSchema = z.strictObject({
  title: z.string().trim().min(1, 'Post title is required').max(150, 'Post title is too long'),
  body: z
    .string()
    .trim()
    .min(1, 'Post content is required')
    .max(10_000, 'Post content is too long'),
});

export type MentorPostInput = z.infer<typeof mentorPostSchema>;
