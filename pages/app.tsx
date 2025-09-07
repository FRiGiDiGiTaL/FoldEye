// pages/app.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';

// Dynamically import the main App component to avoid SSR issues
const App = dynamic(() => import("../App"), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-xl">Loading BookfoldAR...</p>
      </div>
    </div>
  )
});

export default function AppPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Ensure we're on the client side before accessing localStorage
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Don't run authorization check until we're on the client
    if (!isClient) return;

    try {
      // First check for valid subscription
      const subscription = localStorage.getItem("bookfoldar_subscription");
      if (subscription) {
        const subData = JSON.parse(subscription);
        // Check for active subscription (multiple possible formats)
        if (subData.active || 
            (subData.status === 'active' && subData.expiryDate > Date.now()) ||
            subData.plan) {
          setAuthorized(true);
          return;
        }
      }

      // Then check for valid trial
      const trial = localStorage.getItem("bookfoldar_trial");
      if (trial) {
        const trialData = JSON.parse(trial);
        if (trialData.expiryDate && Date.now() < trialData.expiryDate) {
          setAuthorized(true); // ✅ still in trial
          return;
        } else {
          // Trial expired, redirect to paywall instead of landing
          setIsRedirecting(true);
          router.replace("/paywall");
          return;
        }
      }

      // ❌ No valid trial or subscription → back to landing
      setIsRedirecting(true);
      router.replace("/");

    } catch (error) {
      // Handle JSON parsing errors or other issues
      console.error('Error checking authorization:', error);
      setIsRedirecting(true);
      router.replace("/");
    }
  }, [router, isClient]);

  // Show loading while checking client status
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show loading while checking authorization
  if (!authorized && !isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl">Checking trial status...</p>
          <p className="text-sm text-gray-300 mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  // Show redirecting state
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🚀</div>
          <p className="text-xl mb-2">Redirecting...</p>
          <p className="text-sm text-gray-300">Taking you to the right place</p>
        </div>
      </div>
    );
  }

  // User is authorized, render the main app
  return <App />;
}