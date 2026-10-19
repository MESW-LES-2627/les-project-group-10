import { z } from 'zod';

export const mockCheckoutSchema = z.object({
  serviceId: z.guid(),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose an available time'),
  paymentMethod: z.enum(['card', 'mbway', 'apple']),
  outcome: z.enum(['approved', 'declined']),
  idempotencyKey: z.uuid(),
});

export type MockCheckoutInput = z.infer<typeof mockCheckoutSchema>;
