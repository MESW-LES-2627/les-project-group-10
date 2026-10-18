import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { readSession } from '@/lib/auth';

/**
 * Sends logged-out visitors to login, remembering the page they wanted.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!readSession()) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}
