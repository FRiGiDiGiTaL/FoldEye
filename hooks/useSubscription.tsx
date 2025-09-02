import React, { createContext, useContext, useEffect, useState } from 'react';

type SubscriptionContextShape = {
  isSubscribed: boolean;
  trialActive: boolean;
  loading: boolean;
  startTrialOrSubscribe: (priceId?: string) => Promise<void>;
  upgradeSubscription: (priceId: string) => Promise<void>;
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
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/subscription/status');
        if (res.ok) {
          const data = await res.json();
          setIsSubscribed(data.isSubscribed || false);
          setTrialActive(data.trialActive || false);
        } else {
          console.warn('Failed to fetch subscription status:', res.status);
          // For demo purposes, set default values
          setIsSubscribed(false);
          setTrialActive(false);
        }
      } catch (err) {
        console.error('Failed to fetch subscription status:', err);
        // Handle network errors gracefully
        setIsSubscribed(false);
        setTrialActive(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
  }, []);

  const startTrialOrSubscribe = async (priceId?: string) => {
    try {
      const requestBody = priceId ? { priceId } : {};
      
      const res = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Failed to start trial/subscribe:', err);
      throw err; // Re-throw so the calling component can handle it
    }
  };

  const upgradeSubscription = async (priceId: string) => {
    try {
      const res = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'change_plan',
          newPriceId: priceId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        // Refresh subscription status
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to upgrade subscription:', err);
      throw err;
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{ 
        isSubscribed, 
        trialActive, 
        loading, 
        startTrialOrSubscribe,
        upgradeSubscription 
      }}
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