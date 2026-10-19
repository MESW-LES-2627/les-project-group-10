import { CreditCard, SlidersHorizontal, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionHeading } from '@/components/ui';

const steps: { icon: LucideIcon; number: string; title: string; description: string }[] = [
  {
    icon: SlidersHorizontal,
    number: '01',
    title: 'Find your mentor',
    description: 'Search by subject, budget and availability. Compare fees and read real reviews.',
  },
  {
    icon: CreditCard,
    number: '02',
    title: 'Book & pay securely',
    description: 'Pick a time, complete a mock payment, and get an instant booking confirmation.',
  },
  {
    icon: Video,
    number: '03',
    title: 'Meet & learn',
    description:
      'Prepare for your session. Meeting links and chat are not yet available in this prototype.',
  },
];

/**
 * Landing page "Three steps to your first session" step cards.
 */
export function HowItWorks() {
  return (
    <div id="how-it-works" className="flex w-full flex-col items-center gap-12 px-6 py-20 lg:px-30">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps to your first session"
        align="center"
      />

      <div className="flex w-full flex-col gap-8 lg:flex-row">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex flex-1 flex-col gap-4 rounded-[20px] border border-line bg-surface p-7"
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft">
                <step.icon className="size-6 text-primary" />
              </span>
              <p className="font-display text-[32px] font-bold tracking-tight text-line">
                {step.number}
              </p>
            </div>
            <p className="font-display text-lg font-semibold tracking-tight text-ink">
              {step.title}
            </p>
            <p className="font-sans text-sm text-ink-soft">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
