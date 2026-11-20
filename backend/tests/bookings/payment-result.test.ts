import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db/pool.js', () => ({ pool: { connect: vi.fn() } }));
import { pool } from '../../src/db/pool.js';
import { markStripePaymentResult } from '../../src/modules/bookings/bookings.queries.js';

describe('persisted Stripe result', () => {
  const query = vi.fn();
  const release = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(pool.connect).mockResolvedValue({ query, release } as never);
  });

  it.each([
    ['succeeded', 'confirmed'],
    ['failed', 'cancelled'],
    ['expired', 'cancelled'],
  ] as const)('links a verified %s outcome to a %s booking atomically', async (outcome, status) => {
    query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('SELECT p.id') ? [{ id: 'payment', booking_id: 'booking' }] : [],
    }));
    await markStripePaymentResult('pi_test', outcome);
    expect(query).toHaveBeenCalledWith('UPDATE payment SET status = $2 WHERE id = $1', [
      'payment',
      outcome,
    ]);
    expect(query).toHaveBeenCalledWith('UPDATE booking SET status = $2 WHERE id = $1', [
      'booking',
      status,
    ]);
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('does not update an attempt which is no longer pending', async () => {
    query.mockResolvedValue({ rows: [] });
    await markStripePaymentResult('pi_test', 'succeeded');
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('UPDATE'))).toBe(false);
  });
});
