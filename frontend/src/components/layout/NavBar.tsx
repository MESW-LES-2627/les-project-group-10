import { Link } from 'react-router-dom';
import { Logo, buttonVariants } from '@/components/ui';

const navLinks = [
  { label: 'Find a mentor', href: '/mentors' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Free resources', href: '/#resources' },
  { label: 'For mentors', href: '/#for-mentors' },
];

/**
 * Public site header: logo, nav links, and log in / get started actions.
 */
export function NavBar() {
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
        <Link to="/login" className={buttonVariants({ variant: 'outlined', size: 'md' })}>
          Log in
        </Link>
        <Link to="/signup" className={buttonVariants({ variant: 'primary', size: 'md' })}>
          Get started
        </Link>
      </div>
    </header>
  );
}
