import { ArrowRight, Calendar, Check, CheckCircle2, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, buttonVariants } from '@/components/ui';
import heroMentor from '@/assets/illustrations/hero-mentor.jpg';

const trustPoints = ['Verified mentors', 'Pay only per session', 'No subscription'];

/**
 * Landing page hero: headline, CTAs and the illustrated collage.
 */
export function Hero() {
  return (
    <div className="flex w-full flex-col items-center gap-16 px-6 pb-16 pt-14 lg:flex-row lg:px-30">
      <div className="flex flex-1 flex-col items-start gap-6">
        <div className="flex items-center gap-2.5">
          <span className="h-4.5 w-1.5 shrink-0 rounded-[1px] bg-tertiary" />
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-tertiary">
            For FEUP students &amp; alumni
          </p>
        </div>

        <h1 className="font-display text-5xl font-extrabold leading-[0.98] tracking-tight text-ink sm:text-6xl lg:max-w-140 lg:text-[68px]">
          Find the mentor who gets you.
        </h1>

        <p className="font-sans text-lg leading-relaxed text-ink-soft lg:max-w-130">
          Learn from tutors, mentors and industry pros who&rsquo;ve walked your path. Compare fees,
          book a session and get real answers — one clear step at a time.
        </p>

        <div className="flex flex-wrap items-start gap-3.5">
          <Link to="/mentors" className={buttonVariants({ variant: 'blue' })}>
            Find a mentor
            <ArrowRight className="size-5" />
          </Link>
          <Link to="/#how-it-works" className={buttonVariants({ variant: 'outlined' })}>
            How it works
          </Link>
        </div>

        <div className="flex flex-wrap gap-7">
          {trustPoints.map((point) => (
            <div key={point} className="flex items-center gap-2">
              <Check className="size-4 text-tertiary" />
              <p className="font-sans text-sm text-ink-soft">{point}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative hidden h-140 w-150 shrink-0 lg:block">
        <div className="absolute left-7.5 top-5 h-125 w-135 overflow-hidden rounded-3xl">
          <img src={heroMentor} alt="" className="size-full object-cover" />
        </div>

        <div className="absolute -left-4 top-115 w-84.75 rotate-3">
          <div className="flex items-center gap-3.5 rounded-2xl bg-surface p-4.5 shadow-[0px_16px_40px_0px_rgba(13,43,36,0.3)]">
            <Avatar initials="MS" size="md" />
            <div className="flex flex-col gap-1">
              <p className="font-display text-lg font-semibold tracking-tight text-ink">
                Pius Osuji
              </p>
              <p className="font-sans text-sm text-ink-muted">Software Engineering · €35/session</p>
              <div className="flex items-center gap-1">
                <Star className="size-3.5 fill-accent text-accent" />
                <p className="font-sans text-xs font-medium text-ink-muted">4.9 · 128 reviews</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-87.5 top-0 w-49.5 -rotate-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-accent px-4.5 py-3.5 shadow-[0px_12px_28px_0px_rgba(13,43,36,0.25)]">
            <Sparkles className="size-5 text-primary" />
            <p className="font-sans text-base font-semibold leading-snug text-primary">
              Book. Pay. Learn.
              <br />
              All in one place.
            </p>
          </div>
        </div>

        <div className="absolute left-89.75 top-40 w-53.5 rotate-2">
          <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
            <Calendar className="size-4 text-ink-inverse" />
            <p className="font-sans text-sm font-medium text-ink-inverse">
              Next session · Tue 14:00
            </p>
          </div>
        </div>

        <div className="absolute left-2 top-24 w-53.75 rotate-4">
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 shadow-[0px_8px_20px_0px_rgba(13,43,36,0.15)]">
            <CheckCircle2 className="size-4 text-primary" />
            <p className="font-sans text-sm font-medium text-ink">1,200+ students helped</p>
          </div>
        </div>
      </div>
    </div>
  );
}
