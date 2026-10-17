import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Eye, EyeOff, GraduationCap, Lock, Mail, User } from 'lucide-react';
import { Button, Checkbox, Input } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { RoleOptionCard } from '@/components/auth/RoleOptionCard';

type Role = 'student' | 'mentor';

/**
 * `/signup` screen: role picker plus account form inside the shared
 * AuthLayout.
 */
export default function SignUpPage() {
  const [role, setRole] = useState<Role>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <AuthLayout
      eyebrow="For FEUP students & mentors"
      headline="Learn from people who’ve been there."
      subcopy="Find tutors, mentors and industry pros. Compare fees, book a session and get the help you need — one clear step at a time."
    >
      <form className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-5xl font-bold tracking-tight text-ink">Create your account</h1>
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
            required
          />
          <Input
            type="email"
            name="email"
            label="University email"
            placeholder="ana.oliveira@fe.up.pt"
            leadingIcon={<Mail className="size-5" />}
            autoComplete="email"
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
            required
          />
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

        <Button type="submit" fullWidth disabled={!agreedToTerms} icon={<ArrowRight className="size-5" />}>
          Create {role} account
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
