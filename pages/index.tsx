// pages/index.tsx - Updated with 3-day trial system
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

interface TrialData {
  email: string;
  startDate: number;
  expiryDate: number;
  status: 'active' | 'expired';
}

export default function LandingPage() {
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<"loading" | "new" | "trial" | "expired" | "paid">("loading");
  const [isClient, setIsClient] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getTrialData = (): TrialData | null => {
    try {
      const trial = localStorage.getItem("bookfoldar_trial");
      return trial ? JSON.parse(trial) : null;
    } catch (error) {
      console.error("Error parsing trial data:", error);
      localStorage.removeItem("bookfoldar_trial");
      return null;
    }
  };

  const calculateTrialDaysRemaining = (trialData: TrialData): number => {
    const remaining = Math.ceil((trialData.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  };

  const isTrialActive = (trialData: TrialData): boolean => {
    return Date.now() < trialData.expiryDate && trialData.status === 'active';
  };

  const checkUserAccess = async (emailToCheck?: string) => {
    const checkEmail = emailToCheck || localStorage.getItem('userEmail');
    
    // First check if user has paid (highest priority)
    if (checkEmail) {
      try {
        const response = await fetch('/api/check-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: checkEmail }),
        });

        const { hasAccess } = await response.json();
        
        if (hasAccess) {
          setUserEmail(checkEmail);
          setUserStatus("paid");
          localStorage.setItem('userEmail', checkEmail);
          return;
        }
      } catch (error) {
        console.error('Error checking paid access:', error);
      }
    }

    // Then check trial status
    const trialData = getTrialData();
    if (trialData) {
      setUserEmail(trialData.email);
      const daysRemaining = calculateTrialDaysRemaining(trialData);
      setTrialDaysRemaining(daysRemaining);

      if (isTrialActive(trialData)) {
        setUserStatus("trial");
        localStorage.setItem('userEmail', trialData.email);
      } else {
        setUserStatus("expired");
      }
    } else {
      setUserStatus("new");
    }
  };

  useEffect(() => {
    if (isClient) {
      checkUserAccess();
      
      // Check for successful payment return
      if (router.query.success === 'true') {
        const email = localStorage.getItem('userEmail');
        if (email) {
          checkUserAccess(email);
        }
      }
    }
  }, [isClient, router.query.success]);

  const startTrial = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setIsStartingTrial(true);

    try {
      // Create trial data
      const startDate = Date.now();
      const expiryDate = startDate + (3 * 24 * 60 * 60 * 1000); // 3 days
      
      const trialData: TrialData = {
        email: email.trim().toLowerCase(),
        startDate,
        expiryDate,
        status: 'active'
      };

      // Store trial data locally
      localStorage.setItem('bookfoldar_trial', JSON.stringify(trialData));
      localStorage.setItem('userEmail', email.trim().toLowerCase());

      // Update state
      setUserEmail(email.trim().toLowerCase());
      setUserStatus("trial");
      setTrialDaysRemaining(3);

      // Optional: Also store trial start on your backend for tracking
      // await fetch('/api/start-trial', { ... });

    } catch (error) {
      console.error('Error starting trial:', error);
      alert('Failed to start trial. Please try again.');
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handlePayment = async () => {
    const userEmailToUse = userEmail || email.trim().toLowerCase();
    
    if (!userEmailToUse) {
      alert('Please enter your email address');
      return;
    }

    try {
      // Create checkout session for $9.99 one-time payment
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmailToUse,
          successUrl: `${window.location.origin}/?success=true`,
          cancelUrl: `${window.location.origin}/?cancelled=true`
        }),
      });

      const { sessionId, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js').then(mod => 
        mod.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      );
      
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    }
  };

  const handleAccessApp = () => {
    router.push("/app");
  };

  const renderMainSection = () => {
    if (!isClient || userStatus === "loading") {
      return (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-white/20 mb-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-gray-300/20 rounded w-3/4 mb-4"></div>
            <div className="h-12 bg-gray-300/20 rounded w-full mb-4"></div>
            <div className="h-4 bg-gray-300/20 rounded w-1/2"></div>
          </div>
        </div>
      );
    }

    if (userStatus === "paid") {
      return (
        <div className="bg-green-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-green-400/30 mb-8">
          <h3 className="text-2xl font-semibold mb-4 text-green-300">
            🎉 Welcome Back!
          </h3>
          <p className="text-sm text-gray-200 mb-4">
            You have full access to BookfoldAR. Ready to create amazing book art?
          </p>
          <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-400/20">
            <p className="text-xs text-green-200">
              ✅ Account: {userEmail}<br />
              ✅ Full access unlocked<br />
              ✅ All AR features available
            </p>
          </div>
          <button
            onClick={handleAccessApp}
            className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            🚀 Launch BookfoldAR
          </button>
        </div>
      );
    }

    if (userStatus === "trial") {
      return (
        <div className="bg-blue-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-blue-400/30 mb-8">
          <h3 className="text-2xl font-semibold mb-4 text-blue-300">
            ✨ Trial Active
          </h3>
          <p className="text-sm text-gray-200 mb-4">
            You have <span className="font-bold text-blue-300">{trialDaysRemaining} days remaining</span> in your free trial.
          </p>
          <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-400/20">
            <p className="text-xs text-blue-200">
              ✅ Trial for: {userEmail}<br />
              ✅ Full access to all AR features<br />
              ✅ No credit card required
            </p>
          </div>
          <button
            onClick={handleAccessApp}
            className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors mb-3"
          >
            📱 Continue Using BookfoldAR
          </button>
          <button
            onClick={handlePayment}
            className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-sm transition-colors"
          >
            Upgrade Now - $9.99 (One-time)
          </button>
        </div>
      );
    }

    if (userStatus === "expired") {
      return (
        <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-red-400/30 mb-8">
          <h3 className="text-2xl font-semibold mb-4 text-red-300">
            ⏰ Trial Expired
          </h3>
          <p className="text-sm text-gray-200 mb-4">
            Your 3-day trial has ended. Upgrade to continue using BookfoldAR's amazing AR features!
          </p>
          <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-400/20">
            <p className="text-xs text-red-200">
              📧 Account: {userEmail}<br />
              ⏰ Trial ended<br />
              💳 One-time payment for lifetime access
            </p>
          </div>
          <button
            onClick={handlePayment}
            className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            💎 Get Full Access - $9.99
          </button>
        </div>
      );
    }

    // New user - show trial signup
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-white/20 mb-8">
        <h3 className="text-2xl font-semibold mb-4">
          🚀 Start Your 3-Day Free Trial
        </h3>
        <div className="text-center mb-6">
          <span className="text-2xl font-bold text-blue-400">3 Days Free</span>
          <span className="block text-gray-400 mt-1">Then $9.99 one-time</span>
        </div>
        <p className="text-sm text-gray-200 mb-6">
          Full access to all AR features during your trial. No credit card required to start!
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isStartingTrial}
            />
          </div>
          
          <button
            onClick={startTrial}
            disabled={isStartingTrial || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold text-white transition-colors"
          >
            {isStartingTrial ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting Trial...
              </span>
            ) : (
              '🎯 Start 3-Day Free Trial'
            )}
          </button>
          
          <p className="text-xs text-gray-400 text-center">
            No credit card required. Cancel anytime during trial.
          </p>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-400/20">
          <h4 className="font-semibold text-blue-300 mb-2">What You Get:</h4>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>✅ AR camera with real-time overlay</li>
            <li>✅ Voice control navigation</li>
            <li>✅ PDF import capabilities</li>
            <li>✅ Advanced mark navigation</li>
            <li>✅ 3 days to try everything</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-white">
      {/* Hero */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-600 to-purple-700 px-4">
        <h1 className="text-5xl font-bold mb-4">📚 BookfoldAR</h1>
        <p className="text-lg max-w-2xl mx-auto text-gray-100 mb-8">
          Precision book folding with augmented reality assistance.
        </p>
        {renderMainSection()}
      </section>

      {/* Features sections remain the same */}
      <section className="max-w-6xl mx-auto py-16 px-6 space-y-20">
        {/* Your existing feature sections here */}
      </section>

      <footer className="bg-gray-800 py-8 px-4 text-center text-gray-400">
        <p>&copy; 2025 BookfoldAR. Transform your book folding with AR precision.</p>
      </footer>
    </div>
  );
}