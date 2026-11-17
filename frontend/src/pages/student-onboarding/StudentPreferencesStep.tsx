import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, Sparkles } from 'lucide-react';
import { Button, buttonVariants, InfoNote, RangeSlider, SelectField } from '@/components/ui';
import type { InfoNoteTone } from '@/components/ui';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { useStudentOnboarding } from './useStudentOnboarding';

const STUDY_LEVELS = [
  "Bachelor's (1st year)",
  "Bachelor's (2nd year)",
  "Bachelor's (3rd year)",
  "Integrated Master's",
  "Master's",
  'PhD',
];

const TIP_TONE: InfoNoteTone = 'accent';

/**
 * Student onboarding step 2 of 2: budget and study level.
 */
export default function StudentPreferencesStep() {
  const navigate = useNavigate();
  const { data, updateData } = useStudentOnboarding();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate('/student-onboarding/all-set');
  }

  return (
    <OnboardingLayout
      step={2}
      totalSteps={2}
      stepLabel="Your preferences"
      eyebrow="Almost there"
      title="A couple more things"
      description="This helps us tailor your search. Nothing here is locked in — adjust filters anytime."
      exitLabel="Skip for now"
      actions={
        <>
          <Link
            to="/student-onboarding/interests"
            className={buttonVariants({ variant: 'outlined' })}
          >
            Back
          </Link>
          <Button
            type="submit"
            form="student-preferences-form"
            variant="blue"
            icon={<ArrowRight className="size-5" />}
          >
            Finish setup
          </Button>
        </>
      }
    >
      <form
        id="student-preferences-form"
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-7 rounded-[20px] border border-line bg-surface p-10"
      >
        <RangeSlider
          label="Budget per session"
          min={10}
          max={80}
          step={5}
          valueMin={data.budgetMin}
          valueMax={data.budgetMax}
          onChange={({ min, max }) => updateData({ budgetMin: min, budgetMax: max })}
          formatValue={(value) => `€${value}`}
        />

        <SelectField
          label="Study level"
          placeholder="Select your study level"
          leadingIcon={<GraduationCap className="size-5" />}
          options={STUDY_LEVELS}
          value={data.studyLevel}
          onChange={(studyLevel) => updateData({ studyLevel })}
        />
      </form>

      <InfoNote icon={<Sparkles className="size-5" />} tone={TIP_TONE}>
        We&rsquo;ll use this to show you the most relevant mentors first — you can always change
        filters later.
      </InfoNote>
    </OnboardingLayout>
  );
}
