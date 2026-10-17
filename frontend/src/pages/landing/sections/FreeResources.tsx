import { BookOpen } from 'lucide-react';
import { SectionHeading, Tag } from '@/components/ui';
import type { TagTone } from '@/components/ui';

const posts: {
  tag: string;
  tagTone: TagTone;
  title: string;
  description: string;
  author: string;
  readTime: string;
}[] = [
  {
    tag: 'Interviews',
    tagTone: 'blue',
    title: '5 patterns that cover 80% of coding interviews',
    description: 'Sliding window, two pointers and the rest — mapped to FEUP exercises.',
    author: 'Pius Osuji',
    readTime: '6 min read',
  },
  {
    tag: 'Internships',
    tagTone: 'orange',
    title: 'How I’d apply for a summer internship in 2027',
    description: 'A month-by-month plan, plus the CV mistakes I see most often.',
    author: 'Inês Costa',
    readTime: '4 min read',
  },
  {
    tag: 'Thesis',
    tagTone: 'yellow',
    title: 'Structuring your MSc dissertation without losing your mind',
    description: 'A chapter-by-chapter template that actually gets approved.',
    author: 'João Ferreira',
    readTime: '8 min read',
  },
];

/**
 * Landing page section listing a static set of blog-style resource posts.
 */
export function FreeResources() {
  return (
    <div id="resources" className="flex w-full flex-col gap-10 px-6 py-20 lg:px-30">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <SectionHeading eyebrow="Free resources" title="Learn something before you even book" />
        <p className="font-sans text-base font-semibold text-secondary">View all posts →</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {posts.map((post) => (
          <div
            key={post.title}
            className="flex flex-1 flex-col gap-3.5 rounded-2xl border border-line bg-surface p-6"
          >
            <Tag label={post.tag} tone={post.tagTone} />
            <p className="font-display text-lg font-semibold tracking-tight text-ink">
              {post.title}
            </p>
            <p className="font-sans text-sm text-ink-soft">{post.description}</p>
            <div className="h-px w-full bg-line" />
            <div className="flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-ink-muted" />
              <p className="font-sans text-xs font-medium text-ink-muted">
                {post.author} · {post.readTime}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
