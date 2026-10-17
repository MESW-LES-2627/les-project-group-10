import clsx from 'clsx';

export interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  align?: 'left' | 'center';
  eyebrowClassName?: string;
  className?: string;
}

/**
 * Orange-eyebrow + large display-font title pattern repeated across
 * landing page sections.
 */
export function SectionHeading({ eyebrow, title, align = 'left', eyebrowClassName, className }: SectionHeadingProps) {
  return (
    <div className={clsx('flex flex-col gap-3', align === 'center' && 'items-center text-center', className)}>
      <p className={clsx('font-sans text-xs font-semibold uppercase tracking-[0.08em] text-tertiary', eyebrowClassName)}>
        {eyebrow}
      </p>
      <p className="font-display text-4xl font-bold leading-tight tracking-tight text-ink lg:text-5xl">{title}</p>
    </div>
  );
}
