import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is missing. Please set it in your environment variables.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // https://github.com/stripe/stripe-node#configuration
    apiVersion: '2023-10-16', // Use the latest API version or your account's default
    appInfo: {
        name: 'Fresh Platform',
        version: '0.1.0',
    },
});
