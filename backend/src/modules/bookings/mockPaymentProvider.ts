import { randomUUID } from 'node:crypto';

export type MockPaymentMethod = 'card' | 'mbway' | 'apple';
export type MockPaymentOutcome = 'approved' | 'declined';

/** Keep the gateway boundary realistic while ensuring no payment data leaves this server. */
export async function processMockPayment(input: {
  paymentId: string;
  method: MockPaymentMethod;
  outcome: MockPaymentOutcome;
}) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    succeeded: input.outcome === 'approved',
    reference: `MOCK-${input.paymentId.slice(0, 12).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`,
  };
}
