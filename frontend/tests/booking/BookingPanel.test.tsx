import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { BookingPanel } from '@/components/mentors/BookingPanel';
import type { Mentor, MentorService } from '@/api/mentors';
import { renderWithProviders } from '../support/render';

const services: MentorService[] = [
  { id: 's1', title: 'Mock Interview', description: 'Practice', duration: '60 min', price: 30 },
  { id: 's2', title: 'CV Review', description: 'Feedback', duration: '30 min', price: 15 },
];

function buildMentor(overrides: Partial<Mentor> = {}): Mentor {
  return {
    id: 'mentor-1',
    initials: 'JD',
    avatarTone: 'primary',
    name: 'Jane Doe',
    verified: true,
    headline: 'Engineer',
    role: 'Mentor',
    rating: 4.9,
    reviewCount: 12,
    sessionCount: 30,
    location: 'Porto',
    languages: 'English',
    replyTime: '1 hour',
    nextAvailable: 'Tomorrow',
    subjects: ['Software Engineering'],
    skills: ['TypeScript'],
    tags: [],
    bio: 'Bio',
    about: 'About',
    experience: [],
    services,
    posts: [],
    availability: [{ date: '2024-01-08', times: ['09:00', '10:00'] }],
    reviews: [],
    ...overrides,
  };
}

describe('BookingPanel', () => {
  it('renders the selected service and the total with the platform fee', () => {
    renderWithProviders(
      <BookingPanel
        mentor={buildMentor()}
        service={services[0]!}
        date=""
        time=""
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText('Mock Interview')).toBeInTheDocument();
    expect(screen.getByText('Session fee')).toBeInTheDocument();
    expect(screen.getByText('€30.00')).toBeInTheDocument();
    expect(screen.getByText('Platform fee')).toBeInTheDocument();
    expect(screen.getByText('€1.50')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('€31.50')).toBeInTheDocument();
  });

  it('updates the displayed total when a different service is selected', () => {
    const { rerender } = renderWithProviders(
      <BookingPanel
        mentor={buildMentor()}
        service={services[0]!}
        date=""
        time=""
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText('€31.50')).toBeInTheDocument();

    rerender(
      <BookingPanel
        mentor={buildMentor()}
        service={services[1]!}
        date=""
        time=""
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.queryByText('€31.50')).not.toBeInTheDocument();
    expect(screen.getByText('€16.50')).toBeInTheDocument();
  });

  it('lets the user pick an open day and a time slot', async () => {
    const onDateChange = vi.fn();
    const onTimeChange = vi.fn();
    renderWithProviders(
      <BookingPanel
        mentor={buildMentor()}
        service={services[0]!}
        date="2024-01-08"
        time=""
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
        onContinue={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '09:00' }));
    expect(onTimeChange).toHaveBeenCalledWith('09:00');

    const dayButton = screen.getByText('8').closest('button');
    expect(dayButton).not.toBeNull();
    await userEvent.click(dayButton!);
    expect(onDateChange).toHaveBeenCalledWith('2024-01-08');
  });

  it('disables the continue button until both a date and a time are chosen', () => {
    renderWithProviders(
      <BookingPanel
        mentor={buildMentor()}
        service={services[0]!}
        date=""
        time=""
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeDisabled();
  });

  it('enables the continue button once a date and time are chosen', () => {
    renderWithProviders(
      <BookingPanel
        mentor={buildMentor()}
        service={services[0]!}
        date="2024-01-08"
        time="09:00"
        onDateChange={vi.fn()}
        onTimeChange={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeEnabled();
  });
});
