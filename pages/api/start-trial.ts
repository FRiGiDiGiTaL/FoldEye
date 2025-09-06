// pages/api/start-trial.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { serialize } from "cookie";
import crypto from "crypto";

// Add environment variable validation
if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate email from request body
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "Email is required" });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Use a default cookie name if COOKIE_NAME is not set
    const cookieName = process.env.COOKIE_NAME || "ar_book_user_id";
    
    // Better cookie parsing
    const cookies: Record<string, string> = {};
    if (req.headers.cookie) {
      req.headers.cookie.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        cookies[name] = rest.join("=");
      });
    }
    
    let userId = cookies[cookieName];

    if (!userId) {
      userId = crypto.randomUUID();
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

    // Check if email is already in use
    const { data: existingEmailUser, error: emailCheckError } = await supabase
      .from("users")
      .select("id, email, subscription_status, trial_end")
      .eq("email", cleanEmail)
      .single();

    if (emailCheckError && emailCheckError.code !== "PGRST116") {
      console.error("Email check error:", emailCheckError);
      return res.status(500).json({ error: "Failed to check email availability" });
    }

    if (existingEmailUser) {
      const now = new Date();
      const trialEndDate = new Date(existingEmailUser.trial_end);
      
      if (existingEmailUser.subscription_status === "active" || 
          (existingEmailUser.subscription_status === "trialing" && trialEndDate > now)) {
        return res.status(400).json({ 
          error: "An account with this email already has an active trial or subscription"
        });
      }
      
      // Use existing user ID if they had an expired trial
      userId = existingEmailUser.id;
    }

    // Check if current cookie user exists (separate from email check)
    const { data: existingCookieUser, error: cookieUserError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (cookieUserError && cookieUserError.code !== "PGRST116") {
      console.error("Cookie user check error:", cookieUserError);
      return res.status(500).json({ error: "Failed to check user status" });
    }

    // Upsert user in Supabase
    const { data, error } = await supabase.from("users").upsert(
      {
        id: userId,
        email: cleanEmail,
        trial_end: trialEnd.toISOString(),
        subscription_status: "trialing",
        created_at: existingCookieUser?.created_at || now.toISOString(),
        updated_at: now.toISOString(),
      },
      { 
        onConflict: "id",
        ignoreDuplicates: false 
      }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error: "Failed to start trial" });
    }

    // Set cookie with better options
    const cookie = serialize(cookieName, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    res.setHeader("Set-Cookie", cookie);
    res.status(200).json({ 
      success: true, 
      userId: userId,
      email: cleanEmail,
      trialEnds: trialEnd.toISOString(),
      message: "Trial started successfully"
    });
  } catch (err: any) {
    console.error("Trial start error:", err);
    res.status(500).json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
}