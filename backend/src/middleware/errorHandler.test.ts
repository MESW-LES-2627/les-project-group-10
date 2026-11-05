import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { errorHandler, HttpError } from './errorHandler.js';

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('errorHandler', () => {
  it('returns the error shape with fields for an HttpError', () => {
    const res = mockResponse();
    const error = new HttpError(400, 'validation_error', 'Invalid input', { email: 'Required' });

    errorHandler(error, {} as never, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'validation_error', message: 'Invalid input', fields: { email: 'Required' } },
    });
  });

  it('returns a 500 internal_error shape for an unknown error', () => {
    const res = mockResponse();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    errorHandler(new Error('boom'), {} as never, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'internal_error', message: 'Something went wrong' },
    });
    consoleSpy.mockRestore();
  });
});
