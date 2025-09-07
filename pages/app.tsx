// pages/app.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Head from "next/head";

// Import the main App component from the root (disable SSR)
const MainApp = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-xl">Loading BookfoldAR...</p>
      </div>
    </div>
  ),
});

export default function AppPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Simple check for trial
    const trial = localStorage.getItem("bookfoldar_trial");
    if (trial) {
      try {
        const trialData = JSON.parse(trial);
        if (trialData.expiryDate && Date.now() < trialData.expiryDate) {
          setAuthorized(true);
          return;
        }
      } catch {}
    }

    // No valid trial → redirect to landing page
    router.replace("/");
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Checking trial access...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>BookfoldAR App</title>
      </Head>
      <MainApp />
    </>
  );
}
