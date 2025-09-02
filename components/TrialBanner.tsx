// components/TrialBanner.tsx - Updated with trialExpired prop
import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';

interface TrialBannerProps {
  trialExpired?: boolean;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ trialExpired = false }) => {
  const subscription = useSubscription();
  const [showModal, setShowModal] = useState(false);

  // Show banner only if user is not subscribed and either trial is not active or has expired
  if (subscription.isSubscribed) {
    return null;
  }

  // Different banner content based on trial status
  const getBannerContent = () => {
    if (subscription.trialActive) {
      return {
        title: "🚀 Trial Active - Enjoying Premium?",
        subtitle: "Your 7-day trial is active. Upgrade anytime to continue!",
        buttonText: "Upgrade Now",
        bgClass: "bg-gradient-to-r from-blue-500 to-purple-600"
      };
    } else if (trialExpired) {
      return {
        title: "⏰ Trial Expired - Upgrade to Continue",
        subtitle: "Your trial has ended. Subscribe to keep using premium features!",
        buttonText: "Subscribe",
        bgClass: "bg-gradient-to-r from-red-500 to-pink-600"
      };
    } else {
      return {
        title: "🚀 Start your 7-day free trial!",
        subtitle: "Unlock all premium AR features today.",
        buttonText: "Get Premium",
        bgClass: "bg-gradient-to-r from-yellow-400 to-yellow-500"
      };
    }
  };

  const bannerContent = getBannerContent();

  return (
    <>
      <div className={`${bannerContent.bgClass} text-white p-4 flex justify-between items-center shadow-lg`}>
        <div>
          <p className="font-bold">{bannerContent.title}</p>
          <p className="text-sm opacity-90">{bannerContent.subtitle}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 shadow-lg border border-white/20"
        >
          {bannerContent.buttonText}
        </button>
      </div>

      <PaywallModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
};