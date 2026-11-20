import { apiGet, apiPost } from './client';

/**
 * The logged-in user as returned by `GET /api/me`.
 */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  isStudent: boolean;
  isMentor: boolean;
  isAdmin: boolean;
  onboardingFinished: boolean;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export type RegisterMentorInput = RegisterInput;

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * The session cookie is HttpOnly, so the frontend can only learn who is
 * logged in by asking the backend. Rejects with a 401 `ApiError` when
 * nobody is logged in.
 */
export async function getMe(): Promise<AuthUser> {
  const { user } = await apiGet<{ user: AuthUser }>('/api/me');
  return user;
}

export function registerStudent(input: RegisterInput): Promise<unknown> {
  return apiPost('/api/auth/register', input);
}

export function registerMentor(input: RegisterMentorInput): Promise<unknown> {
  return apiPost('/api/auth/register-mentor', input);
}

export function login(input: LoginInput): Promise<unknown> {
  return apiPost('/api/auth/login', input);
}

export function logout(): Promise<void> {
  return apiPost('/api/auth/logout');
}
