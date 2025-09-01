// api/webhooks/stripe.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);
  
  const userId = session.client_reference_id || session.metadata?.userId;
  const customerId = session.customer as string;
  
  if (!userId) {
    console.warn('No user ID found in checkout session');
    return;
  }

  // Update user record in your database
  await updateUserSubscription(userId, {
    customerId,
    subscriptionId: session.subscription as string,
    status: 'active',
    planType: session.mode === 'payment' ? 'lifetime' : 'subscription',
    trialEnd: null // Trial starts after checkout completion
  });

  // Send welcome email (optional)
  await sendWelcomeEmail(userId, session.customer_details?.email);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await updateUserSubscription(userId, {
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    status: subscription.status,
    planType: subscription.items.data[0].price.recurring?.interval === 'month' ? 'monthly' : 'yearly',
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await updateUserSubscription(userId, {
    subscriptionId: subscription.id,
    status: subscription.status,
    planType: subscription.items.data[0].price.recurring?.interval === 'month' ? 'monthly' : 'yearly',
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await updateUserSubscription(userId, {
    subscriptionId: null,
    status: 'cancelled',
    planType: 'free',
    trialEnd: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const userId = subscription.metadata.userId;
    
    if (userId) {
      await updateUserSubscription(userId, {
        status: 'active',
        lastPaymentDate: new Date(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      });
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const userId = subscription.metadata.userId;
    
    if (userId) {
      await updateUserSubscription(userId, {
        status: 'past_due'
      });
      
      // Send payment failed email (optional)
      await sendPaymentFailedEmail(userId, invoice.customer_email);
    }
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Trial ending soon:', subscription.id);
  
  const userId = subscription.metadata.userId;
  if (!userId) return;

  // Send trial ending email (optional)
  await sendTrialEndingEmail(userId, subscription.customer as string);
}

// Database helper functions - implement based on your database
async function updateUserSubscription(userId: string, data: any) {
  // Example with Prisma:
  // await prisma.user.update({
  //   where: { id: userId },
  //   data: {
  //     stripeCustomerId: data.customerId,
  //     stripeSubscriptionId: data.subscriptionId,
  //     subscriptionStatus: data.status,
  //     planType: data.planType,
  //     trialEnd: data.trialEnd,
  //     currentPeriodEnd: data.currentPeriodEnd,
  //     cancelAtPeriodEnd: data.cancelAtPeriodEnd,
  //     lastPaymentDate: data.lastPaymentDate
  //   }
  // });

  // Example with MongoDB:
  // await db.collection('users').updateOne(
  //   { _id: userId },
  //   { $set: data }
  // );

  console.log(`Would update user ${userId} with:`, data);
}

async function sendWelcomeEmail(userId: string, email: string | null) {
  // Implement your email service (SendGrid, Resend, etc.)
  console.log(`Would send welcome email to ${email} for user ${userId}`);
}

async function sendPaymentFailedEmail(userId: string, email: string | null) {
  console.log(`Would send payment failed email to ${email} for user ${userId}`);
}

async function sendTrialEndingEmail(userId: string, customerId: string) {
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  console.log(`Would send trial ending email to ${customer.email} for user ${userId}`);
}