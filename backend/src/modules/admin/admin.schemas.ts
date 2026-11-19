import { z } from 'zod';

export const MAX_PAGE_SIZE = 50;

// Query-string values always arrive as strings, so they are coerced to numbers.
// A missing value falls back to the default; anything else invalid becomes a 400.
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
