
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const STRIPE_PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
  lifetime: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID!,
};

export async function createCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  customerEmail,
  metadata = {}
}: {
  priceId: string;
  successUrl:string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session | null> {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: priceId === STRIPE_PRICE_IDS.lifetime ? 'payment' : 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: {
        app: 'bookfoldar',
        ...metadata
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      ...(priceId !== STRIPE_PRICE_IDS.lifetime && {
        subscription_data: {
          metadata: {
            app: 'bookfoldar',
            ...metadata
          }
        }
      })
    });
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return null;
  }
}
