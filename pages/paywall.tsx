// pages/paywall.tsx
import React from "react";
import { useRouter } from "next/router";

export default function PaywallPage() {
  const router = useRouter();

  const choosePlan = (plan: "monthly" | "yearly" | "lifetime") => {
    // TODO: replace with real Stripe checkout; for now just mark active
    localStorage.setItem(
      "bookfoldar_subscription",
      JSON.stringify({ active: true, plan, activatedAt: Date.now() })
    );
    router.push("/app");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2">Your trial has ended</h1>
        <p className="text-center text-gray-300 mb-10">
          Choose a plan to keep using BookfoldAR.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Monthly */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-2">Monthly</h2>
            <p className="text-3xl font-bold mb-4">$9<span className="text-lg">/mo</span></p>
            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>Full AR features</li>
              <li>Voice control & PDF import</li>
              <li>All updates included</li>
            </ul>
            <button
              onClick={() => choosePlan("monthly")}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-semibold"
            >
              Continue Monthly
            </button>
          </div>

          {/* Yearly */}
          <div className="bg-white/5 rounded-xl p-6 border border-blue-400/40 relative">
            <span className="absolute -top-3 right-4 text-xs bg-blue-500 px-2 py-1 rounded">
              Best Value
            </span>
            <h2 className="text-xl font-semibold mb-2">Yearly</h2>
            <p className="text-3xl font-bold mb-4">$79<span className="text-lg">/yr</span></p>
            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>Everything in Monthly</li>
              <li>2 months free</li>
              <li>Priority support</li>
            </ul>
            <button
              onClick={() => choosePlan("yearly")}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold"
            >
              Continue Yearly
            </button>
          </div>

          {/* Lifetime */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-2">Lifetime</h2>
            <p className="text-3xl font-bold mb-4">$149</p>
            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>Pay once, use forever</li>
              <li>All future features</li>
              <li>No recurring fees</li>
            </ul>
            <button
              onClick={() => choosePlan("lifetime")}
              className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg font-semibold"
            >
              Continue Lifetime
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Your existing projects remain on your device. Subscribing unlocks continued usage.
        </p>
      </div>
    </div>
  );
}
