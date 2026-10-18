import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAuth } from '@/auth/useAuth';
import { getInitials } from '@/lib/mentorProfile';

export interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
}

/**
 * Signed-in student shell: full-height sidebar and a slim top bar.
 * Page content sits in the main column, without the public site header.
 */
export function DashboardLayout({ title, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-ink/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <DashboardSidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-line bg-canvas px-4 lg:px-8">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-[10px] text-ink lg:hidden"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            onClick={() => setSidebarOpen((current) => !current)}
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <p className="hidden font-sans text-sm font-medium text-ink-muted lg:block">{title}</p>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="flex size-10 items-center justify-center text-ink"
            >
              <Bell className="size-5" />
            </button>
            <Avatar initials={user ? getInitials(user.username) : ''} tone="tertiary" size="sm" />
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
