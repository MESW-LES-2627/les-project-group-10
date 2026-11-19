// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { getMentorById, getMentorProfileEditor, saveMentorProfile } from '@/api/mentors';
import type { EditableMentorProfile, Mentor } from '@/api/mentors';
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
  getMentorProfileEditor: vi.fn(),
  saveMentorProfile: vi.fn(),
  getMentorById: vi.fn(),
}));

const owner = {
  id: 'mentor-a',
  username: 'Jane Doe',
  email: 'jane@example.com',
  isMentor: true,
  isStudent: true,
  isAdmin: false,
  onboardingFinished: true,
};
const saved: EditableMentorProfile = {
  headline: 'Engineer',
  bio: 'Original biography',
  subjects: ['Physics'],
  skills: ['React'],
};
const mentor: Mentor = {
  id: owner.id,
  name: owner.username,
  initials: 'JD',
  avatarTone: 'primary',
  verified: false,
  headline: saved.headline,
  role: saved.headline,
  rating: 0,
  reviewCount: 0,
  sessionCount: 0,
  location: 'Porto',
  languages: 'English',
  replyTime: '',
  nextAvailable: '',
  subjects: ['Physics', 'Mathematics'],
  skills: Array.from({ length: 15 }, (_, i) => `Skill ${i + 1}`),
  tags: [],
  bio: saved.bio,
  about: '<script>example</script>\nBiography',
  experience: [],
  services: [],
  posts: [],
  reviews: [],
};
let auth: AuthContextValue;

function open(path = '/dashboard/profile') {
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
  vi.mocked(getMentorProfileEditor).mockResolvedValue({
    profile: saved,
    subjectOptions: ['Physics', 'Mathematics'],
  });
  vi.mocked(saveMentorProfile).mockImplementation(async (profile) => ({ profile }));
  vi.mocked(getMentorById).mockResolvedValue(mentor);
});
afterEach(cleanup);

