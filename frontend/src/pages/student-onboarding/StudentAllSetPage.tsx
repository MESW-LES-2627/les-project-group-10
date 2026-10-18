import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui';
import { MentorSummaryCard } from '@/components/mentors/MentorSummaryCard';
import type { MentorSummary } from '@/components/mentors/MentorSummaryCard';
import { OnboardingTopBar } from '@/layouts/OnboardingTopBar';
import { useStudentOnboarding } from './useStudentOnboarding';

const RECOMMENDED_MENTORS: MentorSummary[] = [
  {
    id: 'mariana-silva',
    initials: 'MS',
    avatarTone: 'primary',
    name: 'Mariana Silva',
    role: 'Senior Software Engineer',
    tag: 'Algorithms',
    tagTone: 'green',
    rating: '4.9',
    price: '€35',
  },
  {
    id: 'rui-almeida',
    initials: 'RA',
    avatarTone: 'accent',
    name: 'Rui Almeida',
    role: 'Teaching Assistant, FEUP',
    tag: 'Exam prep',
    tagTone: 'yellow',
    rating: '5.0',
    price: '€15',
  },
  {
    id: 'ines-costa',
    initials: 'IC',
    avatarTone: 'tertiary',
    name: 'Inês Costa',
    role: 'Software Architect',
    tag: 'Career advice',
    tagTone: 'orange',
    rating: '4.7',
    price: '€40',
  },
];

/**
 * Shown right after a student finishes onboarding: confirms setup
 * is done and suggests a few mentors to start with.
 */
export default function StudentAllSetPage() {
  const { data } = useStudentOnboarding();

  return (
    <div className="flex w-full flex-col items-center bg-canvas">
      <OnboardingTopBar label="Student profile · All set" exitLabel="Exit" />

      <div className="flex w-full max-w-225 flex-col items-center gap-7 px-6 pb-24 pt-16">
        <span className="flex size-20 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-10 text-success" />
        </span>

        <p className="text-center font-display text-5xl font-bold leading-tight tracking-tight text-ink">
          You&rsquo;re all set!
        </p>
        <p className="text-center font-sans text-lg leading-relaxed text-ink-soft">
          {data.interests.length > 0
            ? 'Based on what you told us, here are a few mentors to start with.'
            : 'Here are a few mentors other students love — you can refine your search anytime.'}
        </p>

        <div className="flex w-full flex-col gap-6 lg:flex-row">
          {RECOMMENDED_MENTORS.map((mentor) => (
            <MentorSummaryCard key={mentor.id} mentor={mentor} />
          ))}
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link
            to="/mentors"
            className={buttonVariants({
              variant: 'outlined',
              fullWidth: true,
              className: 'sm:flex-1',
            })}
          >
            Browse all mentors
          </Link>
          <Link
            to="/"
            className={buttonVariants({ variant: 'blue', fullWidth: true, className: 'sm:flex-1' })}
          >
            Go to my dashboard
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
