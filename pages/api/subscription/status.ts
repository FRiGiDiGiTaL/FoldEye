// pages/api/subscription/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import cookie from "cookie";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get userId from cookie
    const cookieName = process.env.COOKIE_NAME || "ar_book_user_id";
    const cookies = cookie.parse(req.headers.cookie || "");
    const userId = cookies[cookieName];

    if (!userId) {
      return res.status(200).json({
        subscription_status: "free",
        trial_end: null,
        hasAccess: false,
      });
    }

    // 2. Load user from Supabase - only select columns that exist
    const { data: users, error } = await supabase
      .from("users")
      .select("subscription_status, trial_end, email, stripe_customer_id")
      .eq("id", userId)
      .limit(1);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Failed to load subscription" });
    }

    if (!users || users.length === 0) {
      return res.status(200).json({
        subscription_status: "free",
        trial_end: null,
        hasAccess: false,
      });
    }

    const user = users[0];
    const subscriptionStatus = user.subscription_status || "free";
    
    // Check if user has access (active subscription or valid trial)
    let hasAccess = false;
    if (subscriptionStatus === "active" || subscriptionStatus === "lifetime") {
      hasAccess = true;
    } else if (subscriptionStatus === "trialing" && user.trial_end) {
      const trialEndDate = new Date(user.trial_end);
      const now = new Date();
      hasAccess = trialEndDate > now;
    }

    return res.status(200).json({
      subscription_status: subscriptionStatus,
      trial_end: user.trial_end,
      hasAccess: hasAccess,
      email: user.email,
      stripe_customer_id: user.stripe_customer_id,
    });
  } catch (err: any) {
    console.error("❌ Subscription status error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}