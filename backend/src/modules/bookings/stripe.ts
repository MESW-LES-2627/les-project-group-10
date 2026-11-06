import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey?.startsWith('sk_test_')) {
  throw new Error('STRIPE_SECRET_KEY must be a Stripe test key');
}
export const stripe = new Stripe(secretKey, { timeout: 10_000 });
