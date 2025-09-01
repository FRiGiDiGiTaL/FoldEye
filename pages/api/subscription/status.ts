// pages/api/subscription/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Replace with your auth logic to get the user ID
    const userId = 'demo-user-id';

    // For demo, assume Stripe customer ID is stored in env
    const stripeCustomerId = process.env.STRIPE_CUSTOMER_ID || null;

    if (!stripeCustomerId) {
      return res.status(200).json({ subscription: null });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      expand: ['data.items.data.price.product']
    });

    const activeSubscription = subscriptions.data.find(
      (sub) => sub.status === 'active' || sub.status === 'trialing'
    );

    return res.status(200).json({
      subscription: activeSubscription
        ? {
            id: activeSubscription.id,
            status: activeSubscription.status,
            plan: activeSubscription.items.data[0].price.nickname || activeSubscription.items.data[0].price.id,
            trial_end: (activeSubscription as any).trial_end || null,
            current_period_end: (activeSubscription as any).current_period_end || null
          }
        : null,
    });
  } catch (err: any) {
    console.error('Error fetching subscription status:', err);
    res.status(500).json({ error: 'Failed to fetch subscription status', details: err.message });
  }
}
