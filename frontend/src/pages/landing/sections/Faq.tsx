import { Link } from 'react-router-dom';
import { buttonVariants, FaqItem } from '@/components/ui';

const faqs = [
  {
    question: 'How much does a session cost?',
    answer:
      'Mentors set their own fee, usually between €10 and €50 for a 30–60 minute session. You always see the price before you book.',
  },
  { question: 'Is my payment secure?' },
  { question: 'What happens after I book?' },
  { question: 'Can I become a mentor?' },
];

/**
 * Landing page FAQ section: heading/support-CTA column next to a
 * list of collapsible questions.
 */
export function Faq() {
  return (
    <div className="flex w-full flex-col gap-16 px-6 pb-24 pt-20 lg:flex-row lg:px-30">
      <div className="flex flex-1 flex-col items-start gap-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-tertiary">
          FAQ
        </p>
        <p className="font-display text-4xl font-bold leading-tight tracking-tight text-ink lg:text-5xl">
          Questions?
          <br />
          We&rsquo;ve got you.
        </p>
        <p className="font-sans text-base text-ink-soft">
          Can&rsquo;t find what you&rsquo;re looking for?
        </p>
        <Link to="/contact" className={buttonVariants({ variant: 'outlined', size: 'md' })}>
          Contact support
        </Link>
      </div>

      <div className="flex flex-1 flex-col">
        {faqs.map((faq) => (
          <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </div>
  );
}
