import { describe, expect, it } from 'vitest';
import { updateStudentProfileSchema } from '../../src/modules/student/student.schemas.js';

describe('updateStudentProfileSchema', () => {
  it('accepts a partial body and trims the programme', () => {
    const result = updateStudentProfileSchema.parse({ programme: '  MESW ', enrollmentYear: 2025 });
    expect(result).toEqual({ programme: 'MESW', enrollmentYear: 2025 });
  });

  it('accepts null to clear programme, enrollment year and study level', () => {
    expect(
      updateStudentProfileSchema.safeParse({
        programme: null,
        enrollmentYear: null,
        studyLevel: null,
      }).success,
    ).toBe(true);
  });

  it.each([
    [{ programme: '   ' }, 'programme'],
    [{ programme: 'x'.repeat(101) }, 'programme'],
    [{ enrollmentYear: 1999 }, 'enrollmentYear'],
    [{ enrollmentYear: 2101 }, 'enrollmentYear'],
    [{ enrollmentYear: 2024.5 }, 'enrollmentYear'],
    [{ enrollmentYear: '2024' }, 'enrollmentYear'],
  ])('rejects %j', (body, field) => {
    const result = updateStudentProfileSchema.safeParse(body);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe(field);
  });

  it('still rejects unknown keys', () => {
    expect(updateStudentProfileSchema.safeParse({ userId: 'x' }).success).toBe(false);
  });
});
