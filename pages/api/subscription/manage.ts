// api/subscription/manage.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const userId = getUserIdFromSession(req);

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    switch (method) {
      case 'POST':
        return await handleSubscriptionAction(req, res, userId);
      case 'GET':
        return await getSubscriptionDetails(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Subscription management error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

async function handleSubscriptionAction(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { action } = req.body;

  switch (action) {
    case 'start_trial':
      return await startTrial(userId, res);
    case 'cancel':
      return await cancelSubscription(userId, res);
    case 'reactivate':
      return await reactivateSubscription(userId, res);
    case 'change_plan':
      return await changePlan(userId, req.body.newPriceId, res);
    case 'create_portal_session':
      return await createPortalSession(userId, req, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function startTrial(userId: string, res: NextApiResponse) {
  try {
    // Update user record to start trial
    await updateUserInDatabase(userId, {
      trialStartDate: new Date(),
      trialStatus: 'active'
    });

    res.status(200).json({ 
      success: true, 
      message: 'Trial started successfully',
      trialDaysRemaining: 7 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to start trial', details: error.message });
  }
}

async function cancelSubscription(userId: string, res: NextApiResponse) {
  try {
    const user = await getUserFromDatabase(userId);
    
    if (!user?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel at period end (don't immediately revoke access)
    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    await updateUserInDatabase(userId, {
      cancelAtPeriodEnd: true,
      subscriptionStatus: 'cancel_at_period_end'
    });

    res.status(200).json({ 
      success: true, 
      message: 'Subscription will cancel at period end',
      periodEnd: new Date(subscription.current_period_end * 1000)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to cancel subscription', details: error.message });
  }
}

async function reactivateSubscription(userId: string, res: NextApiResponse) {
  try {
    const user = await getUserFromDatabase(userId);
    
    if (!user?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Remove cancellation
    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false
    });

    await updateUserInDatabase(userId, {
      cancelAtPeriodEnd: false,
      subscriptionStatus: 'active'
    });

    res.status(200).json({ 
      success: true, 
      message: 'Subscription reactivated successfully' 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reactivate subscription', details: error.message });
  }
}

async function changePlan(userId: string, newPriceId: string, res: NextApiResponse) {
  try {
    const user = await getUserFromDatabase(userId);
    
    if (!user?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    // Update the subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice'
    });

    res.status(200).json({ 
      success: true, 
      message: 'Plan changed successfully',
      subscription: updatedSubscription
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to change plan', details: error.message });
  }
}

async function createPortalSession(userId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getUserFromDatabase(userId);
    
    if (!user?.stripeCustomerId) {
      return res.status(404).json({ error: 'No customer found' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${req.headers.origin}/account`,
    });

    res.status(200).json({ 
      success: true, 
      portalUrl: portalSession.url 
    });
  } catch (error: any) {
    res.status