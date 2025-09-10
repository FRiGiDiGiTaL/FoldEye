// pages/api/subscribe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { upsertUser, startTrial, getUserSubscriptionStatus } from "../../lib/supabase";

interface SubscribeRequest {
  email: string;
}

interface SubscribeResponse {
  success: boolean;
  message?: string;
  error?: string;
  trialData?: {
    email: string;
    startDate: number;
    expiryDate: number;
    trialDays: number;
    status: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubscribeResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });
  }

  try {
    const { email }: SubscribeRequest = req.body;

    // Validate email
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

    // Check if user already exists and trial status
    const subscriptionStatus = await getUserSubscriptionStatus(cleanEmail);
    
    if (subscriptionStatus) {
      // User exists, check if they already have active subscription or trial
      if (subscriptionStatus.has_active_subscription) {
        return res.status(400).json({
          success: false,
          error: "You already have an active subscription"
        });
      }
      
      if (subscriptionStatus.trial_active) {
        return res.status(400).json({
          success: false,
          error: "You already have an active trial"
        });
      }
      
      // Check if trial was already used
      if (subscriptionStatus.trial_days_remaining === 0 && !subscriptionStatus.trial_active) {
        return res.status(400).json({
          success: false,
          error: "Trial already used for this email address"
        });
      }
    }

    // Create or update user in database
    const userId = await upsertUser(cleanEmail);
    if (!userId) {
      return res.status(500).json({
        success: false,
        error: "Failed to create user account"
      });
    }

    // Start trial
    const trialStarted = await startTrial(cleanEmail);
    if (!trialStarted) {
      return res.status(500).json({
        success: false,
        error: "Failed to start trial. Trial may have already been used."
      });
    }

    // Calculate trial dates
    const startDate = Date.now();
    const expiryDate = startDate + (7 * 24 * 60 * 60 * 1000); // 7 days

    const trialData = {
      email: cleanEmail,
      startDate,
      expiryDate,
      trialDays: 7,
      status: 'active'
    };

    console.log(`Trial started successfully for ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: "Trial started successfully",
      trialData
    });

  } catch (error) {
    console.error("Trial signup error:", error);
    
    return res.status(500).json({
      success: false,
      error: "Internal server error. Please try again later."
    });
  }
}