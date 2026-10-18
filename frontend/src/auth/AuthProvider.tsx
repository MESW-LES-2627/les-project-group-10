import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '@/api/auth';
import type { AuthUser } from '@/api/auth';
import { ApiError } from '@/api/client';
import { signIn, signOut } from '@/lib/auth';
import { AuthContext, type AuthContextValue } from './authContext';

/**
 * Keeps track of the logged-in user for the whole app. The session
 * cookie is HttpOnly, so on load (and after login or register) it asks
 * `GET /api/me`: a user means logged in, a 401 means nobody is.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
      return me;
    } catch (error) {
      // 401 (logged out) and 403 (banned) both mean "no usable session"
      if (!(error instanceof ApiError)) console.error('Could not load the current user:', error);
      setUser(null);
      return null;
    }
  }, []);

  // first check when the app loads; `cancelled` ignores a result that arrives after unmount
  useEffect(() => {
    let cancelled = false;
    authApi
      .getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((error: unknown) => {
        // a 401 just means nobody is logged in
        if (!(error instanceof ApiError)) console.error('Could not load the current user:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The dashboard and booking pages still read a session from localStorage (lib/auth.ts).
  // Mirror the real, cookie-based session into it so the two never disagree.
  useEffect(() => {
    if (loading) return;
    if (user) signIn(user.isMentor ? 'mentor' : 'student');
    else signOut();
  }, [user, loading]);

  const value = useMemo<AuthContextValue>(() => {
    async function requireUser(): Promise<AuthUser> {
      const me = await refresh();
      if (!me) throw new Error('Could not load your account. Please try again.');
      return me;
    }

    return {
      user,
      loading,
      refresh,
      login: async (input) => {
        await authApi.login(input);
        return requireUser();
      },
      registerStudent: async (input) => {
        await authApi.registerStudent(input);
        return requireUser();
      },
      registerMentor: async (input) => {
        await authApi.registerMentor(input);
        return requireUser();
      },
      logout: async () => {
        await authApi.logout();
        setUser(null);
      },
    };
  }, [user, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
