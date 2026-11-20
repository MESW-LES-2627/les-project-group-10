// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { getMentorById } from '@/api/mentors';
import type { Mentor } from '@/api/mentors';
import { useAuth } from '@/auth/useAuth';
import type { AuthContextValue } from '@/auth/authContext';
import { router } from '@/routes/router';

vi.mock('@stripe/stripe-js', () => ({ loadStripe: async () => null }));
vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/api/mentors', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/mentors')>()),
  getMentorById: vi.fn(),
}));

const DAY = '2030-01-15';

const mentor: Mentor = {
  id: 'mentor-a',
  name: 'Jane Doe',
  initials: 'JD',
  avatarTone: 'primary',
  verified: true,
  headline: 'Tutor',
  role: 'Tutor',
  rating: 0,
  reviewCount: 0,
  sessionCount: 0,
  location: 'Porto',
  languages: 'English',
  replyTime: '',
  nextAvailable: '',
  subjects: [],
  skills: [],
  tags: [],
  bio: '',
  about: '',
  experience: [],
  services: [
    {
      id: 'sql',
      title: 'SQL tutoring',
      description: 'Queries',
      duration: '60 min',
      price: 20,
      availability: [{ date: DAY, times: ['09:00'] }],
    },
    {
      id: 'calculus',
      title: 'Calculus tutoring',
      description: 'Limits',
      duration: '60 min',
      price: 25,
      availability: [{ date: DAY, times: ['11:00'] }],
    },
  ],
  posts: [],
  reviews: [],
};

function open(path = '/mentors/mentor-a') {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] });
  render(<RouterProvider router={memoryRouter} />);
  return memoryRouter;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
  } as unknown as AuthContextValue);
  vi.mocked(getMentorById).mockResolvedValue(mentor);
});
afterEach(cleanup);

describe('mentor profile booking slots', () => {
  it('offers only the selected service’s times on a shared day', async () => {
    open();

    expect(await screen.findByRole('button', { name: '09:00' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '11:00' })).toBeNull();
  });

  it('switches the offered times and the selected time when the service changes', async () => {
    const memoryRouter = open();
    const visited: string[] = [];
    memoryRouter.subscribe((state) =>
      visited.push(state.location.pathname + state.location.search),
    );
    await screen.findByRole('button', { name: '09:00' });

    await userEvent.click(screen.getByRole('button', { name: /Calculus tutoring/ }));

    expect(await screen.findByRole('button', { name: '11:00' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));
    const checkout = visited.find((path) => path.startsWith('/mentors/mentor-a/checkout?'));
    const params = new URLSearchParams(checkout?.split('?')[1]);
    expect(params.get('service')).toBe('calculus');
    expect(params.get('time')).toBe('11:00');
  });

  it('ignores a restored selection whose time belongs to another service', async () => {
    open(`/mentors/mentor-a?service=sql&date=${DAY}&time=11:00`);

    expect(await screen.findByRole('button', { name: '09:00' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '11:00' })).toBeNull();
  });
});
