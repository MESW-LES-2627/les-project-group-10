import type { ReactNode } from 'react';
import { Logo } from '@/components/ui';
import { BrandCollage } from '@/components/auth/BrandCollage';
import { AuthStats } from '@/components/auth/AuthStats';

export interface AuthLayoutProps {
  eyebrow: string;
  headline: ReactNode;
  subcopy: string;
  children: ReactNode;
}

/**
 * Shared two-column shell for the auth screens: dark brand panel on
 * the left, form content (passed as children) on the right.
 */
export function AuthLayout({ eyebrow, headline, subcopy, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full items-stretch bg-canvas">
      <aside className="hidden w-150 shrink-0 flex-col justify-between bg-primary p-14 lg:flex">
        <Logo variant="onDark" />

        <div className="flex flex-col gap-5">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-accent">{eyebrow}</p>
          <h1 className="max-w-120 font-display text-[56px] font-bold leading-[1.08] tracking-tight text-ink-inverse">
            {headline}
          </h1>
          <p className="max-w-115 font-sans text-lg leading-relaxed text-primary-soft">{subcopy}</p>
          <BrandCollage />
        </div>

        <AuthStats />
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-115">{children}</div>
      </main>
    </div>
  );
}
