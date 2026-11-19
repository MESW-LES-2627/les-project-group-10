import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MentorSearchResultCard } from '@/components/mentors/MentorSearchResultCard';
import type { Mentor } from '@/api/mentors';
import { renderWithProviders } from '../support/render';

function buildMentor(overrides: Partial<Mentor> = {}): Mentor {
  return {
    id: 'mentor-1',
    initials: 'JD',
    avatarTone: 'primary',
    name: 'Jane Doe',
    verified: true,
    headline: 'Senior Software Engineer',
    role: 'Mentor',
    rating: 4.9,
    reviewCount: 12,
    sessionCount: 30,
    location: 'Porto',
    languages: 'English',
    replyTime: '1 hour',
    nextAvailable: 'Tomorrow',
    subjects: ['Software Engineering'],
    skills: ['TypeScript'],
    tags: [],
    bio: 'Helping engineers land their first job.',
    about: 'About',
    experience: [],
    services: [
      {
        id: 's1',
        title: 'Mock Interview',
        description: 'Practice',
        duration: '60 min',
        price: 30,
        availability: [],
      },
      {
        id: 's2',
        title: 'CV Review',
        description: 'Feedback',
        duration: '30 min',
        price: 15,
        availability: [],
      },
    ],
    posts: [],
    reviews: [],
    ...overrides,
  };
}

describe('MentorSearchResultCard', () => {
  it('renders the mentor name, headline, and lowest price', () => {
    renderWithProviders(<MentorSearchResultCard mentor={buildMentor()} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('€15')).toBeInTheDocument();
  });
});
