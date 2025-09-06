// pages/api/create-checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import cookie from "cookie";

// Environment variable validation
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}
if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Use the API version supported by your Stripe package
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get userId from cookie
    const cookies = cookie.parse(req.headers.cookie || "");
    const cookieName = process.env.COOKIE_NAME || "ar_book_user_id";
    const userId = cookies[cookieName];

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // 2. Load user from Supabase
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      console.error("User fetch error:", userErr);
      return res.status(404).json({ error: "User not found" });
    }

    let customerId = user.stripe_customer_id;

    // 3. Create Stripe customer if needed
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email, // Use the actual user email
          metadata: { 
            userId,
            source: "ar-book-folding-app"
          },
        });

        customerId = customer.id;

        // Update user with customer ID
        const { error: updateError } = await supabase
          .from("users")
          .update({ 
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString()
          })
          .eq("id", userId);

        if (updateError) {
          console.error("Failed to update user with customer ID:", updateError);
          // Continue anyway, as the customer was created successfully
        }
      } catch (stripeError) {
        console.error("Failed to create Stripe customer:", stripeError);
        return res.status(500).json({ error: "Failed to create customer" });
      }
    }

    // 4. Validate request body
    const { priceId } = req.body as { priceId?: string };

    if (!priceId || typeof priceId !== "string") {
      return res.status(400).json({ error: "Missing or invalid priceId" });
    }

    // Validate that the priceId is one of your expected price IDs
    const validPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
      process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME,
    ].filter(Boolean);

    if (!validPriceIds.includes(priceId)) {
      return res.status(400).json({ error: "Invalid priceId" });
    }

    // 5. Check if user already has an active subscription
    if (user.subscription_status === "active") {
      return res.status(400).json({ 
        error: "User already has an active subscription",
        redirect: "/account"
      });
    }

    // 6. Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      mode: priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME ? "payment" : "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ 
        price: priceId, 
        quantity: 1 
      }],
      success_url: `${baseUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { 
        userId,
        priceId,
        planType: priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME ? "lifetime" :
                  priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY ? "yearly" : "monthly"
      },
      allow_promotion_codes: true, // Allow discount codes
    };

    // Add trial period for subscription plans (not lifetime)
    if (sessionCreateParams.mode === "subscription") {
      // Check if user had a trial before
      if (!user.has_used_trial) {
        sessionCreateParams.subscription_data = {
          trial_period_days: 7, // 7-day trial
          metadata: {
            userId,
            priceId,
          }
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionCreateParams);

    if (!session.id || !session.url) {
      throw new Error("Failed to create checkout session");
    }

    res.status(200).json({ 
      sessionId: session.id, 
      url: session.url,
      customerId: customerId
    });

  } catch (err: any) {
    console.error("❌ create-checkout error:", err);
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
}