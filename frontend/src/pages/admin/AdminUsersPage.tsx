import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import clsx from 'clsx';
import { Button, Tag } from '@/components/ui';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { getAdminMentors, getAdminStudents } from '@/api/admin';
import type { AdminMentor, AdminStudent, AdminUserPage } from '@/api/admin';
import { useAuth } from '@/auth/useAuth';

const PAGE_SIZE = 20;

type TabId = 'students' | 'mentors';
type AdminUser = AdminStudent | AdminMentor;

const TABS: { id: TabId; label: string; otherRole: string; empty: string }[] = [
  { id: 'students', label: 'Students', otherRole: 'Also mentor', empty: 'No students to show.' },
  { id: 'mentors', label: 'Mentors', otherRole: 'Also student', empty: 'No mentors to show.' },
];

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

function fetchPage(tab: TabId, page: number): Promise<AdminUserPage<AdminUser>> {
  return tab === 'students' ? getAdminStudents(page, PAGE_SIZE) : getAdminMentors(page, PAGE_SIZE);
}

/** The students list says "also mentor", the mentors list says "also student". */
function hasOtherRole(user: AdminUser) {
  return 'alsoMentor' in user ? user.alsoMentor : user.alsoStudent;
}

/**
 * Admin-only list of registered users, one tab per role, paginated by the server.
 * Hiding this page from other users is only a convenience: the API enforces the access rule.
 */
export default function AdminUsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const [tab, setTab] = useState<TabId>('students');
  const [page, setPage] = useState(1);
  const [reloads, setReloads] = useState(0);
  const [data, setData] = useState<AdminUserPage<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Non-admins are redirected below, so there is nothing to load.
    if (!isAdmin) return;
    let cancelled = false;
    fetchPage(tab, page)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error: unknown) => {
        console.error('Could not load the user list:', error);
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `reloads` only exists to run this effect again when the admin presses Retry.
  }, [isAdmin, tab, page, reloads]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  // Every change that triggers a new fetch also resets the screen to "loading".
  function startLoading() {
    setLoading(true);
    setFailed(false);
  }

  function changeTab(next: TabId) {
    if (next === tab) return;
    startLoading();
    setData(null);
    setTab(next);
    setPage(1);
  }

  function changePage(next: number) {
    startLoading();
    setPage(next);
  }

  function retry() {
    startLoading();
    setReloads((count) => count + 1);
  }

  const current = TABS.find((candidate) => candidate.id === tab) ?? TABS[0];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <DashboardLayout title="User administration">
      <div className="flex max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Users</h1>
          <p className="font-sans text-base text-ink-soft">
            Registered accounts, newest first. An account that is both a student and a mentor
            appears in both tabs.
          </p>
        </div>

        <div role="tablist" aria-label="User role" className="flex gap-2">
          {TABS.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              id={`tab-${candidate.id}`}
              aria-selected={candidate.id === tab}
              aria-controls="users-panel"
              onClick={() => changeTab(candidate.id)}
              className={clsx(
                'h-11 rounded-[10px] px-5 font-sans text-sm font-semibold transition-colors',
                candidate.id === tab
                  ? 'bg-primary text-ink-inverse'
                  : 'bg-surface text-ink hover:bg-subtle',
              )}
            >
              {candidate.label}
            </button>
          ))}
        </div>

        <section
          id="users-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 lg:p-7"
        >
          {loading ? (
            <p role="status" className="font-sans text-sm text-ink-muted">
              Loading users…
            </p>
          ) : failed || !data ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-canvas p-5">
              <div className="flex flex-col gap-1">
                <p className="font-sans text-sm font-semibold text-ink">Could not load the users</p>
                <p className="font-sans text-sm text-ink-soft">
                  Check your connection and try again.
                </p>
              </div>
              <Button type="button" variant="outlined" size="md" onClick={retry}>
                Retry
              </Button>
            </div>
          ) : data.users.length === 0 ? (
            <p className="rounded-2xl bg-canvas px-5 py-6 font-sans text-sm text-ink-soft">
              {current.empty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl border-collapse text-left font-sans text-sm">
                <caption className="sr-only">{current.label}</caption>
                <thead>
                  <tr className="border-b border-line text-ink-muted">
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Name
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Email
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      ID
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Status
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Created
                    </th>
                    <th scope="col" className="py-3 font-medium">
                      {current.otherRole}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-b-0">
                      <td className="py-3 pr-4 font-medium text-ink">{row.username}</td>
                      <td className="py-3 pr-4 text-ink-soft">{row.email}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-ink-muted">{row.id}</td>
                      <td className="py-3 pr-4">
                        <Tag
                          label={row.isBanned ? 'Banned' : 'Active'}
                          tone={row.isBanned ? 'orange' : 'green'}
                        />
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-ink-soft">
                        {dateFormat.format(new Date(row.createdAt))}
                      </td>
                      <td className="py-3 text-ink-soft">{hasOtherRole(row) ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !failed && data && (
            <nav
              aria-label="Pagination"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="font-sans text-sm text-ink-muted">
                Page {data.page} of {totalPages} · {data.total}{' '}
                {data.total === 1 ? 'user' : 'users'}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outlined"
                  size="md"
                  disabled={data.page <= 1}
                  onClick={() => changePage(data.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  size="md"
                  disabled={data.page >= totalPages}
                  onClick={() => changePage(data.page + 1)}
                >
                  Next
                </Button>
              </div>
            </nav>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
