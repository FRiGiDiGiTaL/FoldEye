// components/SubscribeButton.tsx
import React from 'react';
import { useSubscription } from '../hooks/useSubscription';

export default function SubscribeButton({ priceId, label }: { priceId: string; label?: string }) {
  const { startTrialOrSubscribe } = useSubscription();
  const handle = async () => {
    await startTrialOrSubscribe(priceId);
  };
  return (
    <button onClick={handle} className="px-4 py-2 rounded bg-yellow-400 text-slate-900 font-semibold">
      {label || 'Subscribe'}
    </button>
  );
}
