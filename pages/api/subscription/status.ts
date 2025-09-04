import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import cookie from "cookie";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const userId = cookies[process.env.COOKIE_NAME!];

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("subscription_status, trial_end, plan_type")
      .eq("id", userId)
      .limit(1);

    if (error || !users?.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(users[0]);
  } catch (err: any) {
    console.error("status API error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
