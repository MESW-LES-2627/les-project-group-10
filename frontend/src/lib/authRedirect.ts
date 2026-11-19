import type { AuthUser } from '@/api/auth';

/**
 * Where to send a user right after logging in. A mentor wins if the
 * account has both roles; an admin with no student or mentor role goes to
 * the user list; everyone else goes to the dashboard.
 */
export function pathAfterLogin(user: AuthUser): string {
  if (user.isMentor) {
    return user.onboardingFinished ? `/mentors/${user.id}` : '/mentor-onboarding/profile';
  }
  if (user.isAdmin && !user.isStudent) return '/dashboard/admin/users';
  return '/dashboard';
}
