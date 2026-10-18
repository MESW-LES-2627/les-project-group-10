import { createBrowserRouter } from 'react-router-dom';
import LandingPage from '@/pages/landing/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import SignUpPage from '@/pages/auth/SignUpPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import { MentorOnboardingProvider } from '@/pages/mentor-onboarding/MentorOnboardingProvider';
import MentorProfileStep from '@/pages/mentor-onboarding/MentorProfileStep';
import MentorExpertiseStep from '@/pages/mentor-onboarding/MentorExpertiseStep';
import MentorAvailabilityStep from '@/pages/mentor-onboarding/MentorAvailabilityStep';
import MentorPendingVerificationPage from '@/pages/mentor-onboarding/MentorPendingVerificationPage';

/**
 * App-wide route table.
 */
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/mentor-onboarding',
    element: <MentorOnboardingProvider />,
    children: [
      { path: 'profile', element: <MentorProfileStep /> },
      { path: 'expertise', element: <MentorExpertiseStep /> },
      { path: 'availability', element: <MentorAvailabilityStep /> },
      { path: 'pending', element: <MentorPendingVerificationPage /> },
    ],
  },
]);