describe('mentor profile editor', () => {
  it('loads saved fields and returns to the refreshed profile after a successful save', async () => {
    const user = userEvent.setup();
    const view = open();
    const bio = (await screen.findByLabelText('About you')) as HTMLTextAreaElement;
    expect(bio.value).toBe(saved.bio);
    expect(screen.queryByLabelText('Professional background')).toBeNull();
    expect(bio.maxLength).toBe(1000);
    await user.clear(bio);
    await user.type(bio, ' New biography ');
    vi.mocked(saveMentorProfile).mockResolvedValueOnce({
      profile: { ...saved, bio: 'New biography' },
    });
    vi.mocked(getMentorById).mockResolvedValueOnce({ ...mentor, about: 'New biography' });
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByRole('heading', { name: owner.username });
    await screen.findByText('New biography');
    expect(view.memoryRouter.state.location.pathname).toBe(`/mentors/${owner.id}`);
    expect(saveMentorProfile).toHaveBeenCalledWith({ ...saved, bio: ' New biography ' });
    expect(getMentorById).toHaveBeenCalledWith(owner.id);
  });

  it('cancels invalid unsaved changes and returns to the profile without saving', async () => {
    const user = userEvent.setup();
    const view = open();
    const bio = await screen.findByLabelText('About you');
    await user.clear(bio);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('heading', { name: owner.username });
    expect(view.memoryRouter.state.location.pathname).toBe(`/mentors/${owner.id}`);
    expect(saveMentorProfile).not.toHaveBeenCalled();
  });

  it('does not allow submission before loading and retries failed loading', async () => {
    const user = userEvent.setup();
    vi.mocked(getMentorProfileEditor).mockRejectedValueOnce(new Error('offline'));
    open();
    expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull();
    await user.click(await screen.findByRole('button', { name: 'Retry loading' }));
    await screen.findByLabelText('About you');
    expect(saveMentorProfile).not.toHaveBeenCalled();
  });

  it('blocks repeat submissions while the save is pending', async () => {
    const user = userEvent.setup();
    let finish!: (value: { profile: EditableMentorProfile }) => void;
    vi.mocked(saveMentorProfile).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    open();
    await screen.findByLabelText('About you');
    await user.dblClick(screen.getByRole('button', { name: 'Save profile' }));
    expect(saveMentorProfile).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).matches(':disabled'),
    ).toBe(true);
    await act(async () => finish({ profile: saved }));
  });

  it('retains drafts after field/server errors and supports retry', async () => {
    const user = userEvent.setup();
    vi.mocked(saveMentorProfile).mockRejectedValueOnce(
      new ApiError(400, 'Invalid input', 'validation_error', { bio: 'Biography is invalid' }),
    );
    open();
    const bio = (await screen.findByLabelText('About you')) as HTMLTextAreaElement;
    await user.type(bio, ' draft');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByText('Biography is invalid');
    expect(bio.value).toBe(`${saved.bio} draft`);
    expect(bio.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.textContent).toBe('Invalid input');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByRole('heading', { name: owner.username });
  });

  it('explains an unconfirmed network save and retains the draft', async () => {
    vi.mocked(saveMentorProfile).mockRejectedValueOnce(new TypeError('offline'));
    open();
    const bio = (await screen.findByLabelText('About you')) as HTMLTextAreaElement;
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByText(/Could not confirm the save/);
    expect(bio.value).toBe(saved.bio);
  });

  it('stops saving after session expiry', async () => {
    vi.mocked(saveMentorProfile).mockRejectedValueOnce(new ApiError(401, 'Please log in'));
    const view = open();
    await screen.findByLabelText('About you');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByText('Please log in');
    expect(
      (screen.getByRole('button', { name: 'Save profile' }) as HTMLButtonElement).matches(
        ':disabled',
      ),
    ).toBe(true);
    expect(screen.getByRole('link', { name: /Sign in again/ }).getAttribute('href')).toContain(
      '/login?next=',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(view.memoryRouter.state.location.pathname).toBe(`/mentors/${owner.id}`),
    );
  });

  it('validates subject selection before sending a request', async () => {
    open();
    await screen.findByLabelText('About you');
    await userEvent.click(screen.getByRole('button', { name: 'Physics' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await screen.findByText('Choose between 1 and 4 subjects');
    expect(saveMentorProfile).not.toHaveBeenCalled();
  });

  it('ignores a load completion after leaving the editor', async () => {
    let finish!: (value: { profile: EditableMentorProfile; subjectOptions: string[] }) => void;
    vi.mocked(getMentorProfileEditor).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const view = open();
    view.unmount();
    await act(async () => finish({ profile: saved, subjectOptions: [] }));
    expect(screen.queryByLabelText('About you')).toBeNull();
  });

  it('denies students and redirects incomplete mentors without loading profile data', async () => {
    auth = { ...auth, user: { ...owner, isMentor: false } };
    const view = open();
    expect(screen.getByRole('alert').textContent).toMatch(/Only mentors/);
    expect(screen.queryByRole('link', { name: 'My profile' })).toBeNull();
    expect(getMentorProfileEditor).not.toHaveBeenCalled();
    view.unmount();
    auth = { ...auth, user: { ...owner, onboardingFinished: false } };
    const redirected = open();
    await waitFor(() =>
      expect(redirected.memoryRouter.state.location.pathname).toBe('/mentor-onboarding/profile'),
    );
    expect(getMentorProfileEditor).not.toHaveBeenCalled();
  });
});

describe('public profile access', () => {
  it('shows saved details anonymously, including all subjects and skills without services', async () => {
    auth = { ...auth, user: null };
    open(`/mentors/${owner.id}`);
    await screen.findByRole('heading', { name: owner.username });
    expect(screen.queryByRole('heading', { name: 'Professional background' })).toBeNull();
    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('Skill 15')).toBeTruthy();
    expect(screen.getByText(/<script>example<\/script>/)).toBeTruthy();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('No sessions are currently available.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Edit profile' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Overview' })).toBeNull();
  });

  it('only shows the edit action to the owner', async () => {
    const own = open(`/mentors/${owner.id}`);
    expect((await screen.findByRole('link', { name: 'Edit profile' })).getAttribute('href')).toBe(
      '/dashboard/profile',
    );
    own.unmount();
    auth = { ...auth, user: { ...owner, id: 'mentor-b' } };
    open(`/mentors/${owner.id}`);
    await screen.findByRole('heading', { name: owner.username });
    expect(screen.queryByRole('link', { name: 'Edit profile' })).toBeNull();
  });

  it('keeps checkout authenticated and remembers its URL', async () => {
    auth = { ...auth, user: null };
    const path = `/mentors/${owner.id}/checkout?serviceId=s1&date=2026-12-01&time=10:00`;
    const view = open(path);
    await waitFor(() => expect(view.memoryRouter.state.location.pathname).toBe('/login'));
    expect(new URLSearchParams(view.memoryRouter.state.location.search).get('next')).toBe(path);
  });
});

describe('simplified mentor registration', () => {
  it('registers using account details only and opens onboarding without an intro field', async () => {
    const user = userEvent.setup();
    vi.mocked(auth.registerMentor).mockResolvedValue(owner);
    const view = open('/signup');
    await user.click(screen.getByRole('button', { name: /I’m a mentor/ }));
    expect(screen.queryByLabelText('Short bio')).toBeNull();
    expect(screen.queryByRole('textbox', { name: /bio|background|intro/i })).toBeNull();
    await user.type(screen.getByLabelText('Full name'), 'New Mentor');
    await user.type(screen.getByLabelText('University email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'ProfileTest123!');
    await user.click(screen.getByRole('checkbox', { name: /I agree/ }));
    await user.click(screen.getByRole('button', { name: 'Create mentor account' }));
    await waitFor(() =>
      expect(view.memoryRouter.state.location.pathname).toBe('/mentor-onboarding/profile'),
    );
    expect(auth.registerMentor).toHaveBeenCalledWith({
      username: 'New Mentor',
      email: 'new@example.com',
      password: 'ProfileTest123!',
    });
    expect(screen.queryByLabelText('One-line intro')).toBeNull();
    expect(await screen.findByLabelText('Location')).toBeTruthy();
  });

  it('collects one biography with the same limit as the profile editor', () => {
    open('/mentor-onboarding/expertise');
    expect((screen.getByLabelText('About you') as HTMLTextAreaElement).maxLength).toBe(1000);
    expect((screen.getByLabelText('Professional headline') as HTMLInputElement).maxLength).toBe(
      120,
    );
    expect(screen.queryByLabelText('Professional background')).toBeNull();
    expect(screen.queryByLabelText('One-line intro')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add a service' })).toBeTruthy();
  });
});

describe('mentor onboarding completion navigation', () => {
  it('opens the signed-in mentor profile from the completion page', async () => {
    const view = open('/mentor-onboarding/pending');
    await userEvent.click(screen.getByRole('link', { name: 'Preview my public profile' }));
    await screen.findByRole('heading', { name: owner.username });
    expect(view.memoryRouter.state.location.pathname).toBe(`/mentors/${owner.id}`);
    expect(getMentorById).toHaveBeenCalledWith(owner.id);
  });

  it('opens the persisted editor instead of restarting onboarding', async () => {
    const view = open('/mentor-onboarding/pending');
    await userEvent.click(screen.getByRole('link', { name: 'Edit profile' }));
    await screen.findByLabelText('About you');
    expect(view.memoryRouter.state.location.pathname).toBe('/dashboard/profile');
  });

  it('links the dashboard action to the dashboard route', () => {
    open('/mentor-onboarding/pending');
    expect(screen.getByRole('link', { name: 'Go to dashboard' }).getAttribute('href')).toBe(
      '/dashboard',
    );
  });
});
