import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui';

/**
 * Landing page closing call-to-action banner.
 */
export function FinalCta() {
  return (
    <div className="flex w-full flex-col items-center gap-5 bg-accent px-6 py-16 text-center lg:px-30">
      <p className="font-display text-4xl font-bold tracking-tight text-primary lg:text-5xl">
        Ready to find your mentor?
      </p>
      <p className="font-sans text-lg text-primary">Join 1,200+ FEUP students already learning with FEUP Connect.</p>
      <Link to="/signup" className={buttonVariants({ variant: 'primary' })}>
        Get started — it&rsquo;s free
        <ArrowRight className="size-5" />
      </Link>
    </div>
  );
}
