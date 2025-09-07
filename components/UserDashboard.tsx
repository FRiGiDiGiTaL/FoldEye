// components/UserDashboard.tsx - Optional account management
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface UserData {
  email?: string;
  status: 'trial' | 'subscribed' | 'expired';
  plan?: string;
  trialDaysRemaining?: number;
  subscriptionExpiry?: string;
}

export const UserDashboard: React.FC = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const loadUserData = () => {
      try {
        // Check subscription
        const subscription = localStorage.getItem("bookfoldar_subscription");
        if (subscription) {
          const subData = JSON.parse(subscription);
          if (subData.active || 
              (subData.status === 'active' && subData.expiryDate > Date.now()) ||
              subData.plan) {
            setUserData({
              status: 'subscribed',
              plan: subData.plan || 'Premium',
              subscriptionExpiry: subData.expiryDate ? new Date(subData.expiryDate).toLocaleDateString() : 'Active'
            });
            return;
          }
        }

        // Check trial
        const trial = localStorage.getItem("bookfoldar_trial");
        if (trial) {
          const trialData = JSON.parse(trial);
          const remaining = Math.ceil((trialData.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
          
          if (remaining > 0) {
            setUserData({
              email: trialData.email,
              status: 'trial',
              trialDaysRemaining: remaining
            });
          } else {
            setUserData({
              email: trialData.email,
              status: 'expired'
            });
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [isClient]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out? You can always return by entering your email again.')) {
      // Don't actually delete trial/subscription data, just redirect
      router.push('/');
    }
  };

  const handleUpgrade = () => {
    router.push('/paywall');
  };

  if (!isClient || !userData) {
    return (
      <div className="glass-card rounded-lg p-6 mb-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg p-6 mb-4 border border-gray-600/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Account Status</h3>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-400 text-sm transition-colors"
        >
          Switch Account
        </button>
      </div>

      {userData.status === 'subscribed' && (
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="text-2xl mr-3">💎</span>
            <div>
              <p className="text-green-400 font-medium">Premium Subscriber</p>
              <p className="text-sm text-gray-300">Plan: {userData.plan}</p>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            Subscription active until: {userData.subscriptionExpiry}
          </div>
          <div className="pt-2 border-t border-gray-600/30">
            <p className="text-xs text-green-300">✅ All features unlocked</p>
            <p className="text-xs text-green-300">✅ Unlimited AR sessions</p>
            <p className="text-xs text-green-300">✅ Premium support</p>
          </div>
        </div>
      )}

      {userData.status === 'trial' && (
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🚀</span>
            <div>
              <p className="text-blue-400 font-medium">Free Trial Active</p>
              {userData.email && (
                <p className="text-sm text-gray-300">{userData.email}</p>
              )}
            </div>
          </div>
          <div className="bg-blue-500/20 rounded p-3 border border-blue-400/30">
            <p className="text-blue-300 font-medium">
              {userData.trialDaysRemaining} days remaining
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Full access to all BookfoldAR features
            </p>
          </div>
          <button
            onClick={handleUpgrade}
            className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Upgrade to Premium
          </button>
        </div>
      )}

      {userData.status === 'expired' && (
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⏰</span>
            <div>
              <p className="text-yellow-400 font-medium">Trial Expired</p>
              {userData.email && (
                <p className="text-sm text-gray-300">{userData.email}</p>
              )}
            </div>
          </div>
          <div className="bg-yellow-500/20 rounded p-3 border border-yellow-400/30">
            <p className="text-yellow-300 text-sm">
              Your free trial has ended. Subscribe to continue using BookfoldAR.
            </p>
          </div>
          <button
            onClick={handleUpgrade}
            className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View Subscription Plans
          </button>
        </div>
      )}
    </div>
  );
};