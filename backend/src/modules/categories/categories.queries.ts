import { pool } from '../../db/pool.js';

export interface Category {
  id: string;
  name: string;
}

/** Every subject area, sorted by name. Students pick interests from this list. */
export async function listCategories(): Promise<Category[]> {
  const { rows } = await pool.query<Category>('SELECT id, name FROM category');
  // Sorted here, not in SQL: ORDER BY follows the database's locale, which differs across environments.
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
