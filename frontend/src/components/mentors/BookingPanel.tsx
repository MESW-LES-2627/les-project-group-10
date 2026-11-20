import { ArrowRight, ChevronLeft, ChevronRight, Clock, Video } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui';
import type { MentorService } from '@/api/mentors';
import {
  PLATFORM_FEE,
  dayNumber,
  formatEuro,
  formatMonthYear,
  formatShortDate,
  sessionRange,
  sessionTotal,
  shiftWeek,
  startOfWeek,
  weekDates,
  weekdayLetter,
} from '@/lib/booking';
import { useMemo, useState } from 'react';

export interface BookingPanelProps {
  service: MentorService;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onContinue: () => void;
}

/**
 * Sticky booking card on a mentor profile: chosen service, a week of
 * open days, and the time slots for the selected day.
 */
export function BookingPanel({
  service,
  date,
  time,
  onDateChange,
  onTimeChange,
  onContinue,
}: BookingPanelProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(date || service.availability[0]?.date || '2026-10-20'),
  );
  const days = useMemo(() => weekDates(weekStart), [weekStart]);
  const openDays = useMemo(
    () => new Set(service.availability.map((slot) => slot.date)),
    [service.availability],
  );
  const times = service.availability.find((slot) => slot.date === date)?.times ?? [];
  const total = sessionTotal(service.price);

  return (
    <aside
      id="book"
      className="flex w-full shrink-0 flex-col gap-5 rounded-[20px] border border-line bg-surface p-6 lg:sticky lg:top-24 lg:w-95"
    >
      <p className="font-display text-2xl font-semibold tracking-tight text-ink">Book a session</p>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary-soft px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate font-sans text-sm font-semibold text-ink">{service.title}</p>
          <p className="flex items-center gap-1.5 font-sans text-xs text-ink-soft">
            {service.duration}
            <Video className="size-3.5" />
            Google Meet
          </p>
        </div>
        <p className="font-display text-xl font-bold tracking-tight text-ink">
          {formatEuro(service.price).replace('.00', '')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm font-semibold text-ink">{formatMonthYear(weekStart)}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => setWeekStart((current) => shiftWeek(current, -1))}
              className="flex size-8 items-center justify-center rounded-lg text-ink-soft hover:bg-canvas"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => setWeekStart((current) => shiftWeek(current, 1))}
              className="flex size-8 items-center justify-center rounded-lg text-ink-soft hover:bg-canvas"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const open = openDays.has(day);
            const selected = day === date;
            return (
              <button
                key={day}
                type="button"
                disabled={!open}
                onClick={() => onDateChange(day)}
                className="flex flex-col items-center gap-1 py-1 disabled:cursor-default"
              >
                <span className="font-sans text-[11px] font-medium text-ink-muted">
                  {weekdayLetter(day)}
                </span>
                <span
                  className={clsx(
                    'flex size-9 items-center justify-center rounded-full font-sans text-sm font-semibold',
                    selected && 'bg-primary text-ink-inverse',
                    !selected && open && 'text-ink hover:bg-canvas',
                    !open && 'text-ink-muted',
                  )}
                >
                  {dayNumber(day)}
                </span>
                <span
                  className={clsx(
                    'size-1 rounded-full',
                    open && !selected ? 'bg-primary' : 'bg-transparent',
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="font-sans text-sm font-medium text-ink-soft">
          Available times {date ? `· ${formatShortDate(date)}` : ''}
        </p>
        {times.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {times.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onTimeChange(slot)}
                className={clsx(
                  'h-11 rounded-[10px] border font-sans text-sm font-medium',
                  slot === time
                    ? 'border-primary bg-primary text-ink-inverse'
                    : 'border-line bg-canvas text-ink hover:border-line-strong',
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        ) : (
          <p className="font-sans text-sm text-ink-soft">
            No open times this day. Pick another date.
          </p>
        )}
        <p className="flex items-center gap-1.5 font-sans text-xs text-ink-muted">
          <Clock className="size-3.5" />
          Times shown in Lisbon time (WEST)
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <div className="flex items-center justify-between font-sans text-sm text-ink-soft">
          <span>
            {date && time
              ? `${formatShortDate(date)} · ${sessionRange(time, service.duration)}`
              : 'Choose a time'}
          </span>
        </div>
        <div className="flex items-center justify-between font-sans text-sm text-ink-soft">
          <span>Session fee</span>
          <span>{formatEuro(service.price)}</span>
        </div>
        <div className="flex items-center justify-between font-sans text-sm text-ink-soft">
          <span>Platform fee</span>
          <span>{formatEuro(PLATFORM_FEE)}</span>
        </div>
        <div className="flex items-center justify-between font-sans text-base font-semibold text-ink">
          <span>Total</span>
          <span>{formatEuro(total)}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="blue"
        fullWidth
        disabled={!date || !time}
        onClick={onContinue}
        icon={<ArrowRight className="size-4" />}
      >
        Continue to payment
      </Button>
      <p className="text-center font-sans text-xs text-ink-muted">
        Mock payment only. No real payment is taken.
      </p>
    </aside>
  );
}
