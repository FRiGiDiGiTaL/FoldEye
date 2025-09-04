import { useEffect, useState } from "react";

export type SubscriptionStatus = "trialing" | "active" | "canceled" | "free" | "past_due";

interface SubscriptionData {
  status: SubscriptionStatus;
  trialEnds?: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData>({ status: "free" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/subscription/status");
        const data = await res.json();

        if (res.ok) {
          setSubscription({
            status: data.subscription_status as SubscriptionStatus,
            trialEnds: data.trial_end,
          });
        } else {
          console.error("Failed to load subscription:", data.error);
          setSubscription({ status: "free" });
        }
      } catch (err) {
        console.error("Subscription fetch error:", err);
        setSubscription({ status: "free" });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return { subscription, loading };
}
