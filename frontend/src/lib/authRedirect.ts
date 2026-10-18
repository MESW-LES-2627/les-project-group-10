import type { AuthUser } from '@/api/auth';

/**
 * Where to send a user right after logging in. A mentor wins if the
 * account has both roles. There is no student homepage yet, so a
 * student-only user goes to the landing page for now.
 */
export function pathAfterLogin(user: AuthUser): string {
  if (user.isMentor) {
    return user.onboardingFinished ? `/mentors/${user.id}` : '/mentor-onboarding/profile';
  }
  return '/';
}
