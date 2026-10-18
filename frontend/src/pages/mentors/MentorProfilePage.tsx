import { useParams } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

/**
 * `/mentors/:id`: one page for every viewer. The owner check compares
 * the logged-in user with the page's mentor id.
 *
 * Placeholder: the real profile (data from `GET /api/mentors/:id`) is
 * still to be built.
 */
export default function MentorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  // wait for `/api/me`, otherwise the owner would look like a visitor for a moment
  if (loading) return null;

  const isOwner = user?.id === id;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-10">
      <h1 className="font-display text-5xl font-bold tracking-tight text-ink">Mentor profile</h1>
      <p className="font-sans text-base text-ink-soft">Mentor id: {id}</p>
      {isOwner && <p className="font-sans text-base text-secondary">This is your profile.</p>}
    </main>
  );
}
