import { Check } from 'lucide-react';
import clsx from 'clsx';
import { Chip, RangeSlider } from '@/components/ui';

export interface MentorFiltersState {
  subjects: string[];
  priceMin: number;
  priceMax: number;
  minRating: number;
  languages: string[];
}

export interface MentorFiltersProps {
  subjectOptions: string[];
  languageOptions: string[];
  state: MentorFiltersState;
  onChange: (state: MentorFiltersState) => void;
  onReset: () => void;
}

const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '4.5+', value: 4.5 },
  { label: '4.8+', value: 4.8 },
];

/**
 * Sidebar filter panel for the mentor search results: subject,
 * price range, minimum rating and language.
 */
export function MentorFilters({
  subjectOptions,
  languageOptions,
  state,
  onChange,
  onReset,
}: MentorFiltersProps) {
  function toggleSubject(subject: string) {
    onChange({
      ...state,
      subjects: state.subjects.includes(subject)
        ? state.subjects.filter((item) => item !== subject)
        : [...state.subjects, subject],
    });
  }

  function toggleLanguage(language: string) {
    onChange({
      ...state,
      languages: state.languages.includes(language)
        ? state.languages.filter((item) => item !== language)
        : [...state.languages, language],
    });
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-5 rounded-2xl border border-line bg-surface p-4 sm:p-6 xl:w-70">
      <div className="flex w-full items-center justify-between">
        <p className="font-display text-lg font-semibold tracking-tight text-ink">Filters</p>
        <button
          type="button"
          onClick={onReset}
          className="font-sans text-sm font-medium text-secondary"
        >
          Reset
        </button>
      </div>

      <div className="h-px w-full bg-line" />

      <div className="flex w-full flex-col gap-3">
        <p className="font-sans text-base font-semibold text-ink">Subject area</p>
        {subjectOptions.map((subject) => {
          const checked = state.subjects.includes(subject);
          return (
            <label key={subject} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSubject(subject)}
                className="peer sr-only"
              />
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-line bg-surface peer-checked:border-primary peer-checked:bg-primary">
                <Check
                  className="size-3.5 text-ink-inverse opacity-0 peer-checked:opacity-100"
                  strokeWidth={3}
                />
              </span>
              <span className={clsx('font-sans text-sm', checked ? 'text-ink' : 'text-ink-soft')}>
                {subject}
              </span>
            </label>
          );
        })}
      </div>

      <div className="h-px w-full bg-line" />

      <RangeSlider
        label="Price per session"
        min={10}
        max={50}
        step={5}
        valueMin={state.priceMin}
        valueMax={state.priceMax}
        onChange={({ min, max }) => onChange({ ...state, priceMin: min, priceMax: max })}
        formatValue={(value) => `€${value}`}
      />

      <div className="h-px w-full bg-line" />

      <div className="flex w-full flex-col gap-3">
        <p className="font-sans text-base font-semibold text-ink">Minimum rating</p>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((option) => (
            <Chip
              key={option.label}
              label={option.label}
              selected={state.minRating === option.value}
              onClick={() => onChange({ ...state, minRating: option.value })}
            />
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-line" />

      <div className="flex w-full flex-col gap-3">
        <p className="font-sans text-base font-semibold text-ink">Language</p>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((language) => (
            <Chip
              key={language}
              label={language}
              selected={state.languages.includes(language)}
              onClick={() => toggleLanguage(language)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
