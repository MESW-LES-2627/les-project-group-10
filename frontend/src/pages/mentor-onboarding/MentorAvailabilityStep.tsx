import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, Globe } from 'lucide-react';
import { Button, buttonVariants, Checkbox, Input } from '@/components/ui';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { AvailabilityGrid } from '@/components/mentor-onboarding/AvailabilityGrid';
import { ProfilePreviewCard } from '@/components/mentor-onboarding/ProfilePreviewCard';
import { useMentorOnboarding } from './useMentorOnboarding';
import { getInitials, lowestServicePrice, tagsFromSkills } from '@/lib/mentorProfile';

/**
 * Mentor onboarding step 3 of 3: calendar connection, weekly
 * availability grid, and a preview of the resulting public profile.
 */
export default function MentorAvailabilityStep() {
  const navigate = useNavigate();
  const { data, updateData } = useMentorOnboarding();
  const [confirmed, setConfirmed] = useState(true);

  const selectedSlots = useMemo(() => new Set(data.availableSlotKeys), [data.availableSlotKeys]);
  const slotsCount = selectedSlots.size;

  function toggleSlot(key: string) {
    const next = new Set(selectedSlots);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateData({ availableSlotKeys: [...next] });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate('/mentor-onboarding/pending');
  }

  const previewTags = tagsFromSkills(data.skills);
  const fromPrice = lowestServicePrice(data.services) ?? '—';
  const roleLine =
    [data.headline, data.location].filter(Boolean).join(' · ') || 'Add your headline and location';

  return (
    <OnboardingLayout
      step={3}
      stepLabel="Availability"
      eyebrow="Mentor profile"
      title="When are you free to mentor?"
      description="Students can only book the slots you open here. You can change this anytime from your dashboard."
      actions={
        <>
          <Link
            to="/mentor-onboarding/expertise"
            className={buttonVariants({ variant: 'outlined' })}
          >
            Back
          </Link>
          <Button
            type="submit"
            form="mentor-availability-form"
            variant="blue"
            disabled={!confirmed || slotsCount === 0}
            icon={<ArrowRight className="size-5" />}
          >
            Submit for review
          </Button>
        </>
      }
    >
      <form
        id="mentor-availability-form"
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-6"
      >
        <div className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink">
            <Globe className="size-6" />
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="font-sans text-base font-semibold text-ink">Connect Google Calendar</p>
              <span className="flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1">
                <CheckCircle2 className="size-3.5 text-success" />
                <span className="font-sans text-xs font-medium text-success">Connected</span>
              </span>
            </div>
            <p className="font-sans text-sm text-ink-soft">
              Booked sessions sync to your calendar automatically, and we generate a Google Meet
              link for every booking.
            </p>
          </div>
          <Button type="button" variant="outlined" size="md">
            Manage connection
          </Button>
        </div>

        <div className="flex w-full flex-col gap-6 rounded-[20px] border border-line bg-surface p-10">
          <Input
            type="text"
            label="Timezone"
            value="Lisbon (WEST, UTC+1)"
            readOnly
            leadingIcon={<Globe className="size-5" />}
            trailingIcon={<ChevronDown className="size-5" />}
          />

          <AvailabilityGrid selected={selectedSlots} onToggle={toggleSlot} />
        </div>

        <div className="flex w-full flex-col gap-4 rounded-2xl bg-canvas p-5">
          <ProfilePreviewCard
            initials={getInitials(data.fullName) || '—'}
            name={data.fullName || 'Your name'}
            roleLine={roleLine}
            tags={previewTags}
            fromPrice={fromPrice}
            servicesCount={data.services.length}
            slotsCount={slotsCount}
          />
          <Checkbox
            checked={confirmed}
            onChange={setConfirmed}
            label="I confirm this information is accurate and I agree to the Mentor Terms."
          />
        </div>
      </form>
    </OnboardingLayout>
  );
}
