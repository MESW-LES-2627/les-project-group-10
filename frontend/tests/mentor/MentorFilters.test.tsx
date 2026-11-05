import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { MentorFilters } from '@/components/mentors/MentorFilters';
import type { MentorFiltersState } from '@/components/mentors/MentorFilters';
import { renderWithProviders } from '../support/render';

const baseState: MentorFiltersState = {
  subjects: [],
  priceMin: 10,
  priceMax: 50,
  minRating: 0,
  languages: [],
};

describe('MentorFilters', () => {
  it('renders the subject, rating and language filters', () => {
    renderWithProviders(
      <MentorFilters
        subjectOptions={['Mathematics', 'Software Engineering']}
        languageOptions={['English', 'Portuguese']}
        state={baseState}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Software Engineering')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4.5+' })).toBeInTheDocument();
  });

  it('reports a change when the user selects a subject', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <MentorFilters
        subjectOptions={['Mathematics']}
        languageOptions={['English']}
        state={baseState}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText('Mathematics'));

    expect(onChange).toHaveBeenCalledWith({ ...baseState, subjects: ['Mathematics'] });
  });

  it('reports a change when the user picks a minimum rating', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <MentorFilters
        subjectOptions={[]}
        languageOptions={[]}
        state={baseState}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '4.8+' }));

    expect(onChange).toHaveBeenCalledWith({ ...baseState, minRating: 4.8 });
  });

  it('calls onReset when the reset button is clicked', async () => {
    const onReset = vi.fn();
    renderWithProviders(
      <MentorFilters
        subjectOptions={[]}
        languageOptions={[]}
        state={baseState}
        onChange={vi.fn()}
        onReset={onReset}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
