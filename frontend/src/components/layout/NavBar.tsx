import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Avatar, Logo, buttonVariants } from '@/components/ui';

const navLinks = [
  { label: 'Find a mentor', href: '/mentors' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Free resources', href: '/#resources' },
  { label: 'For mentors', href: '/#for-mentors' },
];

export interface NavBarProps {
  variant?: 'public' | 'student';
  studentInitials?: string;
}

/**
 * Site header: logo, nav links, and either public auth actions or
 * the logged-in student's sessions/notifications/avatar.
 */
export function NavBar({ variant = 'public', studentInitials = 'AO' }: NavBarProps) {
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
      {variant === 'public' ? (
        <div className="flex items-center gap-4">
          <Link to="/login" className={buttonVariants({ variant: 'outlined', size: 'md' })}>
            Log in
          </Link>
          <Link to="/signup" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            Get started
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className={buttonVariants({ variant: 'outlined', size: 'md' })}>
            My sessions
          </Link>
          <button type="button" aria-label="Notifications" className="flex text-ink">
            <Bell className="size-5.5" />
          </button>
          <Avatar initials={studentInitials} tone="tertiary" size="sm" />
        </div>
      )}
    </header>
  );
}
