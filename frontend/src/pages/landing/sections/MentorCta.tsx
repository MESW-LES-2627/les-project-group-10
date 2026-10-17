import { ArrowRight, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui';

const perks: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: CreditCard, title: 'You set the price', description: 'From €10 to €100+ per session' },
  { icon: Calendar, title: 'You set the hours', description: 'Open only the slots that work for you' },
  { icon: ShieldCheck, title: 'Secure, verified payouts', description: 'Tracked automatically after each session' },
];

/**
 * Landing page "For mentors" call-to-action banner with perk list.
 */
export function MentorCta() {
  return (
    <div className="flex w-full flex-col items-start gap-12 bg-primary px-6 py-16 lg:flex-row lg:items-center lg:px-30">
      <div className="flex flex-1 flex-col gap-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-accent">For mentors</p>
        <p className="font-display text-4xl font-bold leading-tight tracking-tight text-ink-inverse lg:max-w-130 lg:text-5xl">
          Share what you know. Get paid for your time.
        </p>
        <p className="font-sans text-lg leading-relaxed text-primary-soft lg:max-w-125">
          Set your own fee, choose your hours, and help students one session at a time. FEUP Connect handles
          booking, payment and scheduling.
        </p>
        <div className="flex flex-wrap gap-3.5">
          <Link to="/signup" className={buttonVariants({ variant: 'inverted' })}>
            Become a mentor
            <ArrowRight className="size-5" />
          </Link>
          <Link to="/#how-it-works" className={buttonVariants({ variant: 'inverted' })}>
            See how it works
          </Link>
        </div>
      </div>

      <div className="flex w-full flex-col gap-5 lg:w-80 lg:shrink-0">
        {perks.map((perk) => (
          <div key={perk.title} className="flex items-center gap-3.5 rounded-2xl bg-primary-strong p-4.5">
            <perk.icon className="size-5.5 shrink-0 text-ink-inverse" />
            <div className="flex flex-col gap-0.5">
              <p className="font-sans text-base font-semibold text-ink-inverse">{perk.title}</p>
              <p className="font-sans text-xs font-medium text-primary-soft">{perk.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
