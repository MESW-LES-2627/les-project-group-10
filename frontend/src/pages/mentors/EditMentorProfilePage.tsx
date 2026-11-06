import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { getMentorProfileEditor, saveMentorProfile } from '@/api/mentors';
import type { EditableMentorProfile } from '@/api/mentors';
import { useAuth } from '@/auth/useAuth';
import { Button, Chip, Input, Textarea } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { validateMentorProfile } from '@/lib/mentorProfileEdit';

export default function EditMentorProfilePage() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  if (!user) return <Navigate to="/login?next=%2Fdashboard%2Fprofile" replace />;
  if (!user.isMentor)
    return (
      <DashboardLayout title="Edit profile">
        <p role="alert">Only mentors can edit a mentor profile.</p>
      </DashboardLayout>
    );
  if (!user.onboardingFinished) return <Navigate to="/mentor-onboarding/profile" replace />;
  return (
    <DashboardLayout title="Edit profile">
      <ProfileEditor key={user.id} userId={user.id} />
    </DashboardLayout>
  );
}

function ProfileEditor({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const profilePath = `/mentors/${userId}`;
  const [draft, setDraft] = useState<EditableMentorProfile | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [accessError, setAccessError] = useState(false);
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
    getMentorProfileEditor()
      .then((data) => {
        if (cancelled) return;
        setDraft(data.profile);
        setSubjectOptions(data.subjectOptions);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError ? error.message : 'Could not load your profile. Try again.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (message) {
      errorSummary.current?.focus();
    }
  }, [message, errors]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || submitting.current || accessError) return;
    const validation = validateMentorProfile(draft);
    setErrors(validation);
    setMessage('');
    if (Object.keys(validation).length) {
      setMessage('Check the highlighted fields.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await saveMentorProfile(draft);
      if (!mounted.current) return;
      navigate(profilePath);
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ApiError) {
        setErrors(error.fields);
        setAccessError([401, 403, 409].includes(error.status));
        setMessage(error.message);
      } else {
        setMessage(
          'Could not confirm the save. Your changes are still here. Retry or reload to check the saved profile.',
        );
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  if (!draft)
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
          <p role="status">Loading your profile…</p>
        )}
      </div>
    );

  function update(patch: Partial<EditableMentorProfile>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setMessage('');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-ink">Edit public profile</h1>
        <Link to={profilePath} className="text-secondary underline">
          View profile
        </Link>
      </div>
      <p className="text-ink-soft">
        Keep your expertise up to date. All fields except skills are required.
      </p>
      {message && (
        <p ref={errorSummary} tabIndex={-1} role="alert">
          {message}
        </p>
      )}
      {accessError && (
        <Link to="/login?next=%2Fdashboard%2Fprofile" className="underline">
          Sign in again or reload your account
        </Link>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6"
      >
        <fieldset
          disabled={saving || accessError}
          className="flex min-w-0 flex-col gap-6 disabled:opacity-70"
        >
          <Input
            label="Professional headline"
            value={draft.headline}
            maxLength={120}
            required
            error={errors.headline}
            onChange={(event) => update({ headline: event.target.value })}
          />
          <Textarea
            label="About you"
            placeholder="Share your experience, background and how you can help students."
            value={draft.bio}
            maxLength={1000}
            required
            hint={`${draft.bio.length}/1000`}
            error={errors.bio}
            onChange={(event) => update({ bio: event.target.value })}
          />
          <div
            role="group"
            aria-labelledby="subjects-label"
            aria-describedby={errors.subjects ? 'subjects-error' : undefined}
            aria-invalid={!!errors.subjects}
          >
            <p id="subjects-label" className="mb-2 font-medium">
              Subject areas ({draft.subjects.length}/4)
            </p>
            <div className="flex flex-wrap gap-2">
              {subjectOptions.map((subject) => (
                <Chip
                  key={subject}
                  label={subject}
                  selected={draft.subjects.includes(subject)}
                  onClick={() => {
                    const subjects = draft.subjects.includes(subject)
                      ? draft.subjects.filter((value) => value !== subject)
                      : draft.subjects.length < 4
                        ? [...draft.subjects, subject]
                        : draft.subjects;
                    update({ subjects });
                  }}
                />
              ))}
            </div>
            {errors.subjects && (
              <p id="subjects-error" role="alert" className="text-danger">
                {errors.subjects}
              </p>
            )}
          </div>
          <Textarea
            label="Skills"
            hint={`${draft.skills.length}/15 · one skill per line, up to 40 characters each`}
            value={draft.skills.join('\n')}
            error={errors.skills}
            onChange={(event) =>
              update({ skills: event.target.value === '' ? [] : event.target.value.split('\n') })
            }
          />
        </fieldset>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving || accessError}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={saving}
            onClick={() => navigate(profilePath)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
