import React, { useState } from "react";
import SubscribeButton from "./SubscribeButton";

interface PaywallModalProps {
  title?: string;
  message?: string;
}

export default function PaywallModal({
  title = "Upgrade to unlock this feature",
  message = "Start your free trial or subscribe to access all premium overlays.",
}: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  // ⚠️ Replace this with your real Stripe price ID (from dashboard)
  const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md text-center">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>

        <div className="space-y-3">
          <SubscribeButton
            priceId={PRICE_ID}
            onLoading={setLoading}
            disabled={loading}
          />
          <p className="text-xs text-gray-500">
            Cancel anytime. Secure payments by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
