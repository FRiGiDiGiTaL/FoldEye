import React, { ReactNode, useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';

interface FeatureGuardProps {
  feature: string;
  children: ReactNode;
  showPaywall?: boolean; // If true, display modal instead of fallback
  fallback?: ReactNode;
  gracefulDegradation?: boolean; // Optional, allows partial usage
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  children,
  showPaywall = false,
  fallback = null,
  gracefulDegradation = false,
}) => {
  const { isSubscribed, trialActive } = useSubscription();
  const [showModal, setShowModal] = useState(false);

  const hasAccess = isSubscribed || trialActive;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showPaywall) {
    return (
      <>
        {fallback}
        {showModal && <PaywallModal />}
        {!showModal && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Unlock with Free Trial
          </button>
        )}
      </>
    );
  }

  if (gracefulDegradation) {
    return <>{fallback}</>;
  }

  return null;
};
