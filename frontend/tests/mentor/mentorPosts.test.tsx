// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { getMentorById } from '@/api/mentors';
import type { Mentor } from '@/api/mentors';
import {
  createMentorPost,
  deleteMentorPost,
  getMentorPosts,
  getPublicMentorPost,
  updateMentorPost,
} from '@/api/mentorPosts';
import type { MentorPostRecord, PublicMentorPost } from '@/api/mentorPosts';
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
vi.mock('@/api/mentorPosts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/mentorPosts')>()),
  getMentorPosts: vi.fn(),
  createMentorPost: vi.fn(),
  updateMentorPost: vi.fn(),
  deleteMentorPost: vi.fn(),
  getPublicMentorPost: vi.fn(),
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

const savedPost: MentorPostRecord = {
  id: 'post-1',
  title: 'Graph traversal cheat sheet',
  body: 'Use BFS for shortest unweighted paths.\n\nUse DFS for topological sorting.',
  publishedAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
};

const publicPost: PublicMentorPost = {
  ...savedPost,
  mentorId: owner.id,
  mentorName: owner.username,
  mentorHeadline: 'Algorithms coach',
};

const mentorWithPost: Mentor = {
  id: owner.id,
  name: owner.username,
  initials: 'JD',
  avatarTone: 'primary',
  verified: false,
  headline: 'Algorithms coach',
  role: 'Algorithms coach',
  rating: 0,
  reviewCount: 0,
  sessionCount: 0,
  location: 'Porto',
  languages: 'English',
  replyTime: '',
  nextAvailable: '',
  subjects: ['Algorithms and Data Structures'],
  skills: ['Graphs'],
  tags: [],
  bio: 'Bio',
  about: 'Bio',
  experience: [],
  services: [],
  posts: [
    {
      id: savedPost.id,
      category: 'Free post',
      title: savedPost.title,
      excerpt: 'Use BFS for shortest unweighted paths. Use DFS for topological sorting.',
      body: savedPost.body,
      readTime: '1 min read',
      published: '20 Nov 2026',
      publishedAt: savedPost.publishedAt,
      updatedAt: savedPost.updatedAt,
    },
  ],
  reviews: [],
};

let auth: AuthContextValue;

function open(path = '/dashboard/posts') {
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
  vi.mocked(getMentorPosts).mockResolvedValue({ posts: [savedPost] });
  vi.mocked(createMentorPost).mockImplementation(async (input) => ({
    post: {
      id: 'post-2',
      ...input,
      publishedAt: '2026-11-24T12:00:00.000Z',
      updatedAt: '2026-11-24T12:00:00.000Z',
    },
  }));
  vi.mocked(updateMentorPost).mockImplementation(async (id, input) => ({
    post: {
      ...savedPost,
      id,
      ...input,
      updatedAt: '2026-11-24T13:00:00.000Z',
    },
  }));
  vi.mocked(deleteMentorPost).mockResolvedValue(undefined);
  vi.mocked(getMentorById).mockResolvedValue(mentorWithPost);
  vi.mocked(getPublicMentorPost).mockResolvedValue(publicPost);
});

afterEach(cleanup);

