import { apiGet, apiPatch } from './client';

export interface StudentInterest {
  id: string;
  name: string;
}

/**
 * The logged-in student's own profile, as returned by `GET /api/students/me`.
 * Name and email are not part of it: they come from the auth user.
 */
export interface StudentProfile {
  userId: string;
  programme: string | null;
  enrollmentYear: number | null;
  studyLevel: string | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  categoryIds: string[];
  categories: StudentInterest[];
}

/** Rejects with a 403 `ApiError` when the account has no student profile. */
export function getStudentProfile(): Promise<StudentProfile> {
  return apiGet<StudentProfile>('/api/students/me');
}

/**
 * Body of `PATCH /api/students/me`. Every field is optional: leave one out
 * to keep what is saved, send `null` to clear it. `categoryIds` replaces
 * the whole set of interests.
 */
export interface UpdateStudentProfileInput {
  programme?: string | null;
  enrollmentYear?: number | null;
  studyLevel?: string | null;
  budgetMinCents?: number | null;
  budgetMaxCents?: number | null;
  categoryIds?: string[];
}

/** Rejects with an `ApiError` (400 carries one message per field in `fields`). */
export function updateStudentProfile(input: UpdateStudentProfileInput): Promise<StudentProfile> {
  return apiPatch<StudentProfile>('/api/students/me', input);
}
