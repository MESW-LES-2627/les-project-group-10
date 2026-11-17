import z from 'zod';

// file responsible to validate the body of the future PATCH endpoint /api/students/me to edit their profile

// upper bound for the max budget cents
const MAX_BUDGET_CENTS = 1_000_000;

const budgetCents = (label: string) =>
  z
    .number()
    .int(`${label} must be a whole number of cents`)
    .min(0, `${label} cannot be negative`)
    .max(MAX_BUDGET_CENTS, `${label} is too high`);

/**
 * PATCH body. Every field is optional:
 * - omitted   -> left untouched
 * - null      -> cleared
 * - a value   -> replaced
 * `categoryIds` replaces the whole set when sent.
 * `.strict()` rejects unknown keys, so a client cannot sneak in `userId` or similar.
 */

export const updateStudentProfileSchema = z
  .object({
    studyLevel: z
      .string()
      .trim()
      .min(1, 'Study level cannot be empty')
      .max(50, 'Study level must be at most 50 characters')
      .nullable()
      .optional(),
    budgetMinCents: budgetCents('Minimum budget').nullable().optional(),
    budgetMaxCents: budgetCents('Maximum budget').nullable().optional(),
    categoryIds: z.array(z.guid()).max(20, 'Pick at most 20 subjects').optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.budgetMinCents == null ||
      body.budgetMaxCents == null ||
      body.budgetMaxCents >= body.budgetMinCents,
    {
      message: 'Maximum budget must be greater than or equal to the minimum budget',
      path: ['budgetMaxCents'],
    },
  );

export type UpdateStudentProfile = z.infer<typeof updateStudentProfileSchema>; // is a type of updateStudentProfileSchema

/**Turns Zod issues into `{field: [messages]}` so the form can show them next to each input */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_form';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}
