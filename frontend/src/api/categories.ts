import { apiGet } from './client';

/** A subject area from the database; students pick them as interests. */
export interface Category {
  id: string;
  name: string;
}

/** `GET /api/categories`: public, sorted by name. */
export async function getCategories(): Promise<Category[]> {
  const { categories } = await apiGet<{ categories: Category[] }>('/api/categories');
  return categories;
}
