// pages/api/billing-portal.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createBillingPortalSession } from "../../lib/stripe";
import { getUserByEmail } from "../../lib/supabase";

interface BillingPortalRequest {
  email: string;
}

interface BillingPortalResponse {
  success: boolean;
  error?: string;
  url?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BillingPortalResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });
  }

  try {
    const { email }: BillingPortalRequest = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "Email is required"
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

    // Get user from database
    const user = await getUserByEmail(cleanEmail);
    if (!user || !user.stripe_customer_id) {
      return res.status(404).json({
        success: false,
        error: "No subscription found for this email address"
      });
    }

    // Create billing portal session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/app`;

    const portalSession = await createBillingPortalSession(
      user.stripe_customer_id,
      returnUrl
    );

    if (!portalSession) {
      return res.status(500).json({
        success: false,
        error: "Failed to create billing portal session"
      });
    }

    console.log(`Billing portal created for ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      url: portalSession.url
    });

  } catch (error) {
    console.error("Billing portal error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}