describe('mentor free posts manager', () => {
  it('publishes a new post and links to its public page', async () => {
    const user = userEvent.setup();
    vi.mocked(getMentorPosts).mockResolvedValueOnce({ posts: [] });
    open();
    await screen.findByText('You have no free posts yet.');
    await user.click(screen.getByRole('button', { name: 'Write a free post' }));
    await user.type(screen.getByLabelText('Title'), '  Dynamic programming tips  ');
    await user.type(screen.getByLabelText('Post content'), '  Define your state transition.  ');
    await user.click(screen.getByRole('button', { name: 'Publish post' }));

    await screen.findByText('Dynamic programming tips');
    expect(createMentorPost).toHaveBeenCalledWith({
      title: 'Dynamic programming tips',
      body: 'Define your state transition.',
    });
    expect(screen.getByRole('link', { name: /Public link/ }).getAttribute('href')).toBe(
      `/mentors/${owner.id}/posts/post-2`,
    );
  });

  it('edits an existing post and shows updated title and excerpt', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText(savedPost.title);
    await user.click(screen.getByRole('button', { name: `Edit ${savedPost.title}` }));
    const title = screen.getByLabelText('Title') as HTMLInputElement;
    const body = screen.getByLabelText('Post content') as HTMLTextAreaElement;
    await user.clear(title);
    await user.type(title, 'Updated BFS & DFS guide');
    await user.clear(body);
    await user.type(body, 'Updated explanation for visitors.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByText('Updated BFS & DFS guide');
    await screen.findByText('Updated explanation for visitors.');
    expect(updateMentorPost).toHaveBeenCalledWith(savedPost.id, {
      title: 'Updated BFS & DFS guide',
      body: 'Updated explanation for visitors.',
    });
  });

  it('requires confirmation before deleting and removes the post on confirm', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText(savedPost.title);
    await user.click(screen.getByRole('button', { name: `Delete ${savedPost.title}` }));
    expect(screen.getByText('Delete this post?')).toBeTruthy();
    expect(deleteMentorPost).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.queryByText(savedPost.title)).toBeNull());
    expect(deleteMentorPost).toHaveBeenCalledWith(savedPost.id);
    await screen.findByText('You have no free posts yet.');
  });

  it('rejects blank title or content without calling the API and preserves the last saved post', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText(savedPost.title);

    await user.click(screen.getByRole('button', { name: `Edit ${savedPost.title}` }));
    const title = screen.getByLabelText('Title') as HTMLInputElement;
    await user.clear(title);
    await user.type(title, '   ');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByText('Post title is required');
    expect(updateMentorPost).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText(savedPost.title)).toBeTruthy();
  });

  it('shows a clear error when saving fails and preserves both the draft and saved post', async () => {
    const user = userEvent.setup();
    vi.mocked(updateMentorPost).mockRejectedValueOnce(new ApiError(500, 'Database unavailable'));
    open();
    await screen.findByText(savedPost.title);

    await user.click(screen.getByRole('button', { name: `Edit ${savedPost.title}` }));
    const title = screen.getByLabelText('Title') as HTMLInputElement;
    await user.clear(title);
    await user.type(title, 'Unsaved draft title');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByText('Database unavailable');
    expect(title.value).toBe('Unsaved draft title');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText(savedPost.title)).toBeTruthy();
  });

  it('blocks duplicate submissions while saving is pending', async () => {
    const user = userEvent.setup();
    let finish!: (value: { post: MentorPostRecord }) => void;
    vi.mocked(createMentorPost).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    vi.mocked(getMentorPosts).mockResolvedValueOnce({ posts: [] });
    open();
    await screen.findByText('You have no free posts yet.');
    await user.click(screen.getByRole('button', { name: 'Write a free post' }));
    await user.type(screen.getByLabelText('Title'), 'First post');
    await user.type(screen.getByLabelText('Post content'), 'Helpful body');
    await user.dblClick(screen.getByRole('button', { name: 'Publish post' }));
    expect(createMentorPost).toHaveBeenCalledTimes(1);
    await act(async () => finish({ post: { ...savedPost, title: 'First post' } }));
  });

  it('retries failed loading and guards non-mentors, signed-out users, and incomplete mentors', async () => {
    const user = userEvent.setup();
    vi.mocked(getMentorPosts).mockRejectedValueOnce(new Error('offline'));
    const view = open();
    await user.click(await screen.findByRole('button', { name: 'Retry loading' }));
    await screen.findByText(savedPost.title);
    view.unmount();

    auth = { ...auth, user: { ...owner, isMentor: false } };
    const studentView = open();
    expect(screen.getByRole('alert').textContent).toMatch(/Only mentors/);
    expect(screen.queryByRole('link', { name: 'Free posts' })).toBeNull();
    studentView.unmount();

    auth = { ...auth, user: { ...owner, onboardingFinished: false } };
    const incompleteView = open();
    await waitFor(() =>
      expect(incompleteView.memoryRouter.state.location.pathname).toBe(
        '/mentor-onboarding/profile',
      ),
    );
    incompleteView.unmount();

    auth = { ...auth, user: null };
    const signedOutView = open();
    await waitFor(() => expect(signedOutView.memoryRouter.state.location.pathname).toBe('/login'));
  });
});

describe('public mentor posts reading', () => {
  it('shows published posts on the mentor public profile and opens the full post without payment', async () => {
    const user = userEvent.setup();
    auth = { ...auth, user: null };
    const view = open(`/mentors/${owner.id}`);

    await screen.findByRole('heading', { name: owner.username });
    expect(screen.getByText(savedPost.title)).toBeTruthy();

    await user.click(screen.getByRole('link', { name: /Read post/ }));
    await screen.findByRole('heading', { name: savedPost.title });
    expect(view.memoryRouter.state.location.pathname).toBe(
      `/mentors/${owner.id}/posts/${savedPost.id}`,
    );
    expect(screen.getByText('Free educational post')).toBeTruthy();
    expect(screen.getByText(/Use BFS for shortest unweighted paths\./)).toBeTruthy();
  });

  it('shows Post not found when a deleted or missing public post link is visited', async () => {
    auth = { ...auth, user: null };
    vi.mocked(getPublicMentorPost).mockResolvedValueOnce(null);
    open(`/mentors/${owner.id}/posts/deleted-id`);

    await screen.findByRole('heading', { name: 'Post not found' });
    expect(screen.getByRole('link', { name: 'Back to mentor profile' }).getAttribute('href')).toBe(
      `/mentors/${owner.id}`,
    );
  });
});
