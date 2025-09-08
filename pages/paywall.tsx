// pages/paywall.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Pricing page for BookfoldAR.
 * - Uses NEXT_PUBLIC_STRIPE_PRICE_MONTHLY / YEARLY / LIFETIME env vars as price IDs.
 * - Displays the exact prices you provided:
 *   Monthly: $5.99/mo
 *   Yearly:  $19.99/yr
 *   Lifetime: $59.99 one-time
 */

export default function PaywallPage() {
  const router = useRouter();
  const { success, canceled, session_id } = router.query;

  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  // Stripe price IDs (must be set in .env.local as NEXT_PUBLIC_...)
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || "";
  const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || "";
  const lifetimePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME || "";

  async function startCheckout(priceId: string) {
    if (!priceId) {
      alert("Price ID not configured. Check your .env.local.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await resp.json();
      if (data?.url) {
        // Redirect user to Stripe Checkout
        window.location.href = data.url;
      } else {
        console.error("create-checkout-session response:", data);
        alert("Failed to start checkout. See console for details.");
      }
    } catch (err) {
      console.error("startCheckout error", err);
      alert("Error starting checkout.");
    } finally {
      setLoading(false);
    }
  }

  // Verify session on redirect back from Stripe (quick client check)
  useEffect(() => {
    if (success && session_id) {
      fetch(`/api/verify-session?session_id=${session_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.paid) setPaid(true);
        })
        .catch((err) => console.error("verify-session error", err));
    }
  }, [success, session_id]);

  if (paid) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="bg-green-700/10 border border-green-500/30 rounded-2xl p-8 max-w-md text-center">
          <h1 className="text-3xl font-bold mb-4">✅ Thanks for subscribing!</h1>
          <p className="text-gray-200 mb-6">
            Your BookfoldAR subscription is active. You now have full access to all features.
          </p>
          <button
            onClick={() => router.push("/app")}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            Launch BookfoldAR 🚀
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white py-16 px-6">
      <div className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-gray-300 text-lg">
          Unlock BookfoldAR Pro — AR precision guides, voice control, and PDF import.
        </p>
        {canceled && <p className="text-red-400 mt-4">❌ Payment canceled</p>}
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {/* Monthly */}
        <div className="bg-white/6 backdrop-blur-lg border border-white/12 rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">BookfoldAR Pro — Monthly</h2>
            <p className="text-gray-300 mb-4">Pay month-to-month, cancel anytime.</p>
            <p className="text-3xl font-bold mb-4">$5.99<span className="text-sm ml-1">/mo</span></p>

            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>• AR precision folding</li>
              <li>• Voice control</li>
              <li>• PDF import & control panel</li>
            </ul>
          </div>

          <button
            onClick={() => startCheckout(monthlyPriceId)}
            disabled={loading || !monthlyPriceId}
            className="bg-blue-600 disabled:opacity-50 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            {monthlyPriceId ? "Start Monthly — $5.99/mo" : "Monthly plan not configured"}
          </button>
        </div>

        {/* Yearly */}
        <div className="bg-white/6 backdrop-blur-lg border border-white/12 rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">BookfoldAR Pro — Yearly</h2>
            <p className="text-gray-300 mb-4">Best value — save vs monthly.</p>
            <p className="text-3xl font-bold mb-4">$19.99<span className="text-sm ml-1">/yr</span></p>

            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>• Everything in Monthly</li>
              <li>• One low yearly payment</li>
              <li>• Priority updates</li>
            </ul>
          </div>

          <button
            onClick={() => startCheckout(yearlyPriceId)}
            disabled={loading || !yearlyPriceId}
            className="bg-yellow-500 disabled:opacity-50 hover:bg-yellow-600 px-6 py-3 rounded-lg font-semibold text-black transition-colors"
          >
            {yearlyPriceId ? "Start Yearly — $19.99/yr" : "Yearly plan not configured"}
          </button>
        </div>

        {/* Lifetime */}
        <div className="bg-white/6 backdrop-blur-lg border border-white/12 rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">BookfoldAR Pro — Lifetime</h2>
            <p className="text-gray-300 mb-4">One-time payment — access forever.</p>
            <p className="text-3xl font-bold mb-4">$59.99<span className="text-sm ml-1"> one-time</span></p>

            <ul className="text-sm text-gray-300 space-y-2 mb-6">
              <li>• Lifetime access</li>
              <li>• All future updates included</li>
              <li>• Best for committed creators</li>
            </ul>
          </div>

          <button
            onClick={() => startCheckout(lifetimePriceId)}
            disabled={loading || !lifetimePriceId}
            className="bg-green-600 disabled:opacity-50 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            {lifetimePriceId ? "Buy Lifetime — $59.99" : "Lifetime plan not configured"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto text-center mt-12 text-sm text-gray-400">
        <p>Prices shown match your Stripe plans. Make sure the following env vars are set:</p>
        <code className="block bg-black/20 rounded px-3 py-2 mt-3">
          NEXT_PUBLIC_STRIPE_PRICE_MONTHLY, NEXT_PUBLIC_STRIPE_PRICE_YEARLY, NEXT_PUBLIC_STRIPE_PRICE_LIFETIME
        </code>
      </div>
    </main>
  );
}
