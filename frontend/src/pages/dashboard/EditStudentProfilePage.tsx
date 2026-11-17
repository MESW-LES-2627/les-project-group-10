import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Button, buttonVariants, Chip, Input, RangeSlider, SelectField } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { getCategories } from '@/api/categories';
import type { Category } from '@/api/categories';
import { ApiError } from '@/api/client';
import { getStudentProfile, updateStudentProfile } from '@/api/students';
import type { StudentProfile, UpdateStudentProfileInput } from '@/api/students';
import { useAuth } from '@/auth/useAuth';
import { BUDGET_SLIDER, DEFAULT_BUDGET, STUDY_LEVELS } from '@/lib/studentProfile';

const PROFILE_PATH = '/dashboard/student';

/** Everything the form edits, in the shapes the inputs use (text, euros, ids). */
interface Draft {
  programme: string;
  enrollmentYear: string;
  studyLevel: string | null;
  budgetMin: number;
  budgetMax: number;
  /** Only send the budget if the student moved the slider, so defaults are never saved by accident. */
  budgetTouched: boolean;
  interestIds: string[];
}

/** Nearest slider step inside the slider bounds, for showing a saved budget in euros. */
function toSliderEuros(cents: number) {
  const { min, max, step } = BUDGET_SLIDER;
  return Math.min(max, Math.max(min, Math.round(cents / 100 / step) * step));
}

function toDraft(profile: StudentProfile): Draft {
  const min =
    profile.budgetMinCents === null ? DEFAULT_BUDGET.min : toSliderEuros(profile.budgetMinCents);
  const max =
    profile.budgetMaxCents === null ? DEFAULT_BUDGET.max : toSliderEuros(profile.budgetMaxCents);
  return {
    programme: profile.programme ?? '',
    enrollmentYear: profile.enrollmentYear === null ? '' : String(profile.enrollmentYear),
    studyLevel: profile.studyLevel,
    // a half-saved budget plus a default end could cross over, so keep min <= max
    budgetMin: Math.min(min, max),
    budgetMax: Math.max(min, max),
    budgetTouched: false,
    interestIds: profile.categoryIds,
  };
}

/** A readable message for a failed save that is not tied to one field. */
function saveErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Please log in again.';
    if (error.status < 500) return error.message;
  }
  return 'Could not save your changes. Check your connection and try again.';
}

/** Edit form for the signed-in student's own profile. Saves with one `PATCH /api/students/me`. */
export default function EditStudentProfilePage() {
  const { user } = useAuth();
  if (!user?.isStudent) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout title="Edit student profile">
      <ProfileEditor />
    </DashboardLayout>
  );
}

