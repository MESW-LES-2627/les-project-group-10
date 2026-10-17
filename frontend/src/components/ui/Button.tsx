import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'blue' | 'secondary' | 'outlined' | 'inverted';
export type ButtonSize = 'lg' | 'md';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-ink-inverse hover:bg-primary-strong',
  blue: 'bg-secondary text-ink-inverse hover:brightness-110',
  secondary: 'bg-primary-soft text-ink hover:brightness-95',
  outlined: 'border-[1.5px] border-line-strong bg-transparent text-ink hover:bg-subtle',
  inverted: 'bg-surface text-ink hover:brightness-95',
};

const sizeStyles: Record<ButtonSize, string> = {
  lg: 'h-14 px-7 text-base',
  md: 'h-11 px-5 text-sm',
};

/**
 * Builds the Button's class list, so Link/anchor elements can share
 * the exact same visual styling as the real <button>.
 */
export function buttonVariants({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return clsx(
    'inline-flex shrink-0 items-center justify-center gap-2.5 rounded-[10px] font-sans font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Primary action button, styled via `buttonVariants`.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, icon, fullWidth, className, children, ...props }, ref) => (
    <button ref={ref} className={buttonVariants({ variant, size, fullWidth, className })} {...props}>
      {children}
      {icon}
    </button>
  ),
);
Button.displayName = 'Button';
