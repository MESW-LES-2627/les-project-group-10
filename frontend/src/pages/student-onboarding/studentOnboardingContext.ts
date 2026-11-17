import { createContext } from 'react';
import type { Category } from '@/api/categories';

export interface StudentOnboardingData {
  /** Chosen subject areas, kept as database categories so the save can send their ids. */
  interests: Category[];
  budgetMin: number;
  budgetMax: number;
  studyLevel: string | null;
}

export const DEFAULT_STUDENT_ONBOARDING_DATA: StudentOnboardingData = {
  interests: [],
  budgetMin: 15,
  budgetMax: 40,
  studyLevel: null,
};

export interface StudentOnboardingContextValue {
  data: StudentOnboardingData;
  updateData: (patch: Partial<StudentOnboardingData>) => void;
}

export const StudentOnboardingContext = createContext<StudentOnboardingContextValue | null>(null);
