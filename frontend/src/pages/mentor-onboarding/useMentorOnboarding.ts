import { useContext } from 'react';
import { MentorOnboardingContext } from './mentorOnboardingContext';

/**
 * Reads the shared mentor onboarding answers. Must be called from a
 * route nested under `MentorOnboardingProvider`.
 */
export function useMentorOnboarding() {
  const context = useContext(MentorOnboardingContext);
  if (!context) {
    throw new Error(
      'useMentorOnboarding must be used within a route nested under MentorOnboardingProvider',
    );
  }
  return context;
}
