import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/api/auth';
import { pathAfterLogin } from '@/lib/authRedirect';

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    username: 'jane',
    email: 'jane@example.com',
    isStudent: false,
    isMentor: false,
    onboardingFinished: false,
    ...overrides,
  };
}

describe('pathAfterLogin', () => {
  it('sends a student to the dashboard', () => {
    const user = buildUser({ isStudent: true, isMentor: false });
    expect(pathAfterLogin(user)).toBe('/dashboard');
  });

  it('sends a mentor who finished onboarding to their profile', () => {
    const user = buildUser({ isMentor: true, onboardingFinished: true });
    expect(pathAfterLogin(user)).toBe(`/mentors/${user.id}`);
  });

  it('sends a mentor who has not finished onboarding to the onboarding flow', () => {
    const user = buildUser({ isMentor: true, onboardingFinished: false });
    expect(pathAfterLogin(user)).toBe('/mentor-onboarding/profile');
  });
});
