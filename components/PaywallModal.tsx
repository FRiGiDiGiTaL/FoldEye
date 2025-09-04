import React, { useState } from "react";
import SubscribeButton from "./SubscribeButton";

interface PaywallModalProps {
  title?: string;
  message?: string;
  onStartTrial?: () => void; // callback when starting trial
}

export default function PaywallModal({
  title = "Upgrade to unlock this feature",
  message = "Start your free trial or subscribe to access all premium overlays.",
  onStartTrial,
}: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  // Stripe price IDs from .env
  const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;
  const YEARLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!;

  const handleTrialClick = () => {
    if (onStartTrial) {
      onStartTrial();
    } else {
      alert("✅ Free trial started! Enjoy 7 days of premium features.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md text-center">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>

        <div className="space-y-4">
          {/* Free Trial */}
          <button
            onClick={handleTrialClick}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl shadow hover:opacity-90 transition"
          >
            🎁 Start Free 7-Day Trial
          </button>

          {/* Paid Subscriptions */}
          <SubscribeButton
            priceId={MONTHLY_PRICE}
            onLoading={setLoading}
            disabled={loading}
            label="Subscribe Monthly"
          />

          <SubscribeButton
            priceId={YEARLY_PRICE}
            onLoading={setLoading}
            disabled={loading}
            label="Subscribe Yearly"
          />

          <p className="text-xs text-gray-500 mt-3">
            Cancel anytime. Secure payments by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
