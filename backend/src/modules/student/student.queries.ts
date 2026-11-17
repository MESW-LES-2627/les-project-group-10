import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import type { UpdateStudentProfile } from './student.schemas.js';

type Queryable = Pool | PoolClient;

export interface StudentInterest {
  id: string;
  name: string;
}

export interface StudentProfile {
  userId: string;
  programme: string | null;
  enrollmentYear: number | null;
  studyLevel: string | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  categoryIds: string[];
  categories: StudentInterest[];
}

interface StudentProfileRow {
  user_id: string;
  programme: string | null;
  enrollment_year: number | null;
  study_level: string | null;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  category_ids: string[];
  categories: StudentInterest[];
}

/** A save the database rejected because of the data sent. Carries per-field messages. */
export class ProfileValidationError extends Error {
  constructor(public readonly fields: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ProfileValidationError';
  }
}

// Whitelist: request field -> column. Column names come from this map only, never from the
// client, so building the SET clause from it is safe. Values are always parameterized.
const COLUMNS = {
  programme: 'programme',
  enrollmentYear: 'enrollment_year',
  studyLevel: 'study_level',
  budgetMinCents: 'budget_min_cents',
  budgetMaxCents: 'budget_max_cents',
} as const satisfies Record<Exclude<keyof UpdateStudentProfile, 'categoryIds'>, string>;

// get the desired student profile
export async function getStudentProfile(
  userId: string,
  db: Queryable = pool,
): Promise<StudentProfile | null> {
  const { rows } = await db.query<StudentProfileRow>(
    `SELECT s.user_id, s.programme, s.enrollment_year, s.study_level,
            s.budget_min_cents, s.budget_max_cents,
            COALESCE(
              array_agg(sc.category_id::text ORDER BY sc.category_id)
                FILTER (WHERE sc.category_id IS NOT NULL),
              '{}'::text[]
            ) AS category_ids,
            COALESCE(
              json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.name)
                FILTER (WHERE c.id IS NOT NULL),
              '[]'::json
            ) AS categories
       FROM student s
       JOIN "user" u ON u.id = s.user_id
       LEFT JOIN student_category sc ON sc.student_id = s.user_id
       LEFT JOIN category c ON c.id = sc.category_id
      WHERE s.user_id = $1 AND u.is_deleted = false
      GROUP BY s.user_id`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    programme: row.programme,
    enrollmentYear: row.enrollment_year,
    studyLevel: row.study_level,
    budgetMinCents: row.budget_min_cents,
    budgetMaxCents: row.budget_max_cents,
    categoryIds: row.category_ids,
    categories: row.categories,
  };
}

/**Applies a partial update in one transaction: either everything is saved or nothing is
 * so a failed save never leaves a update half-updated
 */
export async function updateStudentProfile(
  userId: string,
  changes: UpdateStudentProfile,
): Promise<StudentProfile | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // we need to lock the row first
    const existing = await client.query('SELECT 1 FROM student WHERE user_id = $1 FOR UPDATE', [
      userId,
    ]);
    if (existing.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const sets: string[] = [];
    const values: unknown[] = [userId];
    for (const [field, column] of Object.entries(COLUMNS) as [keyof typeof COLUMNS, string][]) {
      if (changes[field] !== undefined) {
        values.push(changes[field]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    if (sets.length > 0) {
      await client.query(`UPDATE student SET ${sets.join(', ')} WHERE user_id = $1`, values);
    }
    if (changes.categoryIds !== undefined) {
      await client.query('DELETE FROM student_category WHERE student_id = $1', [userId]);
      if (changes.categoryIds.length > 0) {
        await client.query(
          `INSERT INTO student_category (student_id, category_id)
                SELECT $1, unnest($2::uuid[])
                ON CONFLICT DO NOTHING`,
          [userId, changes.categoryIds],
        );
      }
    }

    const profile = await getStudentProfile(userId, client);
    await client.query('COMMIT');
    return profile;
  } catch (err) {
    await client.query('ROLLBACK');
    throw toValidationError(err) ?? err;
  } finally {
    client.release();
  }
}

/** Maps constraint violations caused by the request into field errors. */
function toValidationError(err: unknown): ProfileValidationError | null {
  if (typeof err !== 'object' || err === null || !('code' in err)) return null;

  // 23503 foreign_key_violation: a category id that does not exist.
  if (err.code === '23503') {
    return new ProfileValidationError({ categoryIds: ['One or more subjects do not exist'] });
  }

  // 23514 check_violation: e.g. only budgetMaxCents sent, and it is below the stored minimum.
  if (err.code === '23514') {
    const constraint = 'constraint' in err ? String(err.constraint) : '';
    if (constraint.includes('budget')) {
      return new ProfileValidationError({
        budgetMaxCents: ['Maximum budget must be greater than or equal to the minimum budget'],
      });
    }
  }
  return null;
}
