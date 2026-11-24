import type { ReactNode } from 'react';
import { useAuth } from '@/auth/useAuth';
import { Footer } from '@/components/layout/Footer';
import { NavBar } from '@/components/layout/NavBar';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export function ProfileLayout({
  title,
  loadingMessage = 'Loading…',
  children,
}: {
  title: string;
  loadingMessage?: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">{loadingMessage}</p>;
  if (user) return <DashboardLayout title={title}>{children}</DashboardLayout>;
  return (
    <>
      <NavBar className="max-sm:h-auto max-sm:flex-wrap max-sm:gap-4 max-sm:py-4" />
      <main className="mx-auto max-w-7xl">{children}</main>
      <Footer />
    </>
  );
}
