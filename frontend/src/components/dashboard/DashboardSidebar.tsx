import { Link, useLocation } from 'react-router-dom';
import {
  Bookmark,
  Calendar,
  Clock,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  UserRound,
  SlidersHorizontal,
  Briefcase,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Avatar, Logo } from '@/components/ui';
import { useAuth } from '@/auth/useAuth';
import { getInitials } from '@/lib/mentorProfile';

interface RailItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: number;
}

function isActiveItem(href: string | undefined, pathname: string, hash: string) {
  if (!href) return false;
  const [path, itemHash] = href.split('#');
  if (itemHash) return pathname === path && hash === `#${itemHash}`;
  if (path === '/dashboard') return pathname === '/dashboard' && hash === '';
  if (path === '/dashboard/mentors' && pathname.startsWith('/mentors/')) return true;
  return pathname === path || pathname.startsWith(`${path}/`);
}

const RAIL_ITEMS: RailItem[] = [
  { label: 'Overview', icon: SlidersHorizontal, href: '/dashboard' },
  { label: 'Find a mentor', icon: Search, href: '/dashboard/mentors' },
  { label: 'Sessions', icon: Calendar, href: '/dashboard#sessions' },
  { label: 'Messages', icon: MessageSquare, href: '/dashboard#messages' },
  { label: 'Saved mentors', icon: Bookmark, href: '/dashboard#saved' },
  { label: 'Settings', icon: Settings, href: '/dashboard#settings' },
];

export interface DashboardSidebarProps {
  open: boolean;
  onNavigate: () => void;
}

/**
 * Full-height navigation for the signed-in student app. Stays on the
 * left of the dashboard; on small screens it slides in over the page.
 */
export function DashboardSidebar({ open, onNavigate }: DashboardSidebarProps) {
  const { pathname, hash } = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside
      className={clsx(
        'z-30 flex h-screen w-72 shrink-0 flex-col border-r border-line bg-surface lg:sticky lg:top-0',
        'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:transition-transform',
        open ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
      )}
    >
      <div className="flex h-18 items-center border-b border-line px-5">
        <Logo to="/dashboard" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {[
          ...RAIL_ITEMS,
          ...(user?.isMentor
            ? [
                { label: 'My profile', icon: UserRound, href: '/dashboard/profile' },
                { label: 'Availability slots', icon: Clock, href: '/dashboard/slots' },
                { label: 'Services & fees', icon: Briefcase, href: '/dashboard/services' },
              ]
            : []),
        ].map((item) => {
          const active = isActiveItem(item.href, pathname, hash);
          const className = clsx(
            'flex w-full items-center gap-3 rounded-[10px] px-3.5 py-3 text-left',
            active ? 'bg-primary-soft text-ink' : 'text-ink-soft hover:bg-canvas',
          );
          const content = (
            <>
              <item.icon className="size-5 shrink-0" />
              <span
                className={clsx(
                  'flex-1 font-sans text-sm',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {item.label}
              </span>
              {item.badge && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-tertiary font-sans text-xs font-medium text-ink-inverse">
                  {item.badge}
                </span>
              )}
            </>
          );

          return item.href ? (
            <Link key={item.label} to={item.href} onClick={onNavigate} className={className}>
              {content}
            </Link>
          ) : (
            <button key={item.label} type="button" className={className}>
              {content}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t border-line p-4">
        <div className="flex items-center gap-3">
          <Avatar initials={user ? getInitials(user.username) : ''} tone="tertiary" size="sm" />
          <div className="min-w-0">
            <p className="truncate font-sans text-sm font-semibold text-ink">
              {user?.username ?? ''}
            </p>
            <p className="truncate font-sans text-xs text-ink-muted">{user?.email ?? ''}</p>
          </div>
        </div>
        <Link
          to="/"
          onClick={() => {
            logout().catch((error: unknown) => console.error('Log out failed:', error));
            onNavigate();
          }}
          className="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 font-sans text-sm font-medium text-ink-soft hover:bg-canvas"
        >
          <LogOut className="size-4.5 shrink-0" />
          Log out
        </Link>
      </div>
    </aside>
  );
}
