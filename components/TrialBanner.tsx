import React, { useState, useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription';

export const TrialBanner: React.FC = () => {
  const { subscription, upgradeSubscription } = useSubscription();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Update countdown every minute
  useEffect(() => {
    if (!subscription.isTrialActive || subscription.isActive) return;

    const updateCountdown = () => {
      const now = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + subscription.trialDaysRemaining);
      
      const diff = trialEnd.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setTimeLeft(`${days} day${days !== 1 ? 's' : ''}, ${hours}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours !== 1 ? 's' : ''} left`);
      } else {
        setTimeLeft('Trial ending soon');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [subscription.isTrialActive, subscription.trialDaysRemaining, subscription.isActive]);

  const handleQuickUpgrade = async (plan: 'monthly' | 'yearly') => {
    setIsUpgrading(true);
    try {
      const priceId = plan === 'monthly' 
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;

      if (priceId) {
        await upgradeSubscription(priceId);
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      setIsUpgrading(false);
    }
  };

  // Don't show banner if user has active subscription or trial isn't active
  if (subscription.isActive || !subscription.isTrialActive) {
    return null;
  }

  const getUrgencyColor = () => {
    if (subscription.trialDaysRemaining <= 1) return 'border-red-400/50 glass-status-error';
    if (subscription.trialDaysRemaining <= 3) return 'border-yellow-400/50 glass-status-warning';
    return 'border-blue-400/50 glass-status-success';
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-40 max-w-md w-full mx-4`}>
      <div className={`glass-card rounded-xl p-4 shadow-xl ${getUrgencyColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <span className="text-lg mr-2">
                {subscription.trialDaysRemaining <= 1 ? '⏰' : 
                 subscription.trialDaysRemaining <= 3 ? '⚡' : '✨'}
              </span>
              <span className="font-bold text-white text-sm">
                Free Trial: {timeLeft}
              </span>
            </div>
            <p className="text-xs text-gray-300">
              Enjoying the AR features? Upgrade to keep them!
            </p>
          </div>
          
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => handleQuickUpgrade('yearly')}
              disabled={isUpgrading}
              className="glass-button border-purple-400/50 hover:glass-status-success px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50"
              title="Best value - Save 67%"
            >
              {isUpgrading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              ) : (
                <span className="flex items-center">
                  <span className="mr-1">👑</span>
                  <span className="hidden sm:inline">$19.99/yr</span>
                  <span className="sm:hidden">Year</span>
                </span>
              )}
            </button>
            
            <button
              onClick={() => handleQuickUpgrade('monthly')}
              disabled={isUpgrading}
              className="glass-button border-blue-400/50 hover:glass-status-success px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50"
            >
              {isUpgrading ? (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              ) : (
                <span className="flex items-center">
                  <span className="mr-1">📱</span>
                  <span className="hidden sm:inline">$5.99/mo</span>
                  <span className="sm:hidden">Month</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};