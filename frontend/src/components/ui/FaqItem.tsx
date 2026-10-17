import { ChevronDown } from 'lucide-react';

export interface FaqItemProps {
  question: string;
  answer?: string;
}

/**
 * One collapsible question/answer row, built on native `<details>`
 * for accessible expand/collapse without extra state.
 */
export function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <details className="group border-b border-line py-6 first:pt-0 last:border-none">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <p className="font-display text-lg font-semibold tracking-tight text-ink">{question}</p>
        <ChevronDown className="size-5 shrink-0 text-ink transition-transform group-open:rotate-180" />
      </summary>
      {answer && <p className="mt-4 font-sans text-base text-ink-soft">{answer}</p>}
    </details>
  );
}
