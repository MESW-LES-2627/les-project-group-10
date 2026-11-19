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
    isAdmin: false,
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

  it('sends an admin with no student or mentor role to the user list', () => {
    const user = buildUser({ isAdmin: true });
    expect(pathAfterLogin(user)).toBe('/dashboard/admin/users');
  });

  it('keeps an admin who is also a student on the dashboard', () => {
    const user = buildUser({ isAdmin: true, isStudent: true });
    expect(pathAfterLogin(user)).toBe('/dashboard');
  });

  it('keeps an admin who is also a mentor on the mentor path', () => {
    const user = buildUser({ isAdmin: true, isMentor: true, onboardingFinished: true });
    expect(pathAfterLogin(user)).toBe(`/mentors/${user.id}`);
  });
});
