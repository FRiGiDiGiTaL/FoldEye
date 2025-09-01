import React, { createContext, useContext, useEffect, useState } from 'react';

type SubscriptionContextShape = {
  isSubscribed: boolean;
  trialActive: boolean;
  loading: boolean;
  startTrialOrSubscribe: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextShape | undefined>(
  undefined
);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [trialActive, setTrialActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with API call to check subscription & trial state
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/subscription/status');
        const data = await res.json();
        setIsSubscribed(data.isSubscribed || false);
        setTrialActive(data.trialActive || false);
      } catch (err) {
        console.error('Failed to fetch subscription status', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const startTrialOrSubscribe = async () => {
    try {
      const res = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Failed to start trial/subscribe', err);
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{ isSubscribed, trialActive, loading, startTrialOrSubscribe }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
};
