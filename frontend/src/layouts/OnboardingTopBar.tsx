import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui';

export interface OnboardingTopBarProps {
  label: string;
  exitLabel?: string;
  exitHref?: string;
}

/**
 * Top bar shared by every screen in the mentor onboarding flow (the
 * 3 form steps and the post-submit review screen): logo, a status
 * label, and an exit link — so the flow reads as one continuous
 * piece rather than switching to the public site header mid-way.
 */
export function OnboardingTopBar({
  label,
  exitLabel = 'Save & exit',
  exitHref = '/',
}: OnboardingTopBarProps) {
  return (
    <header className="flex h-22 w-full items-center justify-between border-b border-line px-6 lg:px-30">
      <Logo />
      <p className="hidden font-sans text-sm font-medium text-ink-soft sm:block">{label}</p>
      <Link to={exitHref} className="font-sans text-base font-semibold text-secondary">
        {exitLabel}
      </Link>
    </header>
  );
}
