import { Calendar, Sparkles, Star } from 'lucide-react';
import { Avatar } from '@/components/ui';

/**
 * Floating mentor-preview / sticker / session-pill collage used on
 * both the login and sign-up brand panels.
 */
export function BrandCollage() {
  return (
    <div className="relative hidden h-62.5 w-122 md:block">
      <div className="absolute left-2 top-3 w-87 -rotate-3">
        <div className="flex items-center gap-3.5 rounded-2xl bg-surface p-4.5 shadow-[0px_16px_40px_0px_rgba(13,43,36,0.3)]">
          <Avatar initials="PO" size="md" />
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-semibold tracking-tight text-ink">Pius Osuji</p>
            <p className="font-sans text-sm text-ink-soft">Software Engineering · €35 / session</p>
            <div className="flex items-center gap-1">
              <Star className="size-3.5 fill-accent text-accent" />
              <p className="font-sans text-xs font-medium text-ink-soft">4.9 · 128 reviews</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-66 top-35 w-49.75 rotate-5">
        <div className="flex items-center gap-2.5 rounded-xl bg-accent px-4.5 py-3.5 shadow-[0px_12px_28px_0px_rgba(13,43,36,0.25)]">
          <Sparkles className="size-5 text-primary" />
          <p className="font-sans text-base font-semibold leading-snug text-primary">
            Book. Pay. Learn.
            <br />
            All in one place.
          </p>
        </div>
      </div>

      <div className="absolute left-5.75 top-42.5 w-53.5 rotate-2">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
          <Calendar className="size-4 text-ink-inverse" />
          <p className="font-sans text-sm font-medium text-ink-inverse">Next session · Tue 14:00</p>
        </div>
      </div>
    </div>
  );
}
