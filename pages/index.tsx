// pages/index.tsx - Enhanced Landing Page with Trial + Subscribe Flow
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { TrialSignup } from "../components/TrialSignup";

export default function LandingPage() {
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<
    "loading" | "new" | "trial" | "subscribed" | "expired"
  >("loading");
  const [isClient, setIsClient] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const checkUserStatus = async () => {
      try {
        const subscription = localStorage.getItem("bookfoldar_subscription");
        const trial = localStorage.getItem("bookfoldar_trial");

        let emailToCheck = "";

        if (subscription) {
          const subData = JSON.parse(subscription);
          if (
            subData.active ||
            subData.status === "active" ||
            subData.paidViaStripe
          ) {
            setUserStatus("subscribed");
            return;
          }
        }

        if (trial) {
          const trialData = JSON.parse(trial);
          emailToCheck = trialData.email || "";
          setUserEmail(emailToCheck);

          if (trialData.expiryDate && Date.now() < trialData.expiryDate) {
            if (emailToCheck) {
              try {
                const response = await fetch("/api/check-subscription", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: emailToCheck }),
                });
                const data = await response.json();
                if (data.success) {
                  if (data.status.hasActiveSubscription) {
                    setUserStatus("subscribed");
                    return;
                  } else if (
                    data.status.trialActive &&
                    data.status.trialDaysRemaining > 0
                  ) {
                    setUserStatus("trial");
                    return;
                  }
                }
              } catch (error) {
                console.error("Error checking subscription status:", error);
              }
            }
            setUserStatus("trial");
            return;
          } else {
            setUserStatus("expired");
            return;
          }
        }

        setUserStatus("new");
      } catch (error) {
        console.error("Error checking user status:", error);
        setUserStatus("new");
      }
    };

    checkUserStatus();
  }, [isClient]);

  const handleAccessApp = () => {
    router.push("/app");
  };

  const handleSubscribe = async () => {
    if (!userEmail) {
      alert("Please start the trial first to associate your email.");
      return;
    }

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  const getRemainingTrialDays = () => {
    try {
      const trial = localStorage.getItem("bookfoldar_trial");
      if (trial) {
        const trialData = JSON.parse(trial);
        const remaining = Math.ceil(
          (trialData.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return Math.max(0, remaining);
      }
    } catch (error) {
      console.error("Error calculating trial days:", error);
    }
    return 0;
  };

  const renderTrialSignupSection = () => {
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

    switch (userStatus) {
      case "subscribed":
        return (
          <div className="bg-green-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-green-400/30 mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-green-300">
              🎉 Welcome Back, Pro User!
            </h3>
            <p className="text-sm text-gray-200 mb-6">
              You have full access to all BookfoldAR features.
            </p>
            <button
              onClick={handleAccessApp}
              className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
            >
              🚀 Launch BookfoldAR Pro
            </button>
          </div>
        );

      case "trial":
        const remainingDays = getRemainingTrialDays();
        return (
          <div className="bg-blue-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-blue-400/30 mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-blue-300">
              ✨ Trial Active
            </h3>
            <p className="text-sm text-gray-200 mb-2">
              You have{" "}
              <span className="font-bold text-blue-300">
                {remainingDays} days remaining
              </span>{" "}
              in your free trial.
            </p>
            <button
              onClick={handleAccessApp}
              className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors mb-3"
            >
              📱 Continue Trial
            </button>
            <button
              onClick={handleSubscribe}
              className="block w-full text-center bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white text-sm transition-colors"
            >
              Upgrade to Pro
            </button>
          </div>
        );

      case "expired":
        return (
          <div className="bg-yellow-500/20 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-yellow-400/30 mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-300">
              ⏰ Trial Expired
            </h3>
            <p className="text-sm text-gray-200 mb-6">
              Your 7-day trial has ended. Subscribe to continue using BookfoldAR.
            </p>
            <button
              onClick={handleSubscribe}
              className="block w-full text-center bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors"
            >
              💎 Subscribe Now
            </button>
          </div>
        );

      default:
        return (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-white/20 mb-8">
            <h3 className="text-2xl font-semibold mb-4">
              🚀 Start Your 7-Day Free Trial
            </h3>
            <p className="text-sm text-gray-200 mb-6">
              Full access to all AR features. No restrictions.
            </p>
            <TrialSignup />
          </div>
        );
    }
  };

  return (
    <div className="bg-gray-900 text-white">
      {/* Hero */}
      <section className="text-center py-20 bg-gradient-to-r from-blue-600 to-purple-700 px-4">
        <h1 className="text-5xl font-bold mb-4">📚 BookfoldAR</h1>
        <p className="text-lg max-w-2xl mx-auto text-gray-100 mb-8">
          Precision book folding with augmented reality assistance.
        </p>
        {renderTrialSignupSection()}
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto py-16 px-6 space-y-20">
        {/* Step 1 */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/book_dimensions.png"
              alt="Book Dimensions"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 1: Book Dimensions</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Define your book's page height and padding.
            </p>
          </div>
        </div>
        {/* Step 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/enhanced_ar_camera.png"
              alt="AR Camera"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">
              Step 2: Enhanced AR Camera
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Overlay digital guides onto your real book with real-time
              calibration.
            </p>
          </div>
        </div>
        {/* Step 3 */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/voice_control.png"
              alt="Voice Control"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 3: Voice Control</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Navigate pages hands-free with natural voice commands.
            </p>
          </div>
        </div>
        {/* Step 4 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/ar_page_&_mark_Navigation.png"
              alt="Page Navigation"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">
              Step 4: AR Page & Mark Navigation
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Track complex folding patterns with smart navigation.
            </p>
          </div>
        </div>
        {/* Step 5 */}
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/pdf_import.png"
              alt="PDF Import"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">Step 5: PDF Import</h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Drag and drop pattern files for auto-conversion.
            </p>
          </div>
        </div>
        {/* Step 6 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-10">
          <div className="md:w-1/2">
            <Image
              src="/manual_marking_instructions.png"
              alt="Manual Instructions"
              width={500}
              height={350}
              className="rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-4">
              Step 6: Manual Instructions
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Paste or type measurements in any format and convert to AR-ready
              marks.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      {isClient && (userStatus === "new" || userStatus === "loading") && (
        <section className="text-center py-20 bg-gradient-to-r from-purple-700 to-blue-600">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Book Folding?
          </h2>
          <p className="max-w-3xl mx-auto text-xl text-gray-100 mb-8">
            Get complete access to all features during your 7-day trial.
          </p>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 max-w-lg mx-auto border border-white/20 mb-8">
            <TrialSignup />
          </div>
        </section>
      )}

      {isClient && (userStatus === "trial" || userStatus === "expired") && (
        <section className="text-center py-20 bg-gradient-to-r from-purple-700 to-blue-600">
          <h2 className="text-4xl font-bold mb-6">
            {userStatus === "trial"
              ? "Make the Most of Your Trial"
              : "Your Trial Has Ended"}
          </h2>
          <p className="max-w-3xl mx-auto text-xl text-gray-100 mb-8">
            {userStatus === "trial"
              ? `You have ${getRemainingTrialDays()} days left. Upgrade anytime to keep going.`
              : "Subscribe now to unlock all features again."}
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleSubscribe}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold text-white transition-colors"
            >
              {userStatus === "trial" ? "Upgrade Now" : "Subscribe Now"}
            </button>
          </div>
        </section>
      )}

      <footer className="bg-gray-800 py-8 px-4 text-center text-gray-400">
        <p>&copy; 2025 BookfoldAR. Transform your book folding with AR precision.</p>
      </footer>
    </div>
  );
}
