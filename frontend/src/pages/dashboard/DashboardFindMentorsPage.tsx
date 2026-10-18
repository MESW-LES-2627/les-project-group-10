import { MentorDirectory } from '@/components/mentors/MentorDirectory';
import { DashboardLayout } from '@/layouts/DashboardLayout';

/**
 * `/dashboard/mentors`: the same mentor search, inside the signed-in
 * dashboard instead of the public site header.
 */
export default function DashboardFindMentorsPage() {
  return (
    <DashboardLayout title="Find a mentor">
      <div className="flex flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Find a mentor</h1>
          <p className="font-sans text-base text-ink-soft">
            Compare expertise, fees and availability, then book a session.
          </p>
        </div>
        <MentorDirectory />
      </div>
    </DashboardLayout>
  );
}
