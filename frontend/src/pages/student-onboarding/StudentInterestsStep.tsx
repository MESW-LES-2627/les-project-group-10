import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button, buttonVariants, Chip, InfoNote } from '@/components/ui';
import { getCategories } from '@/api/categories';
import type { Category } from '@/api/categories';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { useStudentOnboarding } from './useStudentOnboarding';

/**
 * Student onboarding step 1 of 2: subject areas the student wants
 * help with.
 */
export default function StudentInterestsStep() {
  const navigate = useNavigate();
  const { data, updateData } = useStudentOnboarding();

  const [options, setOptions] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  // Subject areas come from the database so the chips carry real category ids.
  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((categories) => {
        if (cancelled) return;
        setOptions(categories);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        console.error('Could not load the subject areas:', error);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setStatus('loading');
    setAttempt((current) => current + 1);
  }

  function toggleInterest(category: Category) {
    const selected = data.interests.some((item) => item.id === category.id);
    updateData({
      interests: selected
        ? data.interests.filter((item) => item.id !== category.id)
        : [...data.interests, category],
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

        {status === 'loading' && (
          <p className="font-sans text-sm text-ink-muted">Loading subject areas…</p>
        )}

        {status === 'error' && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="font-sans text-sm text-danger">
              Could not load the subject areas. You can continue without them and add interests
              later from your profile.
            </p>
            <Button type="button" variant="outlined" size="md" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <div className="flex w-full flex-wrap gap-2.5">
            {options.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                selected={data.interests.some((item) => item.id === category.id)}
                onClick={() => toggleInterest(category)}
              />
            ))}
          </div>
        )}

        <InfoNote icon={<Sparkles className="size-5" />}>
          Based on FEUP&rsquo;s main departments — select whatever feels relevant, even outside your
          course.
        </InfoNote>
      </form>
    </OnboardingLayout>
  );
}
