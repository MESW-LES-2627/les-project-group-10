import { z } from 'zod';

export const stripeCheckoutSchema = z.object({
  serviceId: z.guid(),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose an available time'),
  idempotencyKey: z.uuid(),
});

export type StripeCheckoutInput = z.infer<typeof stripeCheckoutSchema>;
