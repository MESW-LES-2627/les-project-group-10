import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export interface LogoProps {
  /** Which background the logo sits on, so colors keep contrast. */
  variant?: 'onLight' | 'onDark';
  /** Where the wordmark links. Defaults to the public home page. */
  to?: string;
  className?: string;
}

/**
 * FEUP Connect wordmark, linking home. `variant` picks light- or
 * dark-background colors.
 */
export function Logo({ variant = 'onLight', to = '/', className }: LogoProps) {
  const onDark = variant === 'onDark';

  return (
    <Link to={to} className={clsx('inline-flex items-center gap-2.5', className)}>
      <span
        className={clsx(
          'flex size-10 items-center justify-center rounded-[10px]',
          onDark ? 'bg-accent' : 'bg-primary',
        )}
      >
        <ArrowUpRight
          className={clsx('size-5.5', onDark ? 'text-primary' : 'text-ink-inverse')}
          strokeWidth={2.5}
        />
      </span>
      <span
        className={clsx(
          'font-display text-[28px] font-bold tracking-tight',
          onDark ? 'text-ink-inverse' : 'text-primary',
        )}
      >
        feup<span className={onDark ? 'text-accent' : 'text-tertiary'}>.</span>connect
      </span>
    </Link>
  );
}
