/**
 * Thrown when a request completes but the response isn't ok, so callers
 * can distinguish a network failure (fetch itself throws) from an API
 * error. `code` and `fields` come from the backend's error body:
 * `{ error: { code, message, fields? } }`.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;

  constructor(
    status: number,
    message: string,
    code = 'unknown',
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

/**
 * The only function in this codebase that calls `fetch` directly.
 * Every typed resource module (e.g. `api/languages.ts`) is built on
 * top of this, so swapping transports or adding shared headers/auth
 * later is a one-file change. Relative URLs are same-origin, so the
 * browser sends the session cookie automatically.
 */
async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const data: ErrorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      data.error?.message ?? `${method} ${url} failed with ${response.status}`,
      data.error?.code,
      data.error?.fields,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>('GET', url);
}

export function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return request<T>('POST', url, body);
}

export function apiPut<T>(url: string, body: unknown): Promise<T> {
  return request<T>('PUT', url, body);
}

export function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return request<T>('PATCH', url, body);
}
