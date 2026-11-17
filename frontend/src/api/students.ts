import { apiGet } from './client';

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
