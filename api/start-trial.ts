// /api/start-trial.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { serialize } from "cookie";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Generate or reuse a userId from cookie
    const cookieName = process.env.COOKIE_NAME!;
    const cookies = req.headers.cookie
      ? Object.fromEntries(
          req.headers.cookie.split(";").map((c) => c.trim().split("="))
        )
      : {};
    let userId = cookies[cookieName];

    if (!userId) {
      userId = crypto.randomUUID();
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

    // Upsert user in Supabase
    const { error } = await supabase.from("users").upsert(
      {
        id: userId,
        trial_end: trialEnd.toISOString(),
        subscription_status: "trialing",
        plan_type: "trial",
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error: "Failed to start trial" });
    }

    // Refresh cookie
    const cookie = serialize(cookieName, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    res.setHeader("Set-Cookie", cookie);
    res.status(200).json({ success: true, trialEnds: trialEnd });
  } catch (err: any) {
    console.error("Trial start error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
