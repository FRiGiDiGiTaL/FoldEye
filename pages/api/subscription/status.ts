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
    const cookies = cookie.parse(req.headers.cookie || "");
    const userId = cookies[process.env.COOKIE_NAME!];

    if (!userId) {
      return res.status(200).json({
        subscription_status: "free",
        plan_type: "free",
        trial_end: null,
      });
    }

    // 2. Load user from Supabase
    const { data: users, error } = await supabase
      .from("users")
      .select("subscription_status, trial_end, plan_type")
      .eq("id", userId)
      .limit(1);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Failed to load subscription" });
    }

    if (!users || users.length === 0) {
      return res.status(200).json({
        subscription_status: "free",
        plan_type: "free",
        trial_end: null,
      });
    }

    const user = users[0];
    return res.status(200).json({
      subscription_status: user.subscription_status || "free",
      trial_end: user.trial_end,
      plan_type: user.plan_type || "free",
    });
  } catch (err: any) {
    console.error("❌ Subscription status error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
