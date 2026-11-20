import { z } from 'zod';

export const bookingIdSchema = z.guid().transform((value) => value.toLowerCase());

export const stripeCheckoutSchema = z.object({
  serviceId: z.guid().transform((value) => value.toLowerCase()),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose an available time'),
  idempotencyKey: z.uuid().transform((value) => value.toLowerCase()),
});

export type StripeCheckoutInput = z.infer<typeof stripeCheckoutSchema>;

export const retryCheckoutSchema = z.object({
  attemptId: z.guid().transform((value) => value.toLowerCase()),
});
