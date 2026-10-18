import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Eye, EyeOff, GraduationCap, Lock, Mail, User } from 'lucide-react';
import { Button, Checkbox, Input, Textarea } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RoleOptionCard } from '@/components/auth/RoleOptionCard';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';

type Role = 'student' | 'mentor';

/**
 * `/signup` screen: role picker plus account form inside the shared
 * AuthLayout. Mentors also write a short bio, which the backend needs
 * to create their mentor profile.
 */
export default function SignUpPage() {
  const navigate = useNavigate();
  const { registerStudent, registerMentor } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // messages the API attaches to a field (username, email, password, bio)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // anything that belongs to the whole form (server down, unexpected error)
  const [formError, setFormError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');
    setSubmitting(true);

    try {
      const account = { username: fullName, email, password };
      if (role === 'mentor') {
        await registerMentor({ ...account, bio });
        navigate('/mentor-onboarding/profile');
      } else {
        await registerStudent(account);
        navigate('/student-onboarding/interests');
      }
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setFieldErrors(error.fields);
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="For FEUP students & mentors"
      headline="Learn from people who’ve been there."
      subcopy="Find tutors, mentors and industry pros. Compare fees, book a session and get the help you need. One clear step at a time."
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-5xl font-bold tracking-tight text-ink">
            Create your account
          </h1>
          <p className="font-sans text-base text-ink-soft">
            Pick how you&rsquo;ll use FEUP Connect. You can add the other role later.
          </p>
        </div>

        <div className="flex gap-4">
          <RoleOptionCard
            icon={<GraduationCap className="size-5.5" />}
            title="I’m a student"
            description="Find mentors, book paid sessions and track your learning."
            selected={role === 'student'}
            onSelect={() => setRole('student')}
          />
          <RoleOptionCard
            icon={<Briefcase className="size-5.5" />}
            title="I’m a mentor"
            description="Share your expertise, set your fee and get booked."
            selected={role === 'mentor'}
            onSelect={() => setRole('mentor')}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Input
            type="text"
            name="fullName"
            label="Full name"
            placeholder="Ana Oliveira"
            leadingIcon={<User className="size-5" />}
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            error={fieldErrors.username}
            maxLength={50}
            required
          />
          <Input
            type="email"
            name="email"
            label="University email"
            placeholder="ana.oliveira@fe.up.pt"
            leadingIcon={<Mail className="size-5" />}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            required
          />
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            label="Password"
            placeholder="••••••••••"
            leadingIcon={<Lock className="size-5" />}
            trailingIcon={showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            onTrailingIconClick={() => setShowPassword((value) => !value)}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            minLength={6}
            maxLength={72}
            required
          />
          {role === 'mentor' && (
            <Textarea
              name="bio"
              label="Short bio"
              hint={`${bio.length}/1000`}
              placeholder="Tell students what you can help them with."
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              error={fieldErrors.bio}
              maxLength={1000}
              required
            />
          )}
        </div>

        <Checkbox
          checked={agreedToTerms}
          onChange={setAgreedToTerms}
          label={
            <>
              I agree to the <span className="text-secondary">Terms of Service</span> and{' '}
              <span className="text-secondary">Privacy Policy</span>
            </>
          }
        />

        {formError && (
          <p role="alert" className="font-sans text-sm text-danger">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={!agreedToTerms || submitting}
          icon={<ArrowRight className="size-5" />}
        >
          {submitting ? 'Creating account…' : `Create ${role} account`}
        </Button>

        <p className="text-center font-sans text-sm text-ink-soft">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-secondary">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
