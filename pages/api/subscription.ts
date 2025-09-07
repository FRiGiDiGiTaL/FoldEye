// pages/api/subscription.ts
import type { NextApiRequest, NextApiResponse } from "next";

interface SubscriptionRequest {
  plan: 'monthly' | 'yearly' | 'lifetime';
  email?: string;
  stripeToken?: string; // For future Stripe integration
}

interface SubscriptionResponse {
  success: boolean;
  message?: string;
  error?: string;
  subscriptionId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubscriptionResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });
  }

  try {
    const { plan, email, stripeToken }: SubscriptionRequest = req.body;

    // Validate required fields
    if (!plan || !['monthly', 'yearly', 'lifetime'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: "Valid plan selection required (monthly, yearly, or lifetime)"
      });
    }

    // Plan pricing and validation
    const planDetails = {
      monthly: { price: 5.99, stripePriceId: 'price_monthly_id' },
      yearly: { price: 19.99, stripePriceId: 'price_yearly_id' },
      lifetime: { price: 59.99, stripePriceId: 'price_lifetime_id' }
    };

    const selectedPlan = planDetails[plan];

    console.log(`Processing subscription for plan: ${plan} ($${selectedPlan.price})`);

    // TODO: Integrate with Stripe for actual payment processing
    // Example Stripe integration (uncomment when ready):
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(selectedPlan.price * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          plan: plan,
          email: email || 'unknown'
        }
      });

      // Store subscription in your database here
      // await saveSubscriptionToDatabase({
      //   plan,
      //   email,
      //   stripePaymentIntentId: paymentIntent.id,
      //   status: 'active',
      //   startDate: new Date(),
      //   expiryDate: calculateExpiryDate(plan)
      // });

      return res.status(200).json({
        success: true,
        message: `${plan} subscription activated successfully`,
        subscriptionId: paymentIntent.id
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      return res.status(500).json({
        success: false,
        error: 'Payment processing failed. Please try again.'
      });
    }
    */

    // For now, simulate successful subscription (development/testing)
    // Remove this when implementing real payments
    console.log(`Simulated successful subscription for ${plan} plan`);
    
    // TODO: Save to your database
    // await saveSubscriptionToDatabase({ plan, email, status: 'active' });

    return res.status(200).json({
      success: true,
      message: `${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription activated successfully`,
      subscriptionId: `sim_${plan}_${Date.now()}` // Simulated ID
    });

  } catch (error) {
    console.error('Subscription processing error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
}

// Helper function to calculate expiry dates
function calculateExpiryDate(plan: string): Date {
  const now = new Date();
  
  switch (plan) {
    case 'monthly':
      return new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    case 'yearly':
      return new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
    case 'lifetime':
      return new Date(now.getTime() + (50 * 365 * 24 * 60 * 60 * 1000)); // 50 years
    default:
      return new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  }
}