import React, { useState } from "react";
import SubscribeButton from "./SubscribeButton";

interface PaywallModalProps {
  title?: string;
  message?: string;
  onStartTrial?: () => Promise<void>;
  onClose?: () => void;
}

export default function PaywallModal({
  title = "Upgrade to unlock this feature",
  message = "Start your free trial or subscribe to access all premium overlays.",
  onStartTrial,
  onClose,
}: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  // Use the monthly price ID from your .env.local
  const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;

  // Add debugging to help troubleshoot
  console.log("PaywallModal - Price ID:", PRICE_ID);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      console.log("Modal close requested - no onClose handler provided");
    }
  };

  const handleStartTrial = async () => {
    if (onStartTrial) {
      try {
        setLoading(true);
        await onStartTrial();
      } catch (error) {
        console.error("Trial start error:", error);
      } finally {
        setLoading(false);
      }
    } else {
      console.log("Start trial requested - no onStartTrial handler provided");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative">
        {/* Optional close button */}
        {onClose && (
          <button 
            onClick={handleClose}
            disabled={loading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold disabled:opacity-50"
          >
            ×
          </button>
        )}
        
        <div className="mb-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          
          <h2 className="text-2xl font-bold mb-3 text-gray-900">{title}</h2>
          <p className="text-gray-600 text-lg leading-relaxed">{message}</p>
        </div>

        <div className="space-y-4">
          {/* Primary Subscribe Button */}
          <SubscribeButton
            priceId={PRICE_ID}
            onLoading={setLoading}
            disabled={loading || !PRICE_ID}
          />
          
          {/* Start Trial Button (if onStartTrial is provided) */}
          {onStartTrial && (
            <button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Starting Trial..." : "Start Free Trial"}
            </button>
          )}
          
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Cancel anytime. Secure payments by Stripe.
            </p>
            
            {/* Show pricing info */}
            <p className="text-xs text-gray-400">
              Monthly subscription • Full access to all features
            </p>
          </div>
          
          {/* Error state */}
          {!PRICE_ID && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-medium">
                ⚠️ Configuration Error
              </p>
              <p className="text-red-500 text-xs mt-1">
                Price ID not configured. Check environment variables.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}