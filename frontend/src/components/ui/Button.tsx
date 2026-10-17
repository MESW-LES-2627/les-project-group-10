import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonVariants } from './buttonVariants';
import type { ButtonSize, ButtonVariant } from './buttonVariants';

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
    <button
      ref={ref}
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
      {icon}
    </button>
  ),
);
Button.displayName = 'Button';
