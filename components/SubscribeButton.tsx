import React from "react";

export default function SubscribeButton({
  priceId,
  onLoading,
  disabled,
}: {
  priceId: string;
  onLoading?: (state: boolean) => void;
  disabled?: boolean;
}) {
  const handleSubscribe = async () => {
    try {
      onLoading?.(true);

      const res = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data);
      }
    } catch (err) {
      console.error("Subscribe error:", err);
    } finally {
      onLoading?.(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={disabled}
      className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50"
    >
      {disabled ? "Redirecting..." : "Subscribe Now"}
    </button>
  );
}
