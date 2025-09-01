// components/PaywallModal.tsx
import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedFeature?: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, blockedFeature }) => {
  const { startTrialOrSubscribe, upgradeSubscription } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');

  if (!isOpen) return null;

  const monthlyId = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;
  const yearlyId = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!;
  const lifetimeId = process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME!;

  const getPriceId = () => (selectedPlan === 'monthly' ? monthlyId : selectedPlan === 'yearly' ? yearlyId : lifetimeId);

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const priceId = getPriceId();
      if (!priceId) throw new Error('Price ID not configured');
      await startTrialOrSubscribe(priceId);
      // redirect will occur; if not, close modal
    } catch (err) {
      console.error('subscribe error', err);
      alert('Failed to start subscription. Check console for details.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Unlock Premium</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">Close</button>
        </div>

        <p className="text-sm text-gray-300 mb-4">
          {blockedFeature ? `You tried to access "${blockedFeature}". ` : ''}
          Get full access for 7 days free — no obligations until trial ends.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div
            className={`p-4 rounded-lg cursor-pointer border ${selectedPlan === 'monthly' ? 'border-blue-400' : 'border-gray-700'}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="font-semibold">Monthly</div>
            <div className="text-2xl font-bold">$5.99</div>
            <div className="text-xs text-gray-400">per month</div>
          </div>

          <div
            className={`p-4 rounded-lg cursor-pointer border ${selectedPlan === 'yearly' ? 'border-purple-400' : 'border-gray-700'}`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <div className="font-semibold">Yearly</div>
            <div className="text-2xl font-bold">$19.99</div>
            <div className="text-xs text-gray-400">per year (best value)</div>
          </div>

          <div
            className={`p-4 rounded-lg cursor-pointer border ${selectedPlan === 'lifetime' ? 'border-yellow-400' : 'border-gray-700'}`}
            onClick={() => setSelectedPlan('lifetime')}
          >
            <div className="font-semibold">Lifetime</div>
            <div className="text-2xl font-bold">$59.99</div>
            <div className="text-xs text-gray-400">one-time</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={handleSubscribe}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-lg font-bold bg-yellow-400 text-slate-900"
          >
            {isProcessing ? 'Redirecting...' : selectedPlan === 'lifetime' ? 'Buy Lifetime' : 'Start Free Trial'}
          </button>

          <button
            onClick={() => { window.location.href = '/pricing'; }}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-700 text-gray-200"
          >
            See Pricing Details
          </button>
        </div>

        <div className="text-xs text-gray-400 mt-3">
          By subscribing you agree to our <a className="underline" href="/privacy">Privacy Policy</a>. You will not be charged until the trial ends.
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
