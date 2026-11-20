// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { getMentorById } from '@/api/mentors';
import type { Mentor } from '@/api/mentors';
import {
  createMentorSlot,
  deleteMentorSlot,
  getMentorSlots,
  updateMentorSlot,
} from '@/api/mentorSlots';
import type { MentorSlot } from '@/api/mentorSlots';
import { useAuth } from '@/auth/useAuth';
import type { AuthContextValue } from '@/auth/authContext';
import { router } from '@/routes/router';

vi.mock('@stripe/stripe-js', () => ({ loadStripe: async () => null }));
vi.mock('@/api/languages', () => ({
  FALLBACK_LANGUAGES: ['English'],
  getLanguages: async () => ['English'],
}));
vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/api/mentors', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/mentors')>()),
  getMentorById: vi.fn(),
}));
vi.mock('@/api/mentorSlots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/mentorSlots')>()),
  getMentorSlots: vi.fn(),
  createMentorSlot: vi.fn(),
  updateMentorSlot: vi.fn(),
  deleteMentorSlot: vi.fn(),
}));

const owner = {
  id: 'mentor-a',
  username: 'Jane Doe',
  email: 'jane@example.com',
  isMentor: true,
  isStudent: false,
  isAdmin: false,
  onboardingFinished: true,
};
const mentor: Mentor = {
  id: owner.id,
  name: owner.username,
  initials: 'JD',
  avatarTone: 'primary',
  verified: false,
  headline: 'Engineer',
  role: 'Engineer',
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
      id: 'service-1',
      title: 'Mock interview',
      description: 'd',
      duration: '60 min',
      price: 30,
      availability: [],
    },
  ],
  posts: [],
  reviews: [],
};
const freeSlot: MentorSlot = {
  id: 'slot-1',
  serviceId: 'service-1',
  serviceTitle: 'Mock interview',
  date: '2030-01-15',
  startTime: '09:00',
  endTime: '10:00',
  booked: false,
};
const bookedSlot: MentorSlot = {
  id: 'slot-2',
  serviceId: 'service-1',
  serviceTitle: 'Mock interview',
  date: '2030-01-16',
  startTime: '09:00',
  endTime: '10:00',
  booked: true,
};
let auth: AuthContextValue;

function open(path = '/dashboard/slots') {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] });
  const view = render(<RouterProvider router={memoryRouter} />);
  return { ...view, memoryRouter };
}

