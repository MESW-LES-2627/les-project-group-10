import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { Button, Input, buttonVariants } from '@/components/ui';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AuthSuccessState } from '@/components/auth/AuthSuccessState';

/**
 * `/forgot-password` screen: collects an email and confirms a reset
 * link was sent (no backend wired up yet).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      headline="Let’s get you back in."
      subcopy="Enter the email on your account and we’ll send you a link to reset your password."
    >
      {submitted ? (
        <AuthSuccessState
          title="Check your inbox"
          description={`We’ve sent a password reset link to ${email}. It expires in 30 minutes.`}
          action={
            <Link to="/login" className={buttonVariants({ variant: 'outlined', size: 'md' })}>
              Back to log in
            </Link>
          }
        />
      ) : (
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-5xl font-bold tracking-tight text-ink">
              Forgot password?
            </h1>
            <p className="font-sans text-base text-ink-soft">
              No worries — enter your email and we&rsquo;ll send you a reset link.
            </p>
          </div>

          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="ana.oliveira@fe.up.pt"
            leadingIcon={<Mail className="size-5" />}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <Button type="submit" fullWidth icon={<ArrowRight className="size-5" />}>
            Send reset link
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 font-sans text-sm font-medium text-ink-soft"
          >
            <ArrowLeft className="size-4" />
            Back to log in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
