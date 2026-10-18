import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import { Button, Checkbox, Input } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { safeNext, signIn } from '@/lib/auth';

/**
 * `/login` screen: email/password form inside the shared AuthLayout.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signIn('student');
    navigate(safeNext(searchParams.get('next')) ?? '/dashboard');
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      headline="Your next session is one click away."
      subcopy="Pick up where you left off — upcoming sessions, chats and bookings are waiting."
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-5xl font-bold tracking-tight text-ink">Log in</h1>
          <p className="font-sans text-base text-ink-soft">
            Students and mentors use the same login. We&rsquo;ll take you to the right place.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            type="email"
            name="email"
            label="Email"
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
            autoComplete="current-password"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <Checkbox checked={keepLoggedIn} onChange={setKeepLoggedIn} label="Keep me logged in" />
          <Link to="/forgot-password" className="font-sans text-sm font-medium text-secondary">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth icon={<ArrowRight className="size-5" />}>
          Log in
        </Button>

        <p className="text-center font-sans text-sm text-ink-soft">
          New to FEUP Connect?{' '}
          <Link to="/signup" className="font-semibold text-secondary">
            Create an account
          </Link>
        </p>

        <div className="flex gap-3 rounded-xl bg-accent-soft p-4">
          <Sparkles className="size-5 shrink-0 text-accent-strong" />
          <p className="font-sans text-sm text-accent-strong">
            Prototype accounts — student: ana@fe.up.pt · mentor: mariana@fe.up.pt (password:
            demo1234)
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
