// pages/app.tsx
import React, { useEffect, useState } from 'react';
import { TrialGuard } from '../components/TrialGuard';
import { PWAInstaller } from '../components/PWAInstaller';
import App from '../src/app';

export default function BookfoldARApp() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading BookfoldAR...</div>
      </div>
    );
  }

  return (
    <TrialGuard>
      <PWAInstaller />
      <App />
    </TrialGuard>
  );
}