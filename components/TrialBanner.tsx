import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';

export const TrialBanner: React.FC = () => {
  const subscription = useSubscription();
  const [showModal, setShowModal] = React.useState(false);

  // Show banner only if user is not subscribed and trial not active
  if (subscription.isSubscribed || subscription.trialActive) {
    return null;
  }

  return (
    <>
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 flex justify-between items-center">
        <div>
          <p className="font-bold">Start your 7-day free trial!</p>
          <p className="text-sm">Unlock all premium features today.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
        >
          Subscribe
        </button>
      </div>

      {showModal && <PaywallModal />}
    </>
  );
};
