import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Check, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '@/api/client';
import {
  createMentorPost,
  deleteMentorPost,
  getMentorPosts,
  updateMentorPost,
} from '@/api/mentorPosts';
import type { MentorPostRecord } from '@/api/mentorPosts';
import { useAuth } from '@/auth/useAuth';
import { Button, Input, Textarea } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import {
  EMPTY_POST_DRAFT,
  POST_BODY_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  formatPostDate,
  postExcerpt,
  toMentorPostInput,
  validateMentorPostDraft,
} from '@/lib/mentorPosts';
import type { MentorPostDraft } from '@/lib/mentorPosts';

function sortedPosts(posts: MentorPostRecord[]) {
  return [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export default function MentorPostsPage() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  if (!user) return <Navigate to="/login?next=%2Fdashboard%2Fposts" replace />;
  if (!user.isMentor)
    return (
      <DashboardLayout title="Free posts">
        <p role="alert">Only mentors can manage free posts.</p>
      </DashboardLayout>
    );
  if (!user.onboardingFinished) return <Navigate to="/mentor-onboarding/profile" replace />;
  return (
    <DashboardLayout title="Free posts">
      <PostsManager key={user.id} mentorId={user.id} />
    </DashboardLayout>
  );
}

function PostsManager({ mentorId }: { mentorId: string }) {
  const [posts, setPosts] = useState<MentorPostRecord[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MentorPostDraft>(EMPTY_POST_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState('');
  const mounted = useRef(false);
  const submitting = useRef(false);
  const errorSummary = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMentorPosts()
      .then((result) => {
        if (cancelled) return;
        setPosts(sortedPosts(result.posts));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError ? error.message : 'Could not load your posts. Try again.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (formMessage) errorSummary.current?.focus();
  }, [formMessage, fieldErrors]);

  const isAddingNew = editingId === 'new';

  function startAdd() {
    setEditingId('new');
    setDraft(EMPTY_POST_DRAFT);
    setFieldErrors({});
    setFormMessage('');
    setConfirmingDeleteId(null);
  }

  function startEdit(post: MentorPostRecord) {
    setEditingId(post.id);
    setDraft({ title: post.title, body: post.body });
    setFieldErrors({});
    setFormMessage('');
    setConfirmingDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_POST_DRAFT);
    setFieldErrors({});
    setFormMessage('');
  }

  async function handleSave() {
    if (submitting.current) return;
    const validation = validateMentorPostDraft(draft);
    setFieldErrors(validation);
    setFormMessage('');
    if (Object.keys(validation).length) {
      setFormMessage('Check the highlighted fields.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const input = toMentorPostInput(draft);
      const result = isAddingNew
        ? await createMentorPost(input)
        : await updateMentorPost(editingId!, input);
      if (!mounted.current) return;
      setPosts((current) => {
        const existing = current ?? [];
        return sortedPosts(
          isAddingNew
            ? [result.post, ...existing]
            : existing.map((post) => (post.id === result.post.id ? result.post : post)),
        );
      });
      setEditingId(null);
      setDraft(EMPTY_POST_DRAFT);
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        setFormMessage(error.message);
      } else {
        setFormMessage('Could not confirm the save. Your draft is still here — try again.');
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setConfirmingDeleteId(null);
    setListMessage('');
    setDeletingId(id);
    try {
      await deleteMentorPost(id);
      if (!mounted.current) return;
      setPosts((current) => (current ?? []).filter((post) => post.id !== id));
    } catch (error) {
      if (!mounted.current) return;
      setListMessage(
        error instanceof ApiError ? error.message : 'Could not delete this post. Try again.',
      );
    } finally {
      if (mounted.current) setDeletingId(null);
    }
  }

  if (!posts) {
    return (
      <div className="p-8">
        {loadError ? (
          <>
            <p role="alert">{loadError}</p>
            <Button
              onClick={() => {
                setLoadError('');
                setAttempt((value) => value + 1);
              }}
            >
              Retry loading
            </Button>
          </>
        ) : (
          <p role="status">Loading your free posts…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Free educational posts</h1>
          <p className="text-ink-soft">
            Publish notes, guides, and study tips on your public profile. Visitors can read them
            without paying.
          </p>
        </div>
        <Link to={`/mentors/${mentorId}`} className="font-sans text-sm text-secondary underline">
          View public profile
        </Link>
      </div>
      {listMessage && (
        <p role="alert" className="text-danger">
          {listMessage}
        </p>
      )}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
        {formMessage && (
          <p ref={errorSummary} tabIndex={-1} role="alert" className="text-danger">
            {formMessage}
          </p>
        )}
        {posts.length === 0 && !isAddingNew && (
          <p className="text-ink-soft">You have no free posts yet.</p>
        )}
        {isAddingNew && (
          <PostEditForm
            draft={draft}
            errors={fieldErrors}
            saving={saving}
            submitLabel="Publish post"
            onDraftChange={setDraft}
            onSave={handleSave}
            onCancel={cancelEdit}
          />
        )}
        {posts.map((post) =>
          editingId === post.id ? (
            <PostEditForm
              key={post.id}
              draft={draft}
              errors={fieldErrors}
              saving={saving}
              submitLabel="Save changes"
              onDraftChange={setDraft}
              onSave={handleSave}
              onCancel={cancelEdit}
            />
          ) : (
            <PostRow
              key={post.id}
              mentorId={mentorId}
              post={post}
              confirmingDelete={confirmingDeleteId === post.id}
              deleting={deletingId === post.id}
              disabled={editingId !== null || deletingId !== null}
              onEdit={() => startEdit(post)}
              onDelete={() => handleDelete(post.id)}
              onCancelDelete={() => setConfirmingDeleteId(null)}
            />
          ),
        )}
        {editingId === null && (
          <button
            type="button"
            onClick={startAdd}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-primary p-4"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft">
              <Plus className="size-4 text-primary" />
            </span>
            <span className="font-sans text-base font-semibold text-primary">
              {posts.length === 0 ? 'Write a free post' : 'Write another post'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

interface PostRowProps {
  mentorId: string;
  post: MentorPostRecord;
  confirmingDelete: boolean;
  deleting: boolean;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
}

function PostRow({
  mentorId,
  post,
  confirmingDelete,
  deleting,
  disabled,
  onEdit,
  onDelete,
  onCancelDelete,
}: PostRowProps) {
  const edited = post.updatedAt !== post.publishedAt;
  const publishedDate = formatPostDate(post.publishedAt);

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl bg-canvas p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-sans text-base font-semibold text-ink">{post.title}</p>
        <p className="font-sans text-sm text-ink-soft">{postExcerpt(post.body)}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1 font-sans text-xs text-ink-muted">
          {publishedDate && (
            <span>
              Published {publishedDate}
              {edited ? ' · Edited' : ''}
            </span>
          )}
          <Link
            to={`/mentors/${mentorId}/posts/${post.id}`}
            className="inline-flex items-center gap-1 font-medium text-secondary hover:underline"
          >
            Public link
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
      {confirmingDelete ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-sans text-xs font-medium text-ink-soft">Delete this post?</span>
          <Button type="button" size="md" variant="outlined" disabled={disabled} onClick={onDelete}>
            Confirm
          </Button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="font-sans text-sm font-medium text-ink-soft"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label={`Edit ${post.title}`}
            disabled={disabled}
            onClick={onEdit}
            className="flex text-ink-muted disabled:opacity-40"
          >
            <Pencil className="size-4.5" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${post.title}`}
            disabled={disabled || deleting}
            onClick={onDelete}
            className="flex text-tertiary disabled:opacity-40"
          >
            <Trash2 className="size-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}

interface PostEditFormProps {
  draft: MentorPostDraft;
  errors: Record<string, string>;
  saving: boolean;
  submitLabel: string;
  onDraftChange: (draft: MentorPostDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}

function PostEditForm({
  draft,
  errors,
  saving,
  submitLabel,
  onDraftChange,
  onSave,
  onCancel,
}: PostEditFormProps) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border-[1.5px] border-primary bg-canvas p-4">
      <Input
        type="text"
        label="Title"
        placeholder="e.g. 5 patterns for technical interviews"
        maxLength={POST_TITLE_MAX_LENGTH}
        value={draft.title}
        error={errors.title}
        onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
        autoFocus
      />
      <Textarea
        label="Post content"
        placeholder="Share your explanation, examples, or study notes…"
        maxLength={POST_BODY_MAX_LENGTH}
        hint={`${draft.body.length}/${POST_BODY_MAX_LENGTH}`}
        className="h-48 resize-y"
        value={draft.body}
        error={errors.body}
        onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
      />
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="font-sans text-sm font-medium text-ink-soft"
        >
          Cancel
        </button>
        <Button
          type="button"
          size="md"
          disabled={saving}
          onClick={onSave}
          icon={<Check className="size-4" />}
        >
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
