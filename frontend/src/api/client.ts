/**
 * Thrown by `apiGet` when a request completes but the response isn't
 * ok, so callers can distinguish network failure from an API error.
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * The only function in this codebase that calls `fetch` directly.
 * Every typed resource module (e.g. `api/languages.ts`) is built on
 * top of this, so swapping transports or adding shared headers/auth
 * later is a one-file change.
 */
export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${url} failed with ${response.status}`);
  }
  return response.json();
}
