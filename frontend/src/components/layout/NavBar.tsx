import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Avatar, Button, Logo, buttonVariants } from '@/components/ui';
import { useAuth } from '@/auth/useAuth';
import { getInitials } from '@/lib/mentorProfile';

const navLinks = [
  { label: 'Find a mentor', href: '/mentors' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Free resources', href: '/#resources' },
  { label: 'For mentors', href: '/#for-mentors' },
];

export interface NavBarProps {
  variant?: 'public' | 'student';
  /** Overrides the initials shown in the student header (defaults to the logged-in user's). */
  studentInitials?: string;
}

/**
 * Site header: logo, nav links, and either public auth actions, the
 * student sessions/notifications/avatar, or (public variant, logged in)
 * a profile avatar and a log out button.
 */
export function NavBar({ variant = 'public', studentInitials }: NavBarProps) {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      // the session is still active, so the user stays shown as logged in
      console.error('Log out failed:', error);
    } finally {
      setLoggingOut(false);
    }
  }

  const initials = studentInitials ?? (user ? getInitials(user.username) : '');

  return (
    <header className="flex h-22 w-full items-center justify-between border-b border-line bg-canvas px-6 lg:px-30">
      <Logo />
      <nav className="hidden items-center gap-9 font-sans text-base font-medium text-ink lg:flex">
        {navLinks.map((link) => (
          <Link key={link.href} to={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      {variant === 'student' ? (
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className={buttonVariants({ variant: 'outlined', size: 'md' })}>
            My sessions
          </Link>
          <button type="button" aria-label="Notifications" className="flex text-ink">
            <Bell className="size-5.5" />
          </button>
          <Avatar initials={initials} tone="tertiary" size="sm" />
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* show nothing while /api/me is loading, so logged-in users don't see "Log in" flash */}
          {loading ? null : user ? (
            <>
              <Link
                to={user.isMentor ? `/mentors/${user.id}` : '/dashboard'}
                aria-label="Your profile"
                title="Your profile"
              >
                <Avatar initials={initials} size="sm" />
              </Link>
              <Button variant="outlined" size="md" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Logging out…' : 'Log out'}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className={buttonVariants({ variant: 'outlined', size: 'md' })}>
                Log in
              </Link>
              <Link to="/signup" className={buttonVariants({ variant: 'primary', size: 'md' })}>
                Get started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
