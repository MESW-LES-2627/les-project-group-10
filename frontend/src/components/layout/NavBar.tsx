import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Button, Logo, buttonVariants } from '@/components/ui';
import { useAuth } from '@/auth/useAuth';
import { getInitials } from '@/lib/mentorProfile';

const navLinks = [
  { label: 'Find a mentor', href: '/mentors' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Free resources', href: '/#resources' },
  { label: 'For mentors', href: '/#for-mentors' },
];

/**
 * Public site header: logo, nav links, and either log in / get started
 * actions or, when logged in, a profile icon and a log out button.
 */
export function NavBar() {
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

  const avatar = user && <Avatar initials={getInitials(user.username)} size="sm" />;

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
      <div className="flex items-center gap-4">
        {/* show nothing while /api/me is loading, so logged-in users don't see "Log in" flash */}
        {loading ? null : user ? (
          <>
            {user.isMentor ? (
              <Link to={`/mentors/${user.id}`} aria-label="Your profile" title="Your profile">
                {avatar}
              </Link>
            ) : (
              <span title={user.username}>{avatar}</span>
            )}
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
    </header>
  );
}
