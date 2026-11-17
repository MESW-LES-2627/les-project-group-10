import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Avatar, Tag, buttonVariants } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { getStudentProfile } from '@/api/students';
import type { StudentProfile } from '@/api/students';
import { useAuth } from '@/auth/useAuth';
import { formatEuro } from '@/lib/booking';
import { getInitials } from '@/lib/mentorProfile';

const NOT_SET = 'Not set yet';

/** Budget is stored as integer cents; either end can be missing. */
function formatBudget(minCents: number | null, maxCents: number | null) {
  if (minCents !== null && maxCents !== null) {
    return `${formatEuro(minCents / 100)} – ${formatEuro(maxCents / 100)}`;
  }
  if (maxCents !== null) return `Up to ${formatEuro(maxCents / 100)}`;
  if (minCents !== null) return `From ${formatEuro(minCents / 100)}`;
  return null;
}

/**
 * Read-only view of the signed-in student's own profile. Name and email come
 * from the auth user; the rest comes from `GET /api/students/me`.
 */
export default function StudentProfilePage() {
  const { user } = useAuth();
  const isStudent = user?.isStudent ?? false;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Accounts without a student profile are redirected below, so there is nothing to load.
    if (!isStudent) return;
    let cancelled = false;
    getStudentProfile()
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((error: unknown) => {
        console.error('Could not load the student profile:', error);
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isStudent]);

  if (!isStudent) return <Navigate to="/dashboard" replace />;

  const budget = profile ? formatBudget(profile.budgetMinCents, profile.budgetMaxCents) : null;

  return (
    <DashboardLayout title="Student profile">
      <div className="flex max-w-4xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
        <section className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] border border-line bg-surface p-7">
          <div className="flex min-w-0 items-center gap-5">
            <Avatar initials={user ? getInitials(user.username) : ''} tone="tertiary" size="lg" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="truncate font-display text-3xl font-bold tracking-tight text-ink">
                {user?.username}
              </p>
              <p className="truncate font-sans text-base text-ink-soft">{user?.email}</p>
            </div>
          </div>
          <Link
            to="/dashboard/student/edit"
            className={buttonVariants({ variant: 'outlined', size: 'md' })}
          >
            <Pencil className="size-4" />
            Edit profile
          </Link>
        </section>

        <section className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-7">
          <p className="font-display text-2xl font-semibold tracking-tight text-ink">About you</p>
          {loading ? (
            <p className="font-sans text-sm text-ink-muted">Loading…</p>
          ) : failed || !profile ? (
            <div className="rounded-2xl bg-canvas px-5 py-6">
              <p className="font-sans text-sm font-semibold text-ink">
                Could not load your profile
              </p>
              <p className="font-sans text-sm text-ink-soft">
                Please refresh the page to try again.
              </p>
            </div>
          ) : (
            <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <Detail label="Programme" value={profile.programme} />
              <Detail
                label="Enrollment year"
                value={profile.enrollmentYear === null ? null : String(profile.enrollmentYear)}
              />
              <Detail label="Study level" value={profile.studyLevel} />
              <Detail label="Budget per session" value={budget} />
              <div className="flex flex-col gap-2 sm:col-span-2">
                <dt className="font-sans text-sm text-ink-muted">Interests</dt>
                <dd>
                  {profile.categories.length === 0 ? (
                    <span className="font-sans text-base text-ink-soft">{NOT_SET}</span>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {profile.categories.map((category) => (
                        <li key={category.id}>
                          <Tag label={category.name} tone="dark" />
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-sans text-sm text-ink-muted">{label}</dt>
      <dd className="font-sans text-base font-medium text-ink">
        {value ?? <span className="font-normal text-ink-soft">{NOT_SET}</span>}
      </dd>
    </div>
  );
}
