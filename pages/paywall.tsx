// pages/paywall.tsx - Updated for Payment Links
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function PaywallPage() {
  const router = useRouter();
  const { success, canceled } = router.query;
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>('');

  const plans = {
    monthly: { 
      price: '$5.99', 
      period: 'per month', 
      savings: '',
      description: 'Full access to all AR features',
      paymentLink: 'https://buy.stripe.com/14A14mcn4bfLbRM7pqgbm00'
    },
    yearly: { 
      price: '$19.99', 
      period: 'per year', 
      savings: 'Save 67%',
      description: 'Best value - 2 months free',
      paymentLink: 'https://buy.stripe.com/7sY00i2MuerX094h00gbm01'
    },
    lifetime: { 
      price: '$59.99', 
      period: 'one-time', 
      savings: 'Best Deal',
      description: 'Pay once, use forever',
      paymentLink: 'https://buy.stripe.com/fZu9ASfzgabH2hc112gbm02'
    }
  };

  const handleSubscribe = () => {
    console.log('NEW PAYMENT LINKS VERSION RUNNING!');
    
    // Basic email validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Get the payment link for selected plan
    const selectedPaymentLink = plans[selectedPlan].paymentLink;

    // Add email as URL parameter to pre-fill Stripe checkout
    let paymentUrl = selectedPaymentLink;
    if (email.trim()) {
      const url = new URL(selectedPaymentLink);
      url.searchParams.set('prefilled_email', email.trim());
      paymentUrl = url.toString();
    }

    // Simply redirect to Stripe Payment Link
    window.location.href = paymentUrl;
  };

  // Handle success return from Stripe
  useEffect(() => {
    if (success) {
      // Store simple subscription data
      const subscriptionData = {
        plan: router.query.plan || 'unknown',
        status: 'active',
        startDate: Date.now(),
        source: 'payment_link'
      };
      localStorage.setItem('bookfoldar_subscription', JSON.stringify(subscriptionData));
    }
  }, [success, router.query.plan]);

  if (success) {
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

      {/* Email input */}
      <div className="max-w-md mx-auto mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Email Address (will pre-fill Stripe checkout)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          placeholder="Enter your email address"
          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-md mx-auto mb-6 p-3 bg-red-500/20 border border-red-400/30 rounded text-red-400 text-sm flex items-center">
          <span className="mr-2">⚠️</span>
          {error}
        </div>
      )}

      {/* Plan selection */}
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-8">
        {Object.entries(plans).map(([key, plan]) => (
          <div
            key={key}
            onClick={() => setSelectedPlan(key as any)}
            className={`cursor-pointer bg-white/6 backdrop-blur-lg border-2 rounded-2xl p-8 transition-all hover:scale-105 ${
              selectedPlan === key
                ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/25'
                : 'border-white/12 hover:border-white/25'
            }`}
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2 capitalize">BookfoldAR Pro — {key}</h2>
              <div className="text-3xl font-bold mb-1">{plan.price}</div>
              <div className="text-gray-400 text-sm mb-4">{plan.period}</div>
              
              {plan.savings && (
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
                  key === 'yearly' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {plan.savings}
                </div>
              )}
              
              <p className="text-gray-300 text-sm mb-4">{plan.description}</p>

              <ul className="text-sm text-gray-300 space-y-2 mb-6 text-left">
                <li>• AR precision folding</li>
                <li>• Voice control</li>
                <li>• PDF import & control panel</li>
                {key !== 'monthly' && <li>• Priority updates</li>}
                {key === 'lifetime' && <li>• All future updates included</li>}
              </ul>

              {selectedPlan === key && (
                <div className="text-blue-400 text-sm font-semibold">
                  ✅ Selected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Subscribe button */}
      <div className="text-center">
        <button
          onClick={handleSubscribe}
          className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-lg font-semibold text-lg text-white transition-colors"
        >
          Subscribe {plans[selectedPlan].price}
        </button>
        
        <div className="mt-4 text-sm text-gray-400">
          <p className="mb-1">✅ Secure payment via Stripe</p>
          <p>✅ Cancel anytime • ✅ No hidden fees</p>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-400/20 max-w-2xl mx-auto">
          <p className="text-xs text-blue-300">
            💡 <strong>How it works:</strong> Click "Subscribe" to go to Stripe's secure checkout. 
            After payment, you'll be redirected back here with full access.
          </p>
        </div>
      </div>
    </main>
  );
}