import type { Mentor, MentorService } from '@/api/mentors';

export const PLATFORM_FEE = 1.5;

export interface BookingSelection {
  serviceId: string;
  date: string;
  time: string;
}

export function firstName(name: string) {
  return name.split(' ')[0] ?? name;
}

export function parseDurationMinutes(duration: string) {
  const match = duration.match(/(\d+)/);
  return match ? Number(match[1]) : 60;
}

export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number);
  const total = (hours ?? 0) * 60 + (mins ?? 0) + minutes;
  const nextHours = Math.floor(total / 60) % 24;
  const nextMins = total % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMins).padStart(2, '0')}`;
}

export function sessionRange(start: string, duration: string) {
  return `${start} – ${addMinutes(start, parseDurationMinutes(duration))}`;
}

export function formatEuro(amount: number) {
  return `€${amount.toFixed(2)}`;
}

function atNoon(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`);
}

export function formatShortDate(isoDate: string) {
  return atNoon(isoDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatTicketDate(isoDate: string) {
  return atNoon(isoDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatLongDate(isoDate: string) {
  return atNoon(isoDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatMonthYear(isoDate: string) {
  return atNoon(isoDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function startOfWeek(isoDate: string) {
  const date = atNoon(isoDate);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return toIsoDate(date);
}

export function shiftWeek(isoDate: string, weeks: number) {
  const date = atNoon(isoDate);
  date.setDate(date.getDate() + weeks * 7);
  return toIsoDate(date);
}

export function weekDates(weekStart: string) {
  const start = atNoon(weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toIsoDate(date);
  });
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function weekdayLetter(isoDate: string) {
  return atNoon(isoDate).toLocaleDateString('en-GB', { weekday: 'short' });
}

export function dayNumber(isoDate: string) {
  return atNoon(isoDate).getDate();
}

export function selectionSearch(selection: BookingSelection) {
  const params = new URLSearchParams({
    service: selection.serviceId,
    date: selection.date,
    time: selection.time,
  });
  return params.toString();
}

export function readSelection(
  search: string,
  mentor: Mentor,
): { service: MentorService; date: string; time: string } | null {
  const params = new URLSearchParams(search);
  const service = mentor.services.find((item) => item.id === params.get('service'));
  const date = params.get('date') ?? '';
  const time = params.get('time') ?? '';
  const slot = service?.availability.find((item) => item.date === date);
  if (!service || !slot || !slot.times.includes(time)) return null;
  return { service, date, time };
}

export function sessionTotal(price: number) {
  return price + PLATFORM_FEE;
}

export function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildCalendarInvite(input: {
  title: string;
  date: string;
  start: string;
  duration: string;
  description: string;
}) {
  const [hours, minutes] = input.start.split(':').map(Number);
  const start = atNoon(input.date);
  start.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  const end = new Date(start.getTime() + parseDurationMinutes(input.duration) * 60_000);
  const stamp = (value: Date) =>
    value
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FEUP Connect//Booking//EN',
    'BEGIN:VEVENT',
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${input.title}`,
    `DESCRIPTION:${input.description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
}
