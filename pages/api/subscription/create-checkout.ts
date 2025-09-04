import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import cookie from "cookie";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get userId from cookie
    const cookies = cookie.parse(req.headers.cookie || "");
    const userId = cookies[process.env.COOKIE_NAME!];

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // 2. Load user from Supabase
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .limit(1);

    if (userErr || !users?.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    let customerId = user.stripe_customer_id;

    // 3. Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });

      customerId = customer.id;

      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // 4. Create checkout session
    const { priceId } = req.body as { priceId?: string };

    if (!priceId) {
      return res.status(400).json({ error: "Missing priceId" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { userId },
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error("❌ create-checkout error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
