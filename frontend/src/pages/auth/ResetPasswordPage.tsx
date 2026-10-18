import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { Button, Input, buttonVariants } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AuthSuccessState } from '@/components/auth/AuthSuccessState';

/**
 * `/reset-password` screen: set a new password from an emailed reset
 * link (no backend wired up yet).
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }

    setError('');
    setSubmitted(true);
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      headline="Choose a new password."
      subcopy="Make it something you’ll remember — but no one else can guess."
    >
      {submitted ? (
        <AuthSuccessState
          title="Password updated"
          description="Your password has been changed. You can now log in with your new password."
          action={
            <Link to="/login" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Go to log in
            </Link>
          }
        />
      ) : (
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-5xl font-bold tracking-tight text-ink">
              Reset password
            </h1>
            <p className="font-sans text-base text-ink-soft">
              Create a new password for your account.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              label="New password"
              placeholder="••••••••••"
              leadingIcon={<Lock className="size-5" />}
              trailingIcon={
                showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />
              }
              onTrailingIconClick={() => setShowPassword((value) => !value)}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              label="Confirm new password"
              placeholder="••••••••••"
              leadingIcon={<Lock className="size-5" />}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {error && <p className="font-sans text-sm text-danger">{error}</p>}

          <Button type="submit" fullWidth icon={<ArrowRight className="size-5" />}>
            Reset password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
