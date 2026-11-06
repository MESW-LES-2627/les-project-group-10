import { createContext } from 'react';
import type { Service } from '@/components/mentor-onboarding/ServiceList';

export interface MentorOnboardingData {
  fullName: string;
  location: string;
  languages: string[];
  linkedIn: string;
  headline: string;
  subjects: string[];
  skills: string[];
  services: Service[];
  bio: string;
  availableSlotKeys: string[];
}

export const DEFAULT_MENTOR_ONBOARDING_DATA: MentorOnboardingData = {
  fullName: '',
  location: '',
  languages: ['Portuguese', 'English'],
  linkedIn: '',
  headline: '',
  subjects: [],
  skills: [],
  services: [],
  bio: '',
  availableSlotKeys: [],
};

export interface MentorOnboardingContextValue {
  data: MentorOnboardingData;
  updateData: (patch: Partial<MentorOnboardingData>) => void;
}

export const MentorOnboardingContext = createContext<MentorOnboardingContextValue | null>(null);
