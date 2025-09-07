// components/TrialGuard.tsx
import React, { useEffect, useState } from 'react';
import { PaywallModal } from './PaywallModal';

interface TrialGuardProps {
  children: React.ReactNode;
}

export const TrialGuard: React.FC<TrialGuardProps> = ({ children }) => {
  const [trialStatus, setTrialStatus] = useState<'loading' | 'active' | 'expired' | 'none'>('loading');
  const [trialData, setTrialData] = useState<any>(null);

  useEffect(() => {
    checkTrialStatus();
  }, []);

  const checkTrialStatus = () => {
    const stored = localStorage.getItem('bookfoldar_trial');
    const subscription = localStorage.getItem('bookfoldar_subscription');
    
    // Check if user has active subscription
    if (subscription) {
      const subData = JSON.parse(subscription);
      if (subData.status === 'active' && subData.expiryDate > Date.now()) {
        setTrialStatus('active');
        return;
      }
    }
    
    // Check trial status
    if (stored) {
      const trial = JSON.parse(stored);
      if (trial.expiryDate > Date.now()) {
        setTrialStatus('active');
        setTrialData(trial);
      } else {
        setTrialStatus('expired');
        setTrialData(trial);
      }
    } else {
      setTrialStatus('none');
    }
  };

  if (trialStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Checking access...</div>
      </div>
    );
  }

  if (trialStatus === 'none') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="glass-card p-8 rounded-xl text-center text-white max-w-md">
          <h2 className="text-2xl font-bold mb-4">Trial Required</h2>
          <p className="text-gray-300 mb-6">
            Please start your free 7-day trial from our homepage to access BookfoldAR.
          </p>
          <a
            href="/"
            className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold inline-block"
          >
            Start Free Trial
          </a>
        </div>
      </div>
    );
  }

  if (trialStatus === 'expired') {
    return <PaywallModal onSubscribe={() => checkTrialStatus()} />;
  }

  return <>{children}</>;
};