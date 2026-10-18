import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  DEFAULT_STUDENT_ONBOARDING_DATA,
  StudentOnboardingContext,
  type StudentOnboardingContextValue,
  type StudentOnboardingData,
} from './studentOnboardingContext';

/**
 * Holds the student's answers across the 2-step onboarding flow (as
 * a layout route, so it survives navigation between steps).
 */
export function StudentOnboardingProvider() {
  const [data, setData] = useState<StudentOnboardingData>(DEFAULT_STUDENT_ONBOARDING_DATA);

  const value = useMemo<StudentOnboardingContextValue>(
    () => ({
      data,
      updateData: (patch) => setData((current) => ({ ...current, ...patch })),
    }),
    [data],
  );

  return (
    <StudentOnboardingContext.Provider value={value}>
      <Outlet />
    </StudentOnboardingContext.Provider>
  );
}
