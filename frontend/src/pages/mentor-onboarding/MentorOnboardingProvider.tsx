import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  DEFAULT_MENTOR_ONBOARDING_DATA,
  MentorOnboardingContext,
  type MentorOnboardingContextValue,
  type MentorOnboardingData,
} from './mentorOnboardingContext';

/**
 * Holds the mentor's answers across the 3-step onboarding flow (as a
 * layout route, so it survives navigation between steps) so later
 * steps and the final preview can reflect what was entered earlier.
 */
export function MentorOnboardingProvider() {
  const [data, setData] = useState<MentorOnboardingData>(DEFAULT_MENTOR_ONBOARDING_DATA);

  const value = useMemo<MentorOnboardingContextValue>(
    () => ({
      data,
      updateData: (patch) => setData((current) => ({ ...current, ...patch })),
    }),
    [data],
  );

  return (
    <MentorOnboardingContext.Provider value={value}>
      <Outlet />
    </MentorOnboardingContext.Provider>
  );
}
