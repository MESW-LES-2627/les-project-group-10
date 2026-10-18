// runs a Zod schema on req.body and turns the failures to 400 errors, bad requests

import type { z } from 'zod';
import { HttpError } from './errorHandler.js';

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? 'body');
      fields[key] ??= issue.message; // keep the first message per field
    }
    throw new HttpError(400, 'validation_error', 'Invalid input', fields);
  }
  return result.data;
}
