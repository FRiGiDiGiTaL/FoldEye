// api/subscription/create-checkout.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, customerId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    // Get user session (implement your auth logic here)
    const userId = getUserIdFromSession(req); // You'll need to implement this

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/subscription/cancelled`,
      client_reference_id: userId || undefined,
      customer: customerId || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: true },
      metadata: {
        userId: userId || 'anonymous',
        source: 'bookfold_ar'
      }
    };

    // Add trial period for subscriptions
    if (sessionParams.mode === 'subscription') {
      sessionParams.subscription_data = {
        trial_period_days: 7,
        metadata: {
          userId: userId || 'anonymous',
          source: 'bookfold_ar'
        }
      };
    }

    // If no customer ID provided, let Stripe create a new customer
    if (!customerId && userId) {
      sessionParams.customer_creation = 'always';
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.status(200).json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
}

// Helper function - implement based on your auth system
function getUserIdFromSession(req: NextApiRequest): string | null {
  // Example implementations:
  
  // If using NextAuth:
  // const session = await getServerSession(req, res, authOptions);
  // return session?.user?.id || null;
  
  // If using custom JWT:
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // return decoded.userId;
  
  // If using cookies:
  // const userId = req.cookies.userId;
  // return userId || null;
  
  // For demo purposes, return null (anonymous users)
  return null;
}