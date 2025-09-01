import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';

interface FeatureGuardProps {
  feature: string;
  showPaywall?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  gracefulDegradation?: boolean;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  showPaywall = true,
  fallback = null,
  children,
  gracefulDegradation = false,
}) => {
  const subscription = useSubscription();

  const hasAccess =
    subscription.isSubscribed || subscription.trialActive || !showPaywall;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showPaywall) {
    return <PaywallModal />;
  }

  if (gracefulDegradation) {
    return <>{fallback}</>;
  }

  return null;
};
