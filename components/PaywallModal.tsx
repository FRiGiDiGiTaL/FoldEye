import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';

interface PaywallModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  blockedFeature?: string;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ 
  isOpen = true, 
  onClose, 
  blockedFeature 
}) => {
  const { startTrialOrSubscribe } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');

  if (!isOpen) return null;

  // Fallback price IDs if env vars are not available
  const monthlyId = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || 'price_monthly_fallback';
  const yearlyId = process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY || 'price_yearly_fallback';
  const lifetimeId = process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME || 'price_lifetime_fallback';

  const getPriceId = () => {
    switch (selectedPlan) {
      case 'monthly': return monthlyId;
      case 'yearly': return yearlyId;
      case 'lifetime': return lifetimeId;
      default: return yearlyId;
    }
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const priceId = getPriceId();
      console.log('Starting subscription with price ID:', priceId);
      await startTrialOrSubscribe(priceId);
      // If successful, close modal
      if (onClose) onClose();
    } catch (err) {
      console.error('Subscribe error:', err);
      alert('Failed to start subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={handleClose} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700/50">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white">✨ Unlock Premium Features</h3>
            <p className="text-gray-400 text-sm mt-1">Enhanced AR experience awaits</p>
          </div>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feature Description */}
        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            {blockedFeature ? (
              <>You tried to access <span className="text-blue-400 font-semibold">"{blockedFeature}"</span>. </>
            ) : ''}
            Get full access to all premium features with a 7-day free trial — no obligations until trial ends.
          </p>
          
          {/* Premium Features List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="flex items-center text-sm text-gray-300">
              <span className="text-green-400 mr-2">✓</span>
              Advanced AR Effects & Particles
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <span className="text-green-400 mr-2">✓</span>
              Voice Control Navigation
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <span className="text-green-400 mr-2">✓</span>
              PDF Import & Processing
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <span className="text-green-400 mr-2">✓</span>
              Advanced Grid Systems
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <span className="text-green-400 mr-2">✓</span>
              Glassmorphism UI Effects
            </div>
            <div className="flex items-center text-sm text-gray-300">
              <span className="text-green-400 mr-2">✓</span>
              PWA Installation & Shortcuts
            </div>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-300 ${
              selectedPlan === 'monthly' 
                ? 'border-blue-400 bg-blue-400/10 shadow-lg shadow-blue-400/20' 
                : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
            }`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="text-white font-semibold mb-1">Monthly</div>
            <div className="text-2xl font-bold text-white">$5.99</div>
            <div className="text-xs text-gray-400">per month</div>
          </div>

          <div
            className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-300 relative ${
              selectedPlan === 'yearly' 
                ? 'border-purple-400 bg-purple-400/10 shadow-lg shadow-purple-400/20' 
                : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
            }`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full">
                Best Value
              </span>
            </div>
            <div className="text-white font-semibold mb-1">Yearly</div>
            <div className="text-2xl font-bold text-white">$19.99</div>
            <div className="text-xs text-gray-400">per year (67% off)</div>
          </div>

          <div
            className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-300 ${
              selectedPlan === 'lifetime' 
                ? 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20' 
                : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
            }`}
            onClick={() => setSelectedPlan('lifetime')}
          >
            <div className="text-white font-semibold mb-1">Lifetime</div>
            <div className="text-2xl font-bold text-white">$59.99</div>
            <div className="text-xs text-gray-400">one-time payment</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={handleSubscribe}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              selectedPlan === 'lifetime' ? 'Buy Lifetime Access' : 'Start 7-Day Free Trial'
            )}
          </button>

          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 transition-all duration-300"
          >
            Maybe Later
          </button>
        </div>

        {/* Fine Print */}
        <div className="text-xs text-gray-400 mt-4 text-center">
          7-day free trial • Cancel anytime • No charges until trial ends
          <br />
          By subscribing you agree to our <a className="underline hover:text-gray-300" href="/privacy">Privacy Policy</a> and <a className="underline hover:text-gray-300" href="/terms">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;