import { createContext } from 'react';
import type { AuthUser, LoginInput, RegisterInput, RegisterMentorInput } from '@/api/auth';

export interface AuthContextValue {
  /** The logged-in user, or null when nobody is logged in (or still loading). */
  user: AuthUser | null;
  /** True until the first `/api/me` check has finished. */
  loading: boolean;
  /** Asks the backend who is logged in and updates `user`. */
  refresh: () => Promise<AuthUser | null>;
  /** Each of these calls the API, then reloads `user` so it includes the roles. */
  login: (input: LoginInput) => Promise<AuthUser>;
  registerStudent: (input: RegisterInput) => Promise<AuthUser>;
  registerMentor: (input: RegisterMentorInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
