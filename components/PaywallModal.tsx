// components/PaywallModal.tsx
import React, { useState } from 'react';

interface PaywallModalProps {
  onSubscribe: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ onSubscribe }) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');
  const [loading, setLoading] = useState(false);

  const plans = {
    monthly: { price: '$5.99', period: 'per month', savings: '' },
    yearly: { price: '$19.99', period: 'per year', savings: 'Save 17%' },
    lifetime: { price: '$59.99', period: 'one-time', savings: 'Best Value' }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (response.ok) {
        // Store subscription info
        const expiryDate = selectedPlan === 'lifetime' 
          ? Date.now() + (50 * 365 * 24 * 60 * 60 * 1000) // 50 years
          : selectedPlan === 'yearly'
          ? Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
          : Date.now() + (30 * 24 * 60 * 60 * 1000); // 1 month

        localStorage.setItem('bookfoldar_subscription', JSON.stringify({
          plan: selectedPlan,
          status: 'active',
          startDate: Date.now(),
          expiryDate
        }));
        
        onSubscribe();
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-card p-8 rounded-xl max-w-2xl w-full text-white">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">🚀 Continue Your BookfoldAR Journey</h2>
          <p className="text-gray-300">
            Your 7-day trial has ended. Choose a plan to keep using all the amazing AR features!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              onClick={() => setSelectedPlan(key as any)}
              className={`cursor-pointer p-6 rounded-lg border-2 transition-all ${
                selectedPlan === key
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              <h3 className="text-xl font-bold mb-2 capitalize">{key}</h3>
              <div className="text-2xl font-bold text-blue-400">{plan.price}</div>
              <div className="text-gray-400 text-sm">{plan.period}</div>
              {plan.savings && (
                <div className="mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  {plan.savings}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
          >
            {loading ? 'Processing...' : `Subscribe ${plans[selectedPlan].price}`}
          </button>
          
          <div className="mt-4 text-sm text-gray-400">
            ✅ Full AR system access • ✅ All features unlocked • ✅ Lifetime updates
          </div>
        </div>
      </div>
    </div>
  );
};