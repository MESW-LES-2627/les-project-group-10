import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
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
  const { user } = useAuth();
  const [data, setData] = useState<MentorOnboardingData>(DEFAULT_MENTOR_ONBOARDING_DATA);
  // until the mentor edits the name, show the one from their account (it may still be loading)
  const [nameEdited, setNameEdited] = useState(false);

  const value = useMemo<MentorOnboardingContextValue>(
    () => ({
      data: nameEdited ? data : { ...data, fullName: user?.username ?? data.fullName },
      updateData: (patch) => {
        if (patch.fullName !== undefined) setNameEdited(true);
        setData((current) => ({ ...current, ...patch }));
      },
    }),
    [data, nameEdited, user],
  );

  return (
    <MentorOnboardingContext.Provider value={value}>
      <Outlet />
    </MentorOnboardingContext.Provider>
  );
}