function ProfileEditor() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);

  const [options, setOptions] = useState<Category[]>([]);
  const [optionsStatus, setOptionsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [optionsAttempt, setOptionsAttempt] = useState(0);

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getStudentProfile()
      .then((profile) => {
        if (!cancelled) setDraft(toDraft(profile));
      })
      .catch((error: unknown) => {
        console.error('Could not load the student profile:', error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [profileAttempt]);

  // Subject areas come from the database, so each chip carries a real category id.
  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((categories) => {
        if (cancelled) return;
        setOptions(categories);
        setOptionsStatus('ready');
      })
      .catch((error: unknown) => {
        console.error('Could not load the subject areas:', error);
        if (!cancelled) setOptionsStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [optionsAttempt]);

  function update(patch: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function toggleInterest(id: string) {
    if (!draft) return;
    update({
      interestIds: draft.interestIds.includes(id)
        ? draft.interestIds.filter((item) => item !== id)
        : [...draft.interestIds, id],
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    setFormError('');

    // An unparseable year must never turn into NaN, which JSON would send as null and clear it.
    const yearText = draft.enrollmentYear.trim();
    if (yearText !== '' && !/^\d{4}$/.test(yearText)) {
      setFieldErrors({ enrollmentYear: 'Enter a four-digit year, for example 2024' });
      return;
    }
    setFieldErrors({});

    const programme = draft.programme.trim();
    const input: UpdateStudentProfileInput = {
      programme: programme === '' ? null : programme,
      enrollmentYear: yearText === '' ? null : Number(yearText),
      studyLevel: draft.studyLevel,
      ...(draft.budgetTouched
        ? { budgetMinCents: draft.budgetMin * 100, budgetMaxCents: draft.budgetMax * 100 }
        : {}),
      // Without the list loaded the student could not have seen or changed their interests.
      ...(optionsStatus === 'ready' ? { categoryIds: draft.interestIds } : {}),
    };

    setSaving(true);
    try {
      await updateStudentProfile(input);
      navigate(PROFILE_PATH);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setFieldErrors(error.fields);
        setFormError('Check the highlighted fields.');
      } else {
        setFormError(saveErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="flex max-w-4xl flex-col gap-4 px-4 py-6 lg:px-8 lg:py-8">
        {loadError ? (
          <>
            <p role="alert" className="font-sans text-sm text-danger">
              Could not load your profile.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outlined"
                size="md"
                onClick={() => {
                  setLoadError(false);
                  setProfileAttempt((current) => current + 1);
                }}
              >
                Try again
              </Button>
              <Link
                to={PROFILE_PATH}
                className={buttonVariants({ variant: 'outlined', size: 'md' })}
              >
                Back to profile
              </Link>
            </div>
          </>
        ) : (
          <p className="font-sans text-sm text-ink-muted">Loading…</p>
        )}
      </div>
    );
  }

  const budgetError = fieldErrors.budgetMinCents ?? fieldErrors.budgetMaxCents;

  return (
    <div className="flex max-w-4xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Edit profile</h1>
        <p className="font-sans text-base text-ink-soft">
          Your name and email stay the same. Everything else here helps us match you with mentors.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-7 rounded-[20px] border border-line bg-surface p-7"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            label="Programme (Course Name)"
            placeholder="e.g. MESW"
            maxLength={100}
            value={draft.programme}
            error={fieldErrors.programme}
            onChange={(event) => update({ programme: event.target.value })}
          />
          <Input
            label="Enrollment year"
            placeholder="e.g. 2024"
            inputMode="numeric"
            maxLength={4}
            value={draft.enrollmentYear}
            error={fieldErrors.enrollmentYear}
            onChange={(event) => update({ enrollmentYear: event.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <SelectField
            label="Study level"
            placeholder="Select your study level"
            leadingIcon={<GraduationCap className="size-5" />}
            options={STUDY_LEVELS}
            value={draft.studyLevel}
            onChange={(studyLevel) => update({ studyLevel })}
          />
          {fieldErrors.studyLevel && (
            <p role="alert" className="font-sans text-sm text-danger">
              {fieldErrors.studyLevel}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <RangeSlider
            label="Budget per session"
            min={BUDGET_SLIDER.min}
            max={BUDGET_SLIDER.max}
            step={BUDGET_SLIDER.step}
            valueMin={draft.budgetMin}
            valueMax={draft.budgetMax}
            onChange={({ min, max }) =>
              update({ budgetMin: min, budgetMax: max, budgetTouched: true })
            }
            formatValue={(value) => `€${value}`}
            valueClassName="text-primary"
          />
          {budgetError && (
            <p role="alert" className="font-sans text-sm text-danger">
              {budgetError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <p className="font-sans text-base font-semibold text-ink">Interests</p>
            <p className="font-sans text-xs font-medium text-ink-muted">Pick as many as apply</p>
          </div>

          {optionsStatus === 'loading' && (
            <p className="font-sans text-sm text-ink-muted">Loading subject areas…</p>
          )}

          {optionsStatus === 'error' && (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="font-sans text-sm text-danger">
                Could not load the subject areas. Your saved interests stay as they are.
              </p>
              <Button
                type="button"
                variant="outlined"
                size="md"
                onClick={() => {
                  setOptionsStatus('loading');
                  setOptionsAttempt((current) => current + 1);
                }}
              >
                Try again
              </Button>
            </div>
          )}

          {optionsStatus === 'ready' && (
            <div className="flex flex-wrap gap-2.5">
              {options.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  selected={draft.interestIds.includes(category.id)}
                  onClick={() => toggleInterest(category.id)}
                />
              ))}
            </div>
          )}

          {fieldErrors.categoryIds && (
            <p role="alert" className="font-sans text-sm text-danger">
              {fieldErrors.categoryIds}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="font-sans text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link to={PROFILE_PATH} className={buttonVariants({ variant: 'outlined', size: 'md' })}>
            Cancel
          </Link>
          <Button type="submit" size="md" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
