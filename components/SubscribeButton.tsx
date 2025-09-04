import React, { useState } from "react";

interface SubscribeButtonProps {
  priceId: string;
  onLoading?: (state: boolean) => void;
  disabled?: boolean;
  label?: string; // ✅ new prop
}

export default function SubscribeButton({
  priceId,
  onLoading,
  disabled,
  label = "Subscribe", // ✅ default
}: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      onLoading?.(true);

      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("❌ Subscribe error:", err);
      alert("Error starting subscription. Please try again.");
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl shadow hover:opacity-90 transition disabled:opacity-50"
    >
      {loading ? "Processing..." : label}
    </button>
  );
}
