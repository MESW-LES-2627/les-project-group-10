/** Study levels a student can pick. Stored as the text shown, so onboarding and edit share it. */
export const STUDY_LEVELS = [
  "Bachelor's (1st year)",
  "Bachelor's (2nd year)",
  "Bachelor's (3rd year)",
  "Integrated Master's",
  "Master's",
  'PhD',
];

/** Budget slider bounds in euros. The API stores cents. */
export const BUDGET_SLIDER = { min: 10, max: 80, step: 5 } as const;

/** Where the slider starts when no budget is saved yet. */
export const DEFAULT_BUDGET = { min: 15, max: 40 } as const;
