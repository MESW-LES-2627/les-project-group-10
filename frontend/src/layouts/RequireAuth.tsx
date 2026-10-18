import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

/**
 * Sends logged-out visitors to login, remembering the page they wanted.
 * Waits for the first `/api/me` check so a logged-in user isn't bounced.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}
