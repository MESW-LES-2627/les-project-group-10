import { describe, expect, it } from 'vitest';
import type { Mentor, MentorService } from '@/api/mentors';
import {
  PLATFORM_FEE,
  addMinutes,
  formatEuro,
  parseDurationMinutes,
  readSelection,
  selectionSearch,
  sessionRange,
  sessionTotal,
  shiftWeek,
  startOfWeek,
  weekDates,
} from './booking';

describe('parseDurationMinutes', () => {
  it('extracts the number of minutes from a duration string', () => {
    expect(parseDurationMinutes('45 minutes')).toBe(45);
    expect(parseDurationMinutes('60 min')).toBe(60);
  });

  it('defaults to 60 when no number is present', () => {
    expect(parseDurationMinutes('no number here')).toBe(60);
  });
});

describe('addMinutes', () => {
  it('adds minutes within the same hour', () => {
    expect(addMinutes('09:00', 15)).toBe('09:15');
  });

  it('rolls over to the next hour', () => {
    expect(addMinutes('09:50', 20)).toBe('10:10');
  });

  it('wraps around midnight', () => {
    expect(addMinutes('23:30', 90)).toBe('01:00');
  });
});

describe('sessionRange', () => {
  it('formats the start and computed end time', () => {
    expect(sessionRange('14:00', '30 minutes')).toBe('14:00 – 14:30');
  });
});

describe('formatEuro', () => {
  it('formats a number with two decimals and a euro sign', () => {
    expect(formatEuro(12)).toBe('€12.00');
    expect(formatEuro(12.5)).toBe('€12.50');
  });
});

describe('sessionTotal', () => {
  it('adds the platform fee to the price', () => {
    expect(sessionTotal(30)).toBe(30 + PLATFORM_FEE);
  });
});

describe('week helpers', () => {
  it('startOfWeek returns the Monday of the week', () => {
    // 2024-01-10 is a Wednesday
    expect(startOfWeek('2024-01-10')).toBe('2024-01-08');
  });

  it('startOfWeek is a no-op on a Monday', () => {
    expect(startOfWeek('2024-01-08')).toBe('2024-01-08');
  });

  it('shiftWeek moves forward and backward by whole weeks', () => {
    expect(shiftWeek('2024-01-08', 1)).toBe('2024-01-15');
    expect(shiftWeek('2024-01-08', -1)).toBe('2024-01-01');
  });

  it('weekDates returns the 7 ISO dates starting from weekStart', () => {
    expect(weekDates('2024-01-08')).toEqual([
      '2024-01-08',
      '2024-01-09',
      '2024-01-10',
      '2024-01-11',
      '2024-01-12',
      '2024-01-13',
      '2024-01-14',
    ]);
  });
});

function buildMentor(overrides: Partial<Mentor> = {}): Mentor {
  const service: MentorService = {
    id: 'service-1',
    title: 'Mock Interview',
    description: 'Practice interview',
    duration: '60 minutes',
    price: 30,
  };

  return {
    id: 'mentor-1',
    initials: 'JD',
    avatarTone: 'primary',
    name: 'Jane Doe',
    verified: true,
    headline: 'Engineer',
    role: 'Mentor',
    rating: 5,
    reviewCount: 1,
    sessionCount: 1,
    location: 'Porto',
    languages: 'English',
    replyTime: '1 hour',
    nextAvailable: 'Today',
    subjects: ['Engineering'],
    skills: ['TypeScript'],
    tags: [],
    bio: 'Bio',
    about: 'About',
    experience: [],
    services: [service],
    posts: [],
    availability: [{ date: '2024-01-08', times: ['09:00', '10:00'] }],
    reviews: [],
    ...overrides,
  };
}

describe('selectionSearch and readSelection', () => {
  it('round trips a selection through the query string', () => {
    const mentor = buildMentor();
    const search = selectionSearch({ serviceId: 'service-1', date: '2024-01-08', time: '09:00' });
    const result = readSelection(search, mentor);

    expect(result).toEqual({ service: mentor.services[0], date: '2024-01-08', time: '09:00' });
  });

  it('returns null when the service does not exist', () => {
    const mentor = buildMentor();
    const search = selectionSearch({ serviceId: 'missing', date: '2024-01-08', time: '09:00' });
    expect(readSelection(search, mentor)).toBeNull();
  });

  it('returns null when the time is not in the availability slot', () => {
    const mentor = buildMentor();
    const search = selectionSearch({ serviceId: 'service-1', date: '2024-01-08', time: '23:00' });
    expect(readSelection(search, mentor)).toBeNull();
  });
});
