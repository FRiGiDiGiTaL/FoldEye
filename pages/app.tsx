// pages/app.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import App from "../App"; // ✅ use your root App.tsx

export default function AppPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const trial = localStorage.getItem("bookfoldar_trial");

    if (trial) {
      const { expiryDate } = JSON.parse(trial);
      if (Date.now() < expiryDate) {
        setAuthorized(true); // ✅ still in trial
        return;
      }
    }

    // ❌ No valid trial → back to landing
    router.replace("/");
  }, [router]);

  if (!authorized) {
    return <p className="text-center text-white mt-20">Checking trial status...</p>;
  }

  return <App />;
}
