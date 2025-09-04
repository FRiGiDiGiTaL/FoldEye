import React, { useState } from "react";
import { useSubscription } from "../hooks/useSubscription";
import PaywallModal from "./PaywallModal";
import TrialBanner from "./TrialBanner";

interface FeatureGuardProps {
  children: React.ReactNode;
  requirePro?: boolean; // true = premium-only features
}

export default function FeatureGuard({ children, requirePro = true }: FeatureGuardProps) {
  const { subscription, loading } = useSubscription();
  const [startingTrial, setStartingTrial] = useState(false);

  if (loading) {
    return <div>Loading...</div>; // or spinner
  }

  const status = subscription?.status || "free";

  // Free features always allowed
  if (!requirePro) {
    return <>{children}</>;
  }

  // Active subscription or trialing → allow access
  if (status === "active" || status === "trialing") {
    return (
      <>
        {status === "trialing" && subscription?.trialEnds && (
          <TrialBanner trialEnds={subscription.trialEnds} />
        )}
        {children}
      </>
    );
  }

  // Start trial API call
  const handleStartTrial = async () => {
    try {
      setStartingTrial(true);
      const res = await fetch("/api/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start trial");
      }

      window.location.reload(); // reload to refresh subscription state
    } catch (err) {
      console.error("❌ Trial start error:", err);
      alert("Error starting trial. Please try again.");
    } finally {
      setStartingTrial(false);
    }
  };

  // Otherwise show paywall
  return (
    <PaywallModal
      onStartTrial={handleStartTrial}
      title="Unlock Premium Features"
      message="Start your free trial or subscribe today."
    />
  );
}
