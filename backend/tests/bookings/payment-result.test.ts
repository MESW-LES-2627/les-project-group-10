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
    ['pending_payment', '2026-01-01T12:05:00Z', true],
    ['pending_payment', '2026-01-01T12:15:00Z', false],
    ['cancelled', '2026-01-01T12:05:00Z', false],
  ])('handles %s with charge at %s', async (bookingStatus, paidAt, expected) => {
    query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('SELECT p.id')
        ? [
            {
              id: 'payment',
              booking_id: 'booking',
              status: 'pending',
              booking_status: bookingStatus,
              reservation_expires_at: new Date('2026-01-01T12:10:00Z'),
            },
          ]
        : [],
    }));
    await expect(markStripePaymentResult('pi_test', true, new Date(paidAt))).resolves.toEqual({
      bookingId: 'booking',
      confirmed: expected,
    });
    expect(query).toHaveBeenCalledWith('UPDATE booking SET status = $2 WHERE id = $1', [
      'booking',
      expected ? 'confirmed' : 'cancelled',
    ]);
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalled();
  });

  it('does not update a payment which was already processed', async () => {
    query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('SELECT p.id') ? [{ status: 'succeeded' }] : [],
    }));
    await expect(markStripePaymentResult('pi_test', true)).resolves.toBeNull();
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('UPDATE'))).toBe(false);
  });
});
