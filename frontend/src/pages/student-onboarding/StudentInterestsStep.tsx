import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button, buttonVariants, Chip, InfoNote } from '@/components/ui';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { useStudentOnboarding } from './useStudentOnboarding';

const INTEREST_OPTIONS = [
  'Software Engineering',
  'Data Science & AI',
  'Career & Internships',
  'Interview Prep',
  'Electrical Eng.',
  'Mechanical Eng.',
  'Civil Eng.',
  'Mathematics',
  'Physics',
  'Thesis & Research',
  'Study Skills',
  'Entrepreneurship',
];

/**
 * Student onboarding step 1 of 2: subject areas the student wants
 * help with.
 */
export default function StudentInterestsStep() {
  const navigate = useNavigate();
  const { data, updateData } = useStudentOnboarding();

  function toggleInterest(interest: string) {
    updateData({
      interests: data.interests.includes(interest)
        ? data.interests.filter((item) => item !== interest)
        : [...data.interests, interest],
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate('/student-onboarding/preferences');
  }

  return (
    <OnboardingLayout
      step={1}
      totalSteps={2}
      stepLabel="Your interests"
      eyebrow="Welcome to FEUP Connect"
      title="What are you hoping to learn?"
      description="Pick a few areas — we’ll recommend mentors who match. You can change this anytime from your profile."
      exitLabel="Skip for now"
      actions={
        <>
          <Link to="/signup" className={buttonVariants({ variant: 'outlined' })}>
            Back to sign up
          </Link>
          <Button
            type="submit"
            form="student-interests-form"
            icon={<ArrowRight className="size-5" />}
          >
            Continue
          </Button>
        </>
      }
    >
      <form
        id="student-interests-form"
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-6 rounded-[20px] border border-line bg-surface p-10"
      >
        <div className="flex items-center gap-2">
          <p className="font-sans text-base font-semibold text-ink">Subject areas</p>
          <p className="font-sans text-xs font-medium text-ink-muted">Pick as many as apply</p>
        </div>

        <div className="flex w-full flex-wrap gap-2.5">
          {INTEREST_OPTIONS.map((interest) => (
            <Chip
              key={interest}
              label={interest}
              selected={data.interests.includes(interest)}
              onClick={() => toggleInterest(interest)}
            />
          ))}
        </div>

        <InfoNote icon={<Sparkles className="size-5" />}>
          Based on FEUP&rsquo;s main departments — select whatever feels relevant, even outside your
          course.
        </InfoNote>
      </form>
    </OnboardingLayout>
  );
}
