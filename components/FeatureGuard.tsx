import React from "react";
import { useSubscription } from "../hooks/useSubscription";
import PaywallModal from "./PaywallModal";
import TrialBanner from "./TrialBanner";

interface FeatureGuardProps {
  children: React.ReactNode;
  requirePro?: boolean; // default true: everything requires trial or subscription
}

export default function FeatureGuard({ children, requirePro = true }: FeatureGuardProps) {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return <div>Loading...</div>; // TODO: replace with spinner if you want
  }

  const status = subscription?.status || "free";

  // If this content does not require pro/trial/subscription → always allow
  if (!requirePro) {
    return <>{children}</>;
  }

  // Allowed if active subscription or trialing
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

  // Otherwise block and show paywall
  return <PaywallModal />;
}
