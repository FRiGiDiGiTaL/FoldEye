// pages/api/stripe/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { constructWebhookEvent, getPlanTypeFromPriceId } from '../../../lib/stripe';
import { 
  createSubscription, 
  updateSubscription, 
  getUserByStripeCustomerId, 
  createPayment,
  recordStripeEvent,
  markEventProcessed,
  isEventProcessed
} from '../../../lib/supabase';
import type Stripe from 'stripe';

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    req.on('error', (error) => {
      reject(error);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'No signature provided' });
    }

    // Construct the webhook event
    const event = constructWebhookEvent(rawBody, signature, webhookSecret);
    if (!event) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`Received Stripe webhook: ${event.type} (${event.id})`);

    // Check if event already processed (idempotency)
    const isAlreadyProcessed = await isEventProcessed(event.id);
    if (isAlreadyProcessed) {
      console.log(`Event ${event.id} already processed, skipping`);
      return res.status(200).json({ received: true, skipped: true });
    }

    // Record the event
    const shouldProcess = await recordStripeEvent(
      event.id,
      event.type,
      event.data.object as Record<string, any>,
      event.api_version || undefined
    );

    if (!shouldProcess) {
      console.log(`Event ${event.id} already being processed`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Process the event
    let processed = false;
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          processed = true;
          break;

        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          processed = true;
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          processed = true;
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          processed = true;
          break;

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          processed = true;
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          processed = true;
          break;

        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          processed = true;
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
          processed = true; // Mark as processed even if unhandled
          break;
      }
    } catch (error) {
      console.error(`Error processing webhook event ${event.id}:`, error);
      // Don't mark as processed if there was an error
      return res.status(500).json({ error: 'Event processing failed' });
    }

    // Mark event as processed
    if (processed) {
      await markEventProcessed(event.id);
      console.log(`Event ${event.id} successfully processed and marked complete`);
    }

    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`Checkout session completed: ${session.id}`);
  
  try {
    const customerId = session.customer as string;
    const user = await getUserByStripeCustomerId(customerId);
    
    if (!user) {
      console.error(`User not found for customer: ${customerId}`);
      return;
    }

    // Handle subscription checkout
    if (session.mode === 'subscription' && session.subscription) {
      console.log(`Subscription created via checkout: ${session.subscription}`);
      // Subscription will be handled by customer.subscription.created
    }

    // Handle one-time payment (lifetime plan)
    if (session.mode === 'payment') {
      const lineItems = session.line_items?.data?.[0];
      if (lineItems?.price?.id) {
        const planType = getPlanTypeFromPriceId(lineItems.price.id);
        
        if (planType === 'lifetime') {
          await createSubscription({
            user_id: user.id,
            stripe_price_id: lineItems.price.id,
            status: 'active',
            plan_type: 'lifetime',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 50 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 50 years
            cancel_at_period_end: false,
            metadata: {
              stripe_checkout_session_id: session.id
            }
          });
          
          console.log(`Lifetime subscription created for user: ${user.email}`);
        }
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`Subscription created: ${subscription.id}`);
  
  try {
    const customerId = subscription.customer as string;
    const user = await getUserByStripeCustomerId(customerId);
    
    if (!user) {
      console.error(`User not found for customer: ${customerId}`);
      return;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    if (!priceId) {
      console.error(`No price ID found for subscription: ${subscription.id}`);
      return;
    }

    const planType = getPlanTypeFromPriceId(priceId);
    if (!planType) {
      console.error(`Unknown price ID: ${priceId}`);
      return;
    }

    await createSubscription({
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status as any,
      plan_type: planType,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: {
        stripe_subscription_id: subscription.id
      }
    });

    console.log(`Subscription record created for user: ${user.email}, plan: ${planType}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`Subscription updated: ${subscription.id}`);
  
  try {
    const updateData: Partial<import('../../../lib/supabase').Subscription> = {
      status: subscription.status as any,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    if (subscription.canceled_at) {
      updateData.canceled_at = new Date(subscription.canceled_at * 1000).toISOString();
    }

    await updateSubscription(subscription.id, updateData);

    console.log(`Subscription updated in database: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Subscription deleted: ${subscription.id}`);
  
  try {
    await updateSubscription(subscription.id, {
      status: 'canceled',
      canceled_at: new Date().toISOString()
    });

    console.log(`Subscription marked as canceled in database: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded: ${invoice.id}`);
  
  try {
    const customerId = invoice.customer as string;
    const user = await getUserByStripeCustomerId(customerId);
    
    if (!user) {
      console.error(`User not found for customer: ${customerId}`);
      return;
    }

    if (invoice.payment_intent) {
      await createPayment({
        user_id: user.id,
        stripe_payment_intent_id: invoice.payment_intent as string,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        metadata: {
          invoice_id: invoice.id,
          subscription_id: invoice.subscription as string || null
        }
      });
    }

    console.log(`Payment record created for user: ${user.email}`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Payment failed: ${invoice.id}`);
  
  try {
    const customerId = invoice.customer as string;
    
    if (!customerId) {
      console.log(`No customer ID in invoice ${invoice.id} - likely a test event`);
      return;
    }
    
    const user = await getUserByStripeCustomerId(customerId);
    
    if (!user) {
      console.log(`User not found for customer: ${customerId} - may be a test customer`);
      return;
    }

    if (invoice.payment_intent) {
      await createPayment({
        user_id: user.id,
        stripe_payment_intent_id: invoice.payment_intent as string,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        metadata: {
          invoice_id: invoice.id,
          subscription_id: invoice.subscription as string || null,
          failure_reason: 'Payment failed'
        }
      });
    }

    console.log(`Failed payment record created for user: ${user.email}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`Payment intent succeeded: ${paymentIntent.id}`);
  
  try {
    const customerId = paymentIntent.customer as string;
    if (!customerId) return;
    
    const user = await getUserByStripeCustomerId(customerId);
    if (!user) {
      console.error(`User not found for customer: ${customerId}`);
      return;
    }

    await createPayment({
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      metadata: {
        payment_method: paymentIntent.payment_method as string || null
      }
    });

    console.log(`Payment intent record created for user: ${user.email}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}