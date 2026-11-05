import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseBody } from '../../src/middleware/validate.js';
import { HttpError } from '../../src/middleware/errorHandler.js';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().int(),
});

describe('parseBody', () => {
  it('returns the parsed data for valid input', () => {
    expect(parseBody(schema, { name: 'Jane', age: 30 })).toEqual({ name: 'Jane', age: 30 });
  });

  it('throws a 400 HttpError with field errors for invalid input', () => {
    try {
      parseBody(schema, { name: '', age: 'not-a-number' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      const httpError = error as HttpError;
      expect(httpError.status).toBe(400);
      expect(httpError.code).toBe('validation_error');
      expect(httpError.fields).toMatchObject({ name: 'Name is required' });
      expect(httpError.fields).toHaveProperty('age');
    }
  });
});
