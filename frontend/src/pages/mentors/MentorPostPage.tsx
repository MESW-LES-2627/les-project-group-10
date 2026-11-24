import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { getPublicMentorPost } from '@/api/mentorPosts';
import type { PublicMentorPost } from '@/api/mentorPosts';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui';
import { ProfileLayout } from '@/layouts/ProfileLayout';
import { estimateReadTime, formatPostDate } from '@/lib/mentorPosts';

/**
 * `/mentors/:mentorId/posts/:postId`: public view of a mentor's free educational post.
 */
export default function MentorPostPage() {
  const { mentorId, postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<PublicMentorPost | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!mentorId || !postId) return;
    let cancelled = false;
    getPublicMentorPost(mentorId, postId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setMissing(true);
          return;
        }
        setPost(data);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Could not load this post. Try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [mentorId, postId, attempt]);

  if (loadError) {
    return (
      <ProfileLayout title="Free post" loadingMessage="Loading post…">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-16 lg:px-8">
          <p role="alert" className="font-sans text-base text-danger">
            {loadError}
          </p>
          <Button
            onClick={() => {
              setLoadError('');
              setAttempt((value) => value + 1);
            }}
          >
            Retry loading
          </Button>
        </div>
      </ProfileLayout>
    );
  }

  if (missing) {
    return (
      <ProfileLayout title="Post not found" loadingMessage="Loading post…">
        <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-16 lg:px-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
            Post not found
          </h1>
          <p className="font-sans text-base text-ink-soft">
            This post may have been removed or is no longer available.
          </p>
          <div className="flex flex-wrap gap-4">
            {mentorId && (
              <Link
                to={`/mentors/${mentorId}`}
                className="font-sans text-sm font-medium text-secondary underline"
              >
                Back to mentor profile
              </Link>
            )}
            <Link
              to={user ? '/dashboard/mentors' : '/mentors'}
              className="font-sans text-sm font-medium text-ink-soft underline"
            >
              Find a mentor
            </Link>
          </div>
        </div>
      </ProfileLayout>
    );
  }

  if (!post) {
    return (
      <ProfileLayout title="Free post" loadingMessage="Loading post…">
        <p role="status" className="px-4 py-12 font-sans text-sm text-ink-muted lg:px-8">
          Loading post…
        </p>
      </ProfileLayout>
    );
  }

  const publishedDate = formatPostDate(post.publishedAt);
  const edited = post.updatedAt !== post.publishedAt;
  const updatedDate = edited ? formatPostDate(post.updatedAt) : '';
  const isOwner = user?.id === post.mentorId;

  return (
    <ProfileLayout title={post.title} loadingMessage="Loading post…">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/mentors/${post.mentorId}`}
            className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back to {post.mentorName}&rsquo;s profile
          </Link>
          {isOwner && (
            <Link to="/dashboard/posts" className="font-sans text-sm text-secondary underline">
              Manage posts
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 font-sans text-xs font-medium text-primary">
              <BookOpen className="size-3.5" />
              Free educational post
            </span>
            <span className="font-sans text-xs text-ink-muted">
              {estimateReadTime(post.body)}
              {publishedDate ? ` · Published ${publishedDate}` : ''}
              {updatedDate ? ` · Edited ${updatedDate}` : ''}
            </span>
          </div>

          <header className="flex flex-col gap-2 border-b border-line pb-5">
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {post.title}
            </h1>
            <p className="font-sans text-sm text-ink-soft">
              By{' '}
              <Link
                to={`/mentors/${post.mentorId}`}
                className="font-semibold text-secondary hover:underline"
              >
                {post.mentorName}
              </Link>
              {post.mentorHeadline ? ` · ${post.mentorHeadline}` : ''}
            </p>
          </header>

          <div className="whitespace-pre-wrap font-sans text-base leading-relaxed text-ink">
            {post.body}
          </div>
        </div>
      </article>
    </ProfileLayout>
  );
}
