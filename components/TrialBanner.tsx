import React, { useMemo } from "react";

interface TrialBannerProps {
  trialEnds: string; // ISO date string from Supabase
}

export default function TrialBanner({ trialEnds }: TrialBannerProps) {
  const remainingDays = useMemo(() => {
    const end = new Date(trialEnds).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); // convert ms → days
  }, [trialEnds]);

  if (remainingDays <= 0) return null;

  return (
    <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm px-4 py-2 rounded-lg mb-4 text-center shadow">
      🎉 You’re on a free trial! <strong>{remainingDays} day{remainingDays !== 1 ? "s" : ""}</strong> left.
    </div>
  );
}
