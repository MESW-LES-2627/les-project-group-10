import clsx from 'clsx';

export type AvatarSize = 'lg' | 'md' | 'sm';
export type AvatarTone = 'primary' | 'secondary' | 'tertiary' | 'accent';

const sizeStyles: Record<AvatarSize, string> = {
  lg: 'size-24 rounded-[48px] text-[32px] tracking-[-0.48px]',
  md: 'size-14 rounded-[28px] text-[22px] tracking-[-0.22px]',
  sm: 'size-10 rounded-[20px] text-sm',
};

const toneStyles: Record<AvatarTone, string> = {
  primary: 'bg-primary-soft text-primary',
  secondary: 'bg-secondary-soft text-primary',
  tertiary: 'bg-tertiary-soft text-primary',
  accent: 'bg-accent text-primary',
};

export interface AvatarProps {
  initials: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  className?: string;
}

/**
 * Initials avatar with size and color-tone variants, used as a
 * placeholder for profile photos.
 */
export function Avatar({ initials, size = 'lg', tone = 'primary', className }: AvatarProps) {
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center font-display font-bold',
        sizeStyles[size],
        toneStyles[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
