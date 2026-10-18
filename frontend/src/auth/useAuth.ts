import { useContext } from 'react';
import { AuthContext } from './authContext';

/**
 * Reads the logged-in user and the login, register and logout actions.
 * Must be called under `AuthProvider`.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
