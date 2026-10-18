const SESSION_KEY = 'feup-connect-session';

export type SessionRole = 'student' | 'mentor';

export interface Session {
  role: SessionRole;
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed?.role === 'student' || parsed?.role === 'mentor') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function signIn(role: SessionRole) {
  const session: Session = { role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Profile and checkout stay behind sign-in. Logged-out visitors are
 * sent to login and brought back to `path` afterwards.
 */
export function gatePath(path: string) {
  if (readSession()) return path;
  return `/login?next=${encodeURIComponent(path)}`;
}

export function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}
