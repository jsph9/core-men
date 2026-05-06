import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable. Payment endpoints will fail.');
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_mock', {
  apiVersion: '2025-02-24.acacia',
});
