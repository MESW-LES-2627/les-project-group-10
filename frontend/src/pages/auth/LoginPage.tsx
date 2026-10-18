import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button, Checkbox, Input } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { safeNext } from '@/lib/auth';
import { pathAfterLogin } from '@/lib/authRedirect';

/**
 * `/login` screen: email/password form inside the shared AuthLayout.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // wrong credentials, banned account or server problems belong to the whole form
  const [formError, setFormError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');
    setSubmitting(true);

    try {
      const user = await login({ email, password });
      // a page that sent the visitor here (?next=...) wins over the default landing page
      navigate(safeNext(searchParams.get('next')) ?? pathAfterLogin(user));
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <Checkbox checked={keepLoggedIn} onChange={setKeepLoggedIn} label="Keep me logged in" />
          <Link to="/forgot-password" className="font-sans text-sm font-medium text-secondary">
            Forgot password?
          </Link>
        </div>

        {formError && (
          <p role="alert" className="font-sans text-sm text-danger">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={submitting}
          icon={<ArrowRight className="size-5" />}
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>

        <p className="text-center font-sans text-sm text-ink-soft">
          New to FEUP Connect?{' '}
          <Link to="/signup" className="font-semibold text-secondary">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
