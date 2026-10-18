import type { ReactNode } from 'react';
import clsx from 'clsx';
import { OnboardingTopBar } from './OnboardingTopBar';

export interface OnboardingLayoutProps {
  step: number;
  totalSteps?: number;
  stepLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  exitLabel?: string;
  exitHref?: string;
  children: ReactNode;
  actions: ReactNode;
}

/**
 * Shared shell for a multi-step onboarding flow (mentor or student):
 * top bar with step label, progress bar, heading, form card, and
 * action row.
 */
export function OnboardingLayout({
  step,
  totalSteps = 3,
  stepLabel,
  eyebrow,
  title,
  description,
  exitLabel,
  exitHref,
  children,
  actions,
}: OnboardingLayoutProps) {
  return (
    <div className="flex w-full flex-col items-center bg-canvas">
      <OnboardingTopBar
        label={`Step ${step} of ${totalSteps} · ${stepLabel}`}
        exitLabel={exitLabel}
        exitHref={exitHref}
      />

      <div className="flex w-full max-w-190 flex-col gap-8 px-6 pb-24 pt-14">
        <div className="flex w-full gap-2">
          {Array.from({ length: totalSteps }, (_, index) => index + 1).map((index) => (
            <div
              key={index}
              className={clsx(
                'h-1.5 flex-1 rounded-full',
                index <= step ? 'bg-primary' : 'bg-line',
              )}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-tertiary">
            {eyebrow}
          </p>
          <h1 className="font-display text-5xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="max-w-170 font-sans text-lg leading-relaxed text-ink-soft">{description}</p>
        </div>

        {children}

        <div className="flex w-full items-center justify-between">{actions}</div>
      </div>
    </div>
  );
}
