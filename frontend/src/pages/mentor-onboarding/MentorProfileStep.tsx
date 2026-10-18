import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { ArrowRight, Globe, Link2, MapPin, ShieldCheck, User } from 'lucide-react';
import { Button, buttonVariants, InfoNote, Input, MultiSelectField } from '@/components/ui';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';
import { PhotoUploader } from '@/components/mentor-onboarding/PhotoUploader';
import { FALLBACK_LANGUAGES, getLanguages } from '@/api/languages';
import { useMentorOnboarding } from './useMentorOnboarding';

/**
 * Mentor onboarding step 1 of 3: basic profile details (name,
 * location, languages, intro).
 */
export default function MentorProfileStep() {
  const navigate = useNavigate();
  const { data, updateData } = useMentorOnboarding();
  const [languageOptions, setLanguageOptions] = useState<string[]>(FALLBACK_LANGUAGES);

  useEffect(() => {
    let cancelled = false;

    getLanguages().then((options) => {
      if (!cancelled) setLanguageOptions(options);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate('/mentor-onboarding/expertise');
  }

  return (
    <OnboardingLayout
      step={1}
      stepLabel="Your profile"
      eyebrow="Mentor profile"
      title="Let’s set up your mentor profile"
      description="This is what students see first. Takes about 3 minutes — you can edit everything later."
      actions={
        <>
          <Link to="/signup" className={buttonVariants({ variant: 'outlined' })}>
            Back to sign up
          </Link>
          <Button type="submit" form="mentor-profile-form" icon={<ArrowRight className="size-5" />}>
            Continue to expertise
          </Button>
        </>
      }
    >
      <form
        id="mentor-profile-form"
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-7 rounded-[20px] border border-line bg-surface p-10"
      >
        <PhotoUploader />

        <Input
          type="text"
          label="Full name"
          placeholder="Mariana Silva"
          leadingIcon={<User className="size-5" />}
          autoComplete="name"
          value={data.fullName}
          onChange={(event) => updateData({ fullName: event.target.value })}
          required
        />

        <div className="flex w-full gap-4">
          <Input
            type="text"
            label="Location"
            placeholder="Porto, Portugal"
            leadingIcon={<MapPin className="size-5" />}
            value={data.location}
            onChange={(event) => updateData({ location: event.target.value })}
            required
          />
          <MultiSelectField
            label="Languages you speak"
            placeholder="Select languages"
            leadingIcon={<Globe className="size-5" />}
            options={languageOptions}
            selected={data.languages}
            onChange={(languages) => updateData({ languages })}
          />
        </div>

        <Input
          type="url"
          label="LinkedIn or portfolio (optional)"
          placeholder="linkedin.com/in/marianasilva"
          leadingIcon={<Link2 className="size-5" />}
          value={data.linkedIn}
          onChange={(event) => updateData({ linkedIn: event.target.value })}
        />

        <Input
          type="text"
          label="One-line intro"
          placeholder="Making system design click, one session at a time."
          value={data.tagline}
          onChange={(event) => updateData({ tagline: event.target.value })}
          required
        />

        <InfoNote icon={<ShieldCheck className="size-5" />}>
          Next: tell us your subjects, skills and session fee. Verification happens after you
          submit.
        </InfoNote>
      </form>
    </OnboardingLayout>
  );
}