beforeEach(() => {
  vi.resetAllMocks();
  auth = {
    user: owner,
    loading: false,
    refresh: vi.fn(),
    login: vi.fn(),
    registerStudent: vi.fn(),
    registerMentor: vi.fn(),
    logout: vi.fn(),
  };
  vi.mocked(useAuth).mockImplementation(() => auth);
  vi.mocked(getMentorById).mockResolvedValue(mentor);
  vi.mocked(getMentorSlots).mockResolvedValue({ slots: [freeSlot, bookedSlot] });
  vi.mocked(createMentorSlot).mockImplementation(async (input) => ({
    slot: { id: 'slot-new', serviceTitle: 'Mock interview', booked: false, ...input },
  }));
  vi.mocked(updateMentorSlot).mockImplementation(async (id, input) => ({
    slot: { id, serviceTitle: 'Mock interview', booked: false, ...input },
  }));
  vi.mocked(deleteMentorSlot).mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('mentor availability slots page', () => {
  it('lists existing slots, marking booked ones as not editable', async () => {
    open();
    await screen.findAllByText('Mock interview');
    expect(screen.getByText(/2030-01-15.*09:00.*10:00/)).toBeTruthy();
    expect(screen.getByText('Booked')).toBeTruthy();
    const editButtons = screen.getAllByRole('button', { name: /Edit slot/ });
    const bookedEdit = editButtons.find((button) =>
      button.getAttribute('aria-label')?.includes('2030-01-16'),
    ) as HTMLButtonElement;
    expect(bookedEdit.disabled).toBe(true);
  });

  it('adds a new slot', async () => {
    const user = userEvent.setup();
    open();
    await screen.findAllByText('Mock interview');
    await user.click(screen.getByRole('button', { name: 'Add an availability slot' }));
    await user.selectOptions(screen.getByLabelText('Service'), 'service-1');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2030-02-01' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '12:00' } });
    await user.click(screen.getByRole('button', { name: 'Save slot' }));
    await waitFor(() =>
      expect(createMentorSlot).toHaveBeenCalledWith({
        serviceId: 'service-1',
        date: '2030-02-01',
        startTime: '11:00',
        endTime: '12:00',
      }),
    );
    expect(screen.queryByRole('button', { name: 'Save slot' })).toBeNull();
  });

  it('blocks submission with an inverted time range before calling the API', async () => {
    const user = userEvent.setup();
    open();
    await screen.findAllByText('Mock interview');
    await user.click(screen.getByRole('button', { name: 'Add an availability slot' }));
    await user.selectOptions(screen.getByLabelText('Service'), 'service-1');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2030-02-01' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '12:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '11:00' } });
    await user.click(screen.getByRole('button', { name: 'Save slot' }));
    await screen.findByText('End time must be after the start time');
    expect(createMentorSlot).not.toHaveBeenCalled();
  });

  it('shows a server overlap error and keeps the draft open', async () => {
    const user = userEvent.setup();
    vi.mocked(createMentorSlot).mockRejectedValueOnce(
      new ApiError(409, 'This slot overlaps one of your existing slots', 'slot_overlap'),
    );
    open();
    await screen.findAllByText('Mock interview');
    await user.click(screen.getByRole('button', { name: 'Add an availability slot' }));
    await user.selectOptions(screen.getByLabelText('Service'), 'service-1');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2030-02-01' } });
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:30' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '10:30' } });
    await user.click(screen.getByRole('button', { name: 'Save slot' }));
    await screen.findByText('This slot overlaps one of your existing slots');
    expect(screen.getByRole('button', { name: 'Save slot' })).toBeTruthy();
  });

  it('edits an available slot', async () => {
    const user = userEvent.setup();
    open();
    await screen.findAllByText('Mock interview');
    await user.click(screen.getByRole('button', { name: 'Edit slot on 2030-01-15 at 09:00' }));
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '15:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '16:00' } });
    await user.click(screen.getByRole('button', { name: 'Save slot' }));
    await waitFor(() =>
      expect(updateMentorSlot).toHaveBeenCalledWith('slot-1', {
        serviceId: 'service-1',
        date: '2030-01-15',
        startTime: '15:00',
        endTime: '16:00',
      }),
    );
  });

  it('removes a slot only after a second, confirming click', async () => {
    const user = userEvent.setup();
    open();
    await screen.findAllByText('Mock interview');
    await user.click(screen.getByRole('button', { name: 'Remove slot on 2030-01-15 at 09:00' }));
    expect(deleteMentorSlot).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(deleteMentorSlot).toHaveBeenCalledWith('slot-1'));
    await waitFor(() => expect(screen.queryByText('2030-01-15 · 09:00–10:00')).toBeNull());
  });

  it('cancels a pending delete confirmation without calling the API', async () => {
    const user = userEvent.setup();
    open();
    await screen.findAllByText('Mock interview');
    await user.click(screen.getByRole('button', { name: 'Remove slot on 2030-01-15 at 09:00' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deleteMentorSlot).not.toHaveBeenCalled();
    expect(screen.getAllByText('Mock interview').length).toBeGreaterThan(0);
  });

  it('shows a message and leaves the slot listed when deleting a now-booked slot fails', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteMentorSlot).mockRejectedValueOnce(
      new ApiError(409, 'This slot has an active reservation or booking', 'slot_booked'),
    );
    open();
    await screen.findAllByText('Mock interview');
    await user.click(screen.getByRole('button', { name: 'Remove slot on 2030-01-15 at 09:00' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await screen.findByText('This slot has an active reservation or booking');
    expect(screen.getByText('2030-01-15 · 09:00–10:00')).toBeTruthy();
  });

  it('denies students and redirects incomplete mentors without loading slots', async () => {
    auth = { ...auth, user: { ...owner, isMentor: false } };
    const view = open();
    expect(screen.getByRole('alert').textContent).toMatch(/Only mentors/);
    expect(getMentorSlots).not.toHaveBeenCalled();
    view.unmount();
    auth = { ...auth, user: { ...owner, onboardingFinished: false } };
    const redirected = open();
    await waitFor(() =>
      expect(redirected.memoryRouter.state.location.pathname).toBe('/mentor-onboarding/profile'),
    );
    expect(getMentorSlots).not.toHaveBeenCalled();
  });

  it('ignores a load completion after leaving the page', async () => {
    let finish!: (value: { slots: MentorSlot[] }) => void;
    vi.mocked(getMentorSlots).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const view = open();
    view.unmount();
    await act(async () => finish({ slots: [freeSlot] }));
    expect(screen.queryByText('Mock interview')).toBeNull();
  });
});
