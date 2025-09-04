import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { parse } from "cookie";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cookies = parse(req.headers.cookie || "");
    const userId = cookies[process.env.COOKIE_NAME!];

    if (!userId) {
      return res.status(200).json({ subscription_status: "free" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("subscription_status, trial_end")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("Supabase query error:", error);
      return res.status(200).json({ subscription_status: "free" });
    }

    return res.status(200).json({
      subscription_status: data.subscription_status || "free",
      trial_end: data.trial_end || null,
    });
  } catch (err) {
    console.error("Status API error:", err);
    return res.status(500).json({ subscription_status: "free" });
  }
}
