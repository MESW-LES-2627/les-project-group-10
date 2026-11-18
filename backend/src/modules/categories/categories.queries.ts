import { pool } from '../../db/pool.js';

export interface Category {
  id: string;
  name: string;
}

/** Every subject area, sorted by name. Students pick interests from this list. */
export async function listCategories(): Promise<Category[]> {
  const { rows } = await pool.query<Category>('SELECT id, name FROM category ORDER BY name');
  return rows;
}
