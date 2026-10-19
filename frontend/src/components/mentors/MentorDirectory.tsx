import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { MentorFilters } from '@/components/mentors/MentorFilters';
import type { MentorFiltersState } from '@/components/mentors/MentorFilters';
import { MentorSearchResultCard } from '@/components/mentors/MentorSearchResultCard';
import { getMentors } from '@/api/mentors';
import type { Mentor } from '@/api/mentors';
import { matchesMentorSearch } from '@/lib/mentorSearch';

const LANGUAGE_CODES: Record<string, string> = {
  Portuguese: 'PT',
  English: 'EN',
  Spanish: 'ES',
};

const DEFAULT_FILTERS: MentorFiltersState = {
  subjects: [],
  priceMin: 10,
  priceMax: 50,
  minRating: 0,
  languages: [],
};

/**
 * Search, filters, and mentor cards shared by the public mentors page
 * and the signed-in dashboard.
 */
export function MentorDirectory() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<MentorFiltersState>(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;
    getMentors().then((data) => {
      if (!cancelled) setMentors(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectOptions = useMemo(
    () => Array.from(new Set(mentors.flatMap((mentor) => mentor.subjects))).sort(),
    [mentors],
  );
  const languageOptions = Object.keys(LANGUAGE_CODES);

  const results = useMemo(() => {
    return mentors.filter((mentor) => {
      const lowestPrice = Math.min(...mentor.services.map((service) => service.price));

      const matchesQuery = matchesMentorSearch(mentor, query);

      const matchesSubjects =
        filters.subjects.length === 0 ||
        mentor.subjects.some((subject) => filters.subjects.includes(subject));

      const matchesPrice = lowestPrice >= filters.priceMin && lowestPrice <= filters.priceMax;

      const matchesRating = mentor.rating >= filters.minRating;

      const matchesLanguages =
        filters.languages.length === 0 ||
        filters.languages.some((language) => mentor.languages.includes(LANGUAGE_CODES[language]!));

      return matchesQuery && matchesSubjects && matchesPrice && matchesRating && matchesLanguages;
    });
  }, [mentors, query, filters]);

  const activeFilterChips = [
    ...filters.subjects.map((subject) => ({
      key: `subject-${subject}`,
      label: subject,
      clear: () => toggleSubject(subject),
    })),
    ...(filters.priceMin !== DEFAULT_FILTERS.priceMin ||
    filters.priceMax !== DEFAULT_FILTERS.priceMax
      ? [
          {
            key: 'price',
            label: `€${filters.priceMin} – €${filters.priceMax}`,
            clear: () =>
              setFilters((current) => ({
                ...current,
                priceMin: DEFAULT_FILTERS.priceMin,
                priceMax: DEFAULT_FILTERS.priceMax,
              })),
          },
        ]
      : []),
    ...(filters.minRating > 0
      ? [
          {
            key: 'rating',
            label: `${filters.minRating}+ rating`,
            clear: () => setFilters((current) => ({ ...current, minRating: 0 })),
          },
        ]
      : []),
    ...filters.languages.map((language) => ({
      key: `lang-${language}`,
      label: language,
      clear: () => toggleLanguage(language),
    })),
  ];

  function toggleSubject(subject: string) {
    setFilters((current) => ({
      ...current,
      subjects: current.subjects.filter((item) => item !== subject),
    }));
  }

  function toggleLanguage(language: string) {
    setFilters((current) => ({
      ...current,
      languages: current.languages.filter((item) => item !== language),
    }));
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <form
        onSubmit={handleSearchSubmit}
        className="flex w-full flex-col items-stretch gap-4 rounded-[20px] border border-line bg-surface p-4 shadow-[0px_12px_32px_0px_rgba(13,43,36,0.06)] sm:p-6 md:flex-row md:items-center"
      >
        <div className="flex flex-1 items-center gap-3 rounded-[10px] border border-line bg-canvas px-4 py-3.5">
          <Search className="size-5 shrink-0 text-ink-muted" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, skill, subject or service"
            className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </div>
        <Button
          type="submit"
          variant="blue"
          fullWidth
          className="md:w-auto"
          icon={<ArrowRight className="size-5" />}
        >
          Search mentors
        </Button>
      </form>

      <div className="flex w-full flex-col gap-8 xl:flex-row">
        <MentorFilters
          subjectOptions={subjectOptions}
          languageOptions={languageOptions}
          state={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <p className="font-display text-2xl font-semibold tracking-tight text-ink">
            {results.length} {results.length === 1 ? 'mentor matches' : 'mentors match'} your search
          </p>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.25 font-sans text-sm font-medium text-ink-inverse"
                >
                  {chip.label}
                  <span aria-hidden>×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="font-sans text-sm font-medium text-secondary"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex w-full flex-col gap-5">
            {results.map((mentor) => (
              <MentorSearchResultCard key={mentor.id} mentor={mentor} />
            ))}
            {results.length === 0 && (
              <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-10 text-center">
                <p className="font-display text-lg font-semibold tracking-tight text-ink">
                  No mentors match yet
                </p>
                <p className="font-sans text-sm text-ink-soft">
                  Try widening your filters or clearing a few.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
