// pages/app.tsx - Protected app page
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// Dynamically import the MainApp to prevent SSR issues
const MainApp = dynamic(() => import('../MainApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-xl">Loading BookfoldAR...</p>
      </div>
    </div>
  )
});

export default function AppPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const email = localStorage.getItem('userEmail');
    
    if (!email) {
      // No email stored, redirect to landing
      router.push('/');
      return;
    }

    setUserEmail(email);

    try {
      const response = await fetch('/api/check-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const { hasAccess: access } = await response.json();
      
      if (access) {
        setHasAccess(true);
      } else {
        // No access, redirect to payment
        router.push('/');
      }
    } catch (error) {
      console.error('Error checking access:', error);
      // On error, redirect to landing page
      router.push('/');
    }
  };

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl">Verifying access...</p>
          <p className="text-sm text-gray-400 mt-2">Checking account: {userEmail}</p>
        </div>
      </div>
    );
  }

  // Show access denied (shouldn't normally reach here due to redirect)
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-4">Access Required</h1>
          <p className="text-gray-300 mb-6">
            You need to purchase BookfoldAR to access this app.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Go to Payment
          </button>
        </div>
      </div>
    );
  }

  // User has access, show the main app
  return <MainApp />;
}