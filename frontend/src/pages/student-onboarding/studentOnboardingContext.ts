import { createContext } from 'react';

export interface StudentOnboardingData {
  interests: string[];
  budgetMin: number;
  budgetMax: number;
  availability: string[];
  studyLevel: string | null;
}

export const DEFAULT_STUDENT_ONBOARDING_DATA: StudentOnboardingData = {
  interests: [],
  budgetMin: 15,
  budgetMax: 40,
  availability: [],
  studyLevel: null,
};

export interface StudentOnboardingContextValue {
  data: StudentOnboardingData;
  updateData: (patch: Partial<StudentOnboardingData>) => void;
}

export const StudentOnboardingContext = createContext<StudentOnboardingContextValue | null>(null);
