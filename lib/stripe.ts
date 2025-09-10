// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const STRIPE_PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!,
  lifetime: process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME!,
} as const;

export type PlanType = keyof typeof STRIPE_PRICE_IDS;

export const PLAN_DETAILS = {
  monthly: {
    name: 'Monthly Plan',
    price: 5.99,
    interval: 'month' as const,
    description: 'Full access to all BookfoldAR features'
  },
  yearly: {
    name: 'Annual Plan', 
    price: 19.99,
    interval: 'year' as const,
    description: 'Full access + 2 months free'
  },
  lifetime: {
    name: 'Lifetime Plan',
    price: 59.99,
    interval: null,
    description: 'Pay once, use forever'
  }
} as const;

export async function createStripeCustomer(email: string, name?: string): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        app: 'bookfoldar'
      }
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return null;
  }
}

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {}
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session | null> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session | null> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return null;
  }
}

export async function getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.items.data.price']
    });
    return subscriptions.data;
  } catch (error) {
    console.error('Error getting customer subscriptions:', error);
    return [];
  }
}

export function getPlanTypeFromPriceId(priceId: string): PlanType | null {
  for (const [planType, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id === priceId) {
      return planType as PlanType;
    }
  }
  return null;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Error constructing webhook event:', error);
    return null;
  }
}