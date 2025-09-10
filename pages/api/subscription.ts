// pages/api/subscription.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createCheckoutSession, createStripeCustomer, STRIPE_PRICE_IDS, getPlanTypeFromPriceId } from "../../lib/stripe";
import { upsertUser, getUserByEmail } from "../../lib/supabase";

interface SubscriptionRequest {
  plan: 'monthly' | 'yearly' | 'lifetime';
  email?: string;
}

interface SubscriptionResponse {
  success: boolean;
  message?: string;
  error?: string;
  checkoutUrl?: string;
  sessionId?: string;
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
    const { plan, email }: SubscriptionRequest = req.body;

    // Validate required fields
    if (!plan || !['monthly', 'yearly', 'lifetime'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: "Valid plan selection required (monthly, yearly, or lifetime)"
      });
    }

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "Email address is required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: "Invalid email address"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const priceId = STRIPE_PRICE_IDS[plan];

    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: "Invalid plan selected"
      });
    }

    console.log(`Processing subscription for plan: ${plan}, email: ${cleanEmail}`);

    // Get or create user in our database
    let user = await getUserByEmail(cleanEmail);
    let stripeCustomerId = user?.stripe_customer_id;

    // Create Stripe customer if none exists
    if (!stripeCustomerId) {
      const stripeCustomer = await createStripeCustomer(cleanEmail);
      if (!stripeCustomer) {
        return res.status(500).json({
          success: false,
          error: "Failed to create customer account"
        });
      }
      stripeCustomerId = stripeCustomer.id;
      
      // Update user with Stripe customer ID
      const userId = await upsertUser(cleanEmail, stripeCustomerId);
      if (!userId) {
        return res.status(500).json({
          success: false,
          error: "Failed to update user account"
        });
      }
    }

    // Create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/app?success=true&plan=${plan}`;
    const cancelUrl = `${baseUrl}/paywall?canceled=true`;

    const checkoutSession = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata: {
        user_email: cleanEmail,
        plan_type: plan
      }
    });

    if (!checkoutSession) {
      return res.status(500).json({
        success: false,
        error: "Failed to create checkout session"
      });
    }

    console.log(`Checkout session created: ${checkoutSession.id} for ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: `Redirecting to ${plan} plan checkout`,
      checkoutUrl: checkoutSession.url!,
      sessionId: checkoutSession.id
    });

  } catch (error) {
    console.error('Subscription processing error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
}