import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants, SectionHeading } from '@/components/ui';
import { MentorSummaryCard } from '@/components/mentors/MentorSummaryCard';
import type { MentorSummary } from '@/components/mentors/MentorSummaryCard';

const mentors: MentorSummary[] = [
  {
    id: 'pius-osuji',
    initials: 'PO',
    avatarTone: 'primary',
    name: 'Pius Osuji',
    role: 'Senior Software Engineer',
    tag: 'Algorithms',
    tagTone: 'green',
    rating: '4.9',
    price: '€35',
  },
  {
    id: 'joao-ferreira',
    initials: 'JF',
    avatarTone: 'secondary',
    name: 'João Ferreira',
    role: 'PhD Researcher, ML',
    tag: 'Machine learning',
    tagTone: 'blue',
    rating: '4.8',
    price: '€25',
  },
  {
    id: 'ines-costa',
    initials: 'IC',
    avatarTone: 'tertiary',
    name: 'Inês Costa',
    role: 'Software Architect',
    tag: 'Architecture',
    tagTone: 'orange',
    rating: '4.7',
    price: '€40',
  },
];

/**
 * Landing page section showcasing a static set of mentor summary cards.
 */
export function FeaturedMentors() {
  return (
    <div className="flex w-full flex-col gap-10 bg-subtle px-6 py-20 lg:px-30">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <SectionHeading eyebrow="Featured mentors" title="Learn from people who’ve done it" />
        <Link to="/mentors" className={buttonVariants({ variant: 'outlined', size: 'md' })}>
          Browse all mentors
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {mentors.map((mentor) => (
          <MentorSummaryCard key={mentor.id} mentor={mentor} />
        ))}
      </div>
    </div>
  );
}
