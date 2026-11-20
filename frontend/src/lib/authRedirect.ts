import type { AuthUser } from '@/api/auth';

/**
 * Where to send a user right after logging in. An admin goes to the user list
 * (the database guarantees an admin is never a student or a mentor). A mentor
 * wins if the account is both a mentor and a student; everyone else goes to
 * the dashboard.
 */
export function pathAfterLogin(user: AuthUser): string {
  if (user.isAdmin) return '/dashboard/admin/users';
  if (user.isMentor) {
    return user.onboardingFinished ? `/mentors/${user.id}` : '/mentor-onboarding/profile';
  }
  return '/dashboard';
}
