import { apiGet } from './client';

/** One row of the admin Students tab. `alsoMentor` is true when the account is a mentor too. */
export interface AdminStudent {
  id: string;
  username: string;
  email: string;
  isBanned: boolean;
  createdAt: string;
  alsoMentor: boolean;
}

/** One row of the admin Mentors tab. `alsoStudent` is true when the account is a student too. */
export interface AdminMentor {
  id: string;
  username: string;
  email: string;
  isBanned: boolean;
  createdAt: string;
  alsoStudent: boolean;
}

/** One page of a list. `total` counts every row, not just this page. */
export interface AdminUserPage<T> {
  users: T[];
  page: number;
  pageSize: number;
  total: number;
}

function pageQuery(page: number, pageSize: number) {
  return `?page=${page}&pageSize=${pageSize}`;
}

/** Rejects with a 401 or 403 `ApiError` when the caller is not a signed-in admin. */
export function getAdminStudents(page: number, pageSize: number) {
  return apiGet<AdminUserPage<AdminStudent>>(`/api/admin/students${pageQuery(page, pageSize)}`);
}

/** Rejects with a 401 or 403 `ApiError` when the caller is not a signed-in admin. */
export function getAdminMentors(page: number, pageSize: number) {
  return apiGet<AdminUserPage<AdminMentor>>(`/api/admin/mentors${pageQuery(page, pageSize)}`);
}
