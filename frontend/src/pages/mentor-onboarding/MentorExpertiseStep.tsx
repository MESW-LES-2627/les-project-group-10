import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Calendar } from 'lucide-react';
import { Button, buttonVariants, Chip, InfoNote, Input, Textarea } from '@/components/ui';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { SkillTagInput } from '@/components/mentor-onboarding/SkillTagInput';
import { ServiceList } from '@/components/mentor-onboarding/ServiceList';
import { useMentorOnboarding } from './useMentorOnboarding';

// must match the category names in the database (see backend/db/seed.sql)
const SUBJECT_OPTIONS = [
  'Software Engineering',
  'Data Science and AI',
  'Career Guidance',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Mathematics',
  'Physics',
];

const MAX_SUBJECTS = 4;
const MAX_BIO_LENGTH = 600;

/**
 * Mentor onboarding step 2 of 3: headline, subjects, skills,
 * services/fees and bio.
 */
export default function MentorExpertiseStep() {
  const navigate = useNavigate();
  const { data, updateData } = useMentorOnboarding();

  function toggleSubject(subject: string) {
    if (data.subjects.includes(subject)) {
      updateData({ subjects: data.subjects.filter((item) => item !== subject) });
      return;
    }
    if (data.subjects.length >= MAX_SUBJECTS) return;
    updateData({ subjects: [...data.subjects, subject] });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate('/mentor-onboarding/availability');
  }

  return (
    <OnboardingLayout
      step={2}
      stepLabel="Your expertise"
      eyebrow="Mentor profile"
      title="Tell students what you’re great at"
      description="This is what students see when they search. Be specific — it helps the right people find you."
      actions={
        <>
          <Link to="/mentor-onboarding/profile" className={buttonVariants({ variant: 'outlined' })}>
            Back
          </Link>
          <Button
            type="submit"
            form="mentor-expertise-form"
            icon={<ArrowRight className="size-5" />}
          >
            Continue to availability
          </Button>
        </>
      }
    >
      <form
        id="mentor-expertise-form"
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-7 rounded-[20px] border border-line bg-surface p-10"
      >
        <Input
          type="text"
          label="Professional headline"
          placeholder="Senior Software Engineer · Critical TechWorks"
          leadingIcon={<Briefcase className="size-5" />}
          value={data.headline}
          onChange={(event) => updateData({ headline: event.target.value })}
          required
        />

        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center gap-2">
            <p className="font-sans text-sm font-medium text-ink">Subject areas</p>
            <p className="font-sans text-xs text-ink-muted">Choose up to {MAX_SUBJECTS}</p>
          </div>
          <div className="flex w-full flex-wrap gap-2.5">
            {SUBJECT_OPTIONS.map((subject) => (
              <Chip
                key={subject}
                label={subject}
                selected={data.subjects.includes(subject)}
                onClick={() => toggleSubject(subject)}
              />
            ))}
          </div>
        </div>

        <SkillTagInput skills={data.skills} onChange={(skills) => updateData({ skills })} />

        <ServiceList services={data.services} onChange={(services) => updateData({ services })} />

        <Textarea
          label="About you"
          placeholder="Share your background and how you help students."
          hint={`${data.bio.length} / ${MAX_BIO_LENGTH}`}
          value={data.bio}
          maxLength={MAX_BIO_LENGTH}
          onChange={(event) => updateData({ bio: event.target.value })}
          required
        />

        <InfoNote icon={<Calendar className="size-5" />}>
          Next: set your weekly availability. Students can only book the slots you open.
        </InfoNote>
      </form>
    </OnboardingLayout>
  );
}
