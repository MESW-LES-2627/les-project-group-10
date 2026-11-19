import { describe, expect, it } from 'vitest';
import { listUsersQuerySchema } from '../../src/modules/admin/admin.schemas.js';

describe('listUsersQuerySchema', () => {
  it('uses page 1 and page size 20 when nothing is given', () => {
    expect(listUsersQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('turns query-string values into numbers', () => {
    expect(listUsersQuerySchema.parse({ page: '3', pageSize: '10' })).toEqual({
      page: 3,
      pageSize: 10,
    });
  });

  it('accepts the maximum page size', () => {
    expect(listUsersQuerySchema.safeParse({ pageSize: '50' }).success).toBe(true);
  });

  it.each([
    ['page 0', { page: '0' }],
    ['a negative page', { page: '-1' }],
    ['a decimal page', { page: '1.5' }],
    ['a non-numeric page', { page: 'abc' }],
    ['an empty page', { page: '' }],
    ['page size 0', { pageSize: '0' }],
    ['a page size above the cap', { pageSize: '51' }],
    ['a non-numeric page size', { pageSize: 'many' }],
    ['a repeated page parameter', { page: ['1', '2'] }],
  ])('rejects %s', (_name, query) => {
    expect(listUsersQuerySchema.safeParse(query).success).toBe(false);
  });
});
