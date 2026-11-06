import { createBrowserRouter } from 'react-router-dom';
import EditMentorProfilePage from '@/pages/mentors/EditMentorProfilePage';
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
import { StudentOnboardingProvider } from '@/pages/student-onboarding/StudentOnboardingProvider';
import StudentInterestsStep from '@/pages/student-onboarding/StudentInterestsStep';
import StudentPreferencesStep from '@/pages/student-onboarding/StudentPreferencesStep';
import StudentAllSetPage from '@/pages/student-onboarding/StudentAllSetPage';
import StudentDashboardPage from '@/pages/dashboard/StudentDashboardPage';
import FindMentorsPage from '@/pages/mentors/FindMentorsPage';
import MentorProfilePage from '@/pages/mentors/MentorProfilePage';
import CheckoutPage from '@/pages/mentors/CheckoutPage';
import BookingConfirmedPage from '@/pages/mentors/BookingConfirmedPage';
import DashboardFindMentorsPage from '@/pages/dashboard/DashboardFindMentorsPage';
import { RequireAuth } from '@/layouts/RequireAuth';

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
    path: '/dashboard',
    element: (
      <RequireAuth>
        <StudentDashboardPage />
      </RequireAuth>
    ),
  },
  {
    path: '/dashboard/mentors',
    element: (
      <RequireAuth>
        <DashboardFindMentorsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/dashboard/profile',
    element: (
      <RequireAuth>
        <EditMentorProfilePage />
      </RequireAuth>
    ),
  },
  { path: '/mentors', element: <FindMentorsPage /> },
  {
    path: '/mentors/:mentorId',
    element: <MentorProfilePage />,
  },
  {
    path: '/mentors/:mentorId/checkout',
    element: (
      <RequireAuth>
        <CheckoutPage />
      </RequireAuth>
    ),
  },
  {
    path: '/mentors/:mentorId/booked',
    element: (
      <RequireAuth>
        <BookingConfirmedPage />
      </RequireAuth>
    ),
  },
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
  {
    path: '/student-onboarding',
    element: <StudentOnboardingProvider />,
    children: [
      { path: 'interests', element: <StudentInterestsStep /> },
      { path: 'preferences', element: <StudentPreferencesStep /> },
      { path: 'all-set', element: <StudentAllSetPage /> },
    ],
  },
]);
