import { useContext } from 'react';
import { StudentOnboardingContext } from './studentOnboardingContext';

/**
 * Reads the shared student onboarding answers. Must be called from
 * a route nested under `StudentOnboardingProvider`.
 */
export function useStudentOnboarding() {
  const context = useContext(StudentOnboardingContext);
  if (!context) {
    throw new Error(
      'useStudentOnboarding must be used within a route nested under StudentOnboardingProvider',
    );
  }
  return context;
}